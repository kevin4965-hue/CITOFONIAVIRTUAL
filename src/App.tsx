/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { ApiError, api, setUnauthorizedHandler, type SessionUser } from './api/client';
import { useCitofonia } from './api/useCitofonia';
import { IMAGES } from './assets/images';
import { AccessLogTable } from './components/AccessLogTable';
import { ComparativeAnalysis } from './components/ComparativeAnalysis';
import { Login } from './components/Login';
import { Navbar, type NavTab } from './components/Navbar';
import { NoticesAdmin } from './components/NoticesAdmin';
import { ParcelsManagement } from './components/ParcelsManagement';
import { ParkingManagement } from './components/ParkingManagement';
import { PorteriaConsole } from './components/PorteriaConsole';
import { ResidentSmartphone } from './components/ResidentSmartphone';
import type { ApartmentUnit } from './types/intercom';
import { soundFx } from './utils/audio';

const ROLE_LABEL: Record<SessionUser['role'], string> = {
  admin: 'Administración',
  guard: 'Portería',
  resident: 'Residente',
};

const GUARD_TABS: NavTab[] = [
  { id: 'porteria', label: 'Consola de Portería', shortLabel: 'Portería' },
  { id: 'bitacora', label: 'Bitácora Digital de Accesos', shortLabel: 'Bitácora' },
  { id: 'paquetes', label: 'Paquetería', shortLabel: 'Paquetería' },
  { id: 'parqueaderos', label: 'Parqueaderos', shortLabel: 'Parqueaderos' },
];

const ADMIN_TABS: NavTab[] = [
  ...GUARD_TABS,
  { id: 'avisos', label: 'Avisos', shortLabel: 'Avisos' },
  { id: 'comparativa', label: 'Tradicional vs. Virtual & ROI', shortLabel: 'ROI' },
];

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Si el servidor responde 401 en cualquier momento (sesión vencida o revocada), se vuelve al login.
    setUnauthorizedHandler(() => setUser(null));
    api
      .get<{ user: SessionUser }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Cargando...</div>;
  }
  if (!user) return <Login onLoggedIn={setUser} />;

  return (
    <Authenticated
      key={user.id}
      user={user}
      onLogout={async () => {
        soundFx.stopRingtone();
        try {
          await api.post('/auth/logout');
        } catch (e) {
          if (!(e instanceof ApiError)) throw e;
        }
        setUser(null);
      }}
    />
  );
}

function Authenticated({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const isResident = user.role === 'resident';
  const tabs = useMemo(() => (user.role === 'admin' ? ADMIN_TABS : isResident ? [] : GUARD_TABS), [user.role, isResident]);

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? 'telefono');
  const [isMuted, setIsMuted] = useState(false);
  const [pickedUnitId, setPickedUnitId] = useState<string | null>(null);

  const data = useCitofonia(user);
  const { activeCall, units, doorOpen, alerts, loaded } = data;

  const selectedUnit: ApartmentUnit | null = units.find((u) => u.id === pickedUnitId) ?? units[0] ?? null;

  // El timbre suena sólo en el celular del residente mientras haya una llamada entrante.
  const ringingId = isResident ? (activeCall?.id ?? null) : null;
  useEffect(() => {
    if (ringingId) soundFx.startRingtone();
    else soundFx.stopRingtone();
    return () => soundFx.stopRingtone();
  }, [ringingId]);

  // Portería: zumbido cuando la puerta se abre.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!isResident && doorOpen && !wasOpen.current) soundFx.playDoorBuzzer();
    wasOpen.current = doorOpen;
  }, [doorOpen, isResident]);

  // Portería: sonido y aviso cuando llega una alerta SOS nueva.
  const knownAlerts = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (isResident || !loaded) return;
    const active = new Set(alerts.filter((a) => a.status === 'activa').map((a) => a.id));
    if (knownAlerts.current) {
      const fresh = alerts.find((a) => active.has(a.id) && !knownAlerts.current!.has(a.id));
      if (fresh) {
        soundFx.playKeypadBeep(900);
        data.showToast(`¡Alerta SOS desde ${fresh.tower} - #${fresh.unitNumber}!`);
      }
    }
    knownAlerts.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, loaded, isResident]);

  const towers = useMemo(() => [...new Set(units.map((u) => u.tower))], [units]);

  const renderBody = () => {
    if (!loaded) return <p className="text-sm text-slate-500">Cargando datos...</p>;

    if (isResident) {
      if (!selectedUnit) {
        return <p className="text-sm text-slate-500">Tu usuario no tiene una unidad asignada. Contacta a la administración.</p>;
      }
      return (
        <div className="flex justify-center">
          <ResidentSmartphone
            activeCall={activeCall}
            residentUnit={selectedUnit}
            parcels={data.parcels}
            qrPasses={data.passes}
            notices={data.notices}
            onAuthorizeCall={() => activeCall && void data.authorize(activeCall.id)}
            onRejectCall={() => activeCall && void data.reject(activeCall.id)}
            onSendQuickReply={(msg) => activeCall && void data.quickReply(activeCall.id, msg)}
            onCreateQRPass={(p) => void data.createPass(p)}
            onTriggerEmergencyAlarm={() => void data.sendSos()}
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'bitacora':
        return <AccessLogTable logs={data.calls} />;
      case 'paquetes':
        return (
          <ParcelsManagement
            parcels={data.parcels}
            apartments={units}
            onAddParcel={(d) => data.addParcel({ ...d })}
            onDeliverParcel={data.deliverParcel}
          />
        );
      case 'parqueaderos':
        return (
          <ParkingManagement
            slots={data.parking}
            apartments={units}
            onOccupySlot={(id, d) => void data.occupySlot(id, d)}
            onFreeSlot={(id) => void data.freeSlot(id)}
          />
        );
      case 'avisos':
        return <NoticesAdmin notices={data.notices} towers={towers} onPublish={data.publishNotice} />;
      case 'comparativa':
        return <ComparativeAnalysis />;
      default:
        if (!selectedUnit) {
          return <p className="text-sm text-slate-500">No hay unidades registradas en este conjunto.</p>;
        }
        return (
          <PorteriaConsole
            operatorName={user.name}
            complexName={user.complexName}
            apartments={units}
            selectedUnit={selectedUnit}
            setSelectedUnit={(u) => setPickedUnitId(u.id)}
            activeCall={activeCall}
            onInitiateCall={(d) => void data.initiateCall({ ...d, snapshot: d.snapshot || IMAGES.guestIntercom })}
            onHangupCall={() => activeCall && void data.hangup(activeCall.id)}
            onEmergencyUnlock={() => void data.emergencyUnlock(selectedUnit.id)}
            gateUnlocked={doorOpen}
            alerts={alerts}
            onResolveAlert={(id, notes) => void data.resolveAlert(id, notes)}
            onDispatchGuard={(id) => void data.dispatchAlert(id)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Navbar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        hasActiveCall={activeCall !== null}
        userName={user.name}
        roleLabel={ROLE_LABEL[user.role]}
        online={data.online}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {data.toast && (
          <div
            role="status"
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-medium animate-fade-in"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{data.toast}</span>
          </div>
        )}
        {renderBody()}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Citofonía Virtual Cloud</span>
            <span>·</span>
            <span>Sistema Inteligente de Acceso Residencial</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
