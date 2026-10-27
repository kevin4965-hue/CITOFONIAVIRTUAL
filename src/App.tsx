/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PorteriaConsole } from './components/PorteriaConsole';
import { ResidentSmartphone } from './components/ResidentSmartphone';
import { AccessLogTable } from './components/AccessLogTable';
import { ParcelsManagement } from './components/ParcelsManagement';
import { ParkingManagement } from './components/ParkingManagement';
import { ComparativeAnalysis } from './components/ComparativeAnalysis';

import {
  ApartmentUnit,
  VisitorCall,
  Parcel,
  ParkingSlot,
  BroadcastNotice,
  AccessPassQR,
  VisitorType,
  DistressAlert,
  DistressType,
} from './types/intercom';

import {
  INITIAL_APARTMENTS,
  INITIAL_CALL_HISTORY,
  INITIAL_PARCELS,
  INITIAL_PARKING_SLOTS,
  INITIAL_NOTICES,
  INITIAL_QR_PASSES,
  INITIAL_DISTRESS_ALERTS,
  IMAGES,
} from './data/mockData';

import { soundFx } from './utils/audio';
import {
  PhoneCall,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('simulador');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Application Data States
  const [apartments, setApartments] = useState<ApartmentUnit[]>(INITIAL_APARTMENTS);
  const [selectedUnit, setSelectedUnit] = useState<ApartmentUnit>(INITIAL_APARTMENTS[2]); // Torre 1 - 302
  const [residentActiveUnit, setResidentActiveUnit] = useState<ApartmentUnit>(INITIAL_APARTMENTS[2]); // Phone mockup shows 302
  const [activeCall, setActiveCall] = useState<VisitorCall | null>(null);
  const [callHistory, setCallHistory] = useState<VisitorCall[]>(INITIAL_CALL_HISTORY);
  const [parcels, setParcels] = useState<Parcel[]>(INITIAL_PARCELS);
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>(INITIAL_PARKING_SLOTS);
  const [notices, setNotices] = useState<BroadcastNotice[]>(INITIAL_NOTICES);
  const [qrPasses, setQrPasses] = useState<AccessPassQR[]>(INITIAL_QR_PASSES);
  const [alerts, setAlerts] = useState<DistressAlert[]>(INITIAL_DISTRESS_ALERTS);
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Clean toast timer
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Trigger call from guard console
  const handleInitiateCall = (callData: {
    unit: ApartmentUnit;
    visitorType: VisitorType;
    visitorName: string;
    company: string;
    snapshot: string;
    notes: string;
  }) => {
    // If the phone is on another apartment, automatically switch the resident simulator to that apartment
    setResidentActiveUnit(callData.unit);

    const now = new Date();
    const daysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = daysSpanish[now.getDay()];
    const currentHour = now.getHours();

    const newCall: VisitorCall = {
      id: 'call-' + Date.now().toString().slice(-4),
      unitId: callData.unit.id,
      tower: callData.unit.tower,
      unitNumber: callData.unit.unitNumber,
      residentName: callData.unit.residentName,
      visitorType: callData.visitorType,
      visitorName: callData.visitorName,
      company: callData.company,
      cameraSnapshot: callData.snapshot,
      timestamp: 'Hoy, ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'ringing',
      durationSeconds: 0,
      notes: callData.notes,
      dayOfWeek: currentDayName,
      hour: currentHour,
    };

    setActiveCall(newCall);
    soundFx.startRingtone();
    showToast(`Timbrando en el celular de ${callData.unit.residentName}...`);
  };

  // Hang up / cancel from guard
  const handleHangupCall = () => {
    soundFx.stopRingtone();
    if (activeCall) {
      const updatedCall: VisitorCall = {
        ...activeCall,
        status: 'missed',
        durationSeconds: 12,
        authorizedBy: 'Llamada finalizada por guardia',
      };
      setCallHistory([updatedCall, ...callHistory]);
    }
    setActiveCall(null);
    showToast('Llamada finalizada.');
  };

  // Authorize entrance from resident smartphone
  const handleAuthorizeCall = () => {
    soundFx.stopRingtone();
    soundFx.playDoorBuzzer();

    setGateUnlocked(true);
    setTimeout(() => {
      setGateUnlocked(false);
    }, 5500);

    if (activeCall) {
      const authorizedCall: VisitorCall = {
        ...activeCall,
        status: 'authorized',
        durationSeconds: 22,
        authorizedBy: 'Residente desde Celular (Apertura Remota)',
        timestamp: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setCallHistory([authorizedCall, ...callHistory]);
    }


    setActiveCall(null);
    showToast('¡Acceso autorizado! Puerta peatonal abierta por 5 segundos.');
  };

  // Reject entrance from resident smartphone
  const handleRejectCall = () => {
    soundFx.stopRingtone();

    if (activeCall) {
      const rejectedCall: VisitorCall = {
        ...activeCall,
        status: 'rejected',
        durationSeconds: 14,
        authorizedBy: 'Rechazado por el residente',
        timestamp: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setCallHistory([rejectedCall, ...callHistory]);
    }

    setActiveCall(null);
    showToast('Ingreso rechazado por el residente.');
  };

  // Guard manual emergency opening
  const handleEmergencyUnlock = () => {
    soundFx.playDoorBuzzer();
    setGateUnlocked(true);
    setTimeout(() => {
      setGateUnlocked(false);
    }, 5000);

    const manualLog: VisitorCall = {
      id: 'call-' + Date.now().toString().slice(-4),
      unitId: selectedUnit.id,
      tower: selectedUnit.tower,
      unitNumber: selectedUnit.unitNumber,
      residentName: selectedUnit.residentName,
      visitorType: 'otro',
      visitorName: 'Apertura Manual de Guardia',
      company: 'Seguridad Privada',
      cameraSnapshot: IMAGES.guestIntercom,
      timestamp: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'authorized',
      durationSeconds: 5,
      authorizedBy: 'Vigilante en Portería (Manual)',
      notes: 'Apertura de contingencia / supervisión',
    };

    setCallHistory([manualLog, ...callHistory]);
    showToast('Apertura de portería ejecutada y registrada en bitácora.');
  };

  // Add new parcel
  const handleAddParcel = (newParcel: Parcel) => {
    setParcels([newParcel, ...parcels]);
    showToast(`Paquete registrado para ${newParcel.tower} - #${newParcel.unitNumber}. Notificación enviada.`);
  };

  // Deliver parcel
  const handleDeliverParcel = (parcelId: string, pinEntered: string): boolean => {
    const target = parcels.find((p) => p.id === parcelId);
    if (!target) return false;

    if (target.pickupPin === pinEntered) {
      setParcels(
        parcels.map((p) =>
          p.id === parcelId
            ? {
                ...p,
                status: 'entregado',
                pickupTime:
                  'Hoy, ' +
                  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            : p
        )
      );
      showToast('¡Paquete entregado con éxito!');
      return true;
    }
    return false;
  };

  // Parking slot actions
  const handleOccupySlot = (
    slotId: string,
    data: { vehiclePlate: string; unitVisiting: string; driverName: string }
  ) => {
    setParkingSlots(
      parkingSlots.map((s) =>
        s.id === slotId
          ? {
              ...s,
              isOccupied: true,
              vehiclePlate: data.vehiclePlate,
              unitVisiting: data.unitVisiting,
              driverName: data.driverName,
              enteredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : s
      )
    );
    showToast(`Vehículo ${data.vehiclePlate} asignado al cupo.`);
  };

  const handleFreeSlot = (slotId: string) => {
    setParkingSlots(
      parkingSlots.map((s) =>
        s.id === slotId
          ? {
              ...s,
              isOccupied: false,
              vehiclePlate: undefined,
              unitVisiting: undefined,
              driverName: undefined,
              enteredAt: undefined,
            }
          : s
      )
    );
    showToast('Cupo de parqueadero liberado.');
  };

  // Create QR pass
  const handleCreateQRPass = (data: { guestName: string; notes: string; hoursValid: number }) => {
    const newPass: AccessPassQR = {
      id: 'qr-' + Date.now(),
      guestName: data.guestName,
      unitNumber: residentActiveUnit.unitNumber,
      tower: residentActiveUnit.tower,
      validUntil: 'Válido por 4 horas',
      qrCode: `CITOFONIA-${residentActiveUnit.tower.replace(' ', '')}-${residentActiveUnit.unitNumber}-${Math.floor(
        10000 + Math.random() * 90000
      )}`,
      usesRemaining: 1,
      notes: data.notes,
    };
    setQrPasses([newPass, ...qrPasses]);
    soundFx.playChime();
    showToast(`Pase QR generado para ${data.guestName}.`);
  };

  // Distress and Security Alert Handlers
  const handleResolveAlert = (alertId: string, notes?: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resuelta',
              respondedBy: 'Guardia de Portería (Novedad Verificada)',
              notes: notes || a.notes,
            }
          : a
      )
    );
    showToast('Alerta de seguridad resuelta y archivada en bitácora.');
  };

  const handleDispatchGuard = (alertId: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'en_atencion',
              respondedBy: 'Ronda de vigilancia motorizada/a pie despachada',
            }
          : a
      )
    );
    soundFx.playChime();
    showToast('Ronda de vigilancia presencial despachada al apartamento.');
  };

  const handleTriggerTestDistress = (type: DistressType = 'panico') => {
    const newAlert: DistressAlert = {
      id: 'alert-' + Date.now().toString().slice(-4),
      unitId: selectedUnit.id,
      tower: selectedUnit.tower,
      unitNumber: selectedUnit.unitNumber,
      residentName: selectedUnit.residentName,
      emergencyPhone: selectedUnit.realPhone,
      type,
      timestamp: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'activa',
      notes: 'Alerta de pánico activada desde el botón SOS del residente',
    };
    setAlerts([newAlert, ...alerts]);
    soundFx.playKeypadBeep(900);
    showToast(`¡Alerta SOS de emergencia en portería desde ${selectedUnit.tower} - #${selectedUnit.unitNumber}!`);
  };

  // Trigger quick test scenarios
  const triggerQuickScenario = (scenario: 'rappi' | 'visita') => {
    if (scenario === 'rappi') {
      const apt302 = apartments.find((a) => a.unitNumber === '302') || apartments[0];

      setSelectedUnit(apt302);
      handleInitiateCall({
        unit: apt302,
        visitorType: 'domiciliario',
        visitorName: 'Repartidor Rappi (#8491)',
        company: 'Rappi Colombia',
        snapshot: IMAGES.courierIntercom,
        notes: 'Pedido de comida rápida en portería',
      });
    } else {
      const apt402 = apartments.find((a) => a.unitNumber === '402') || apartments[0];
      setSelectedUnit(apt402);
      handleInitiateCall({
        unit: apt402,
        visitorType: 'invitado',
        visitorName: 'Laura María Restrepo',
        company: 'Visita familiar',
        snapshot: IMAGES.guestIntercom,
        notes: 'Almuerzo familiar domingo',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        hasActiveCall={activeCall !== null}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-medium animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* --- VIEW 1: SIMULADOR DUAL INTERACTIVO --- */}
        {activeTab === 'simulador' && (
          <div className="space-y-6">
            {/* Explanatory 4-Step Flow Banner */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Simulación en Tiempo Real
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">
                      Experimenta ambos lados del sistema
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                    ¿Cómo funciona la Citofonía Virtual?
                  </h1>
                </div>

                {/* Quick Scenario Triggers */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    Simulación Rápida:
                  </span>
                  <button
                    onClick={() => triggerQuickScenario('rappi')}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    🚲 Simular Domicilio Rappi a 302
                  </button>
                  <button
                    onClick={() => triggerQuickScenario('visita')}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    👋 Simular Invitado a 402
                  </button>
                </div>
              </div>

              {/* 4 Steps Visual Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono">
                      1
                    </span>
                    <span>Llegada del visitante</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    El visitante o domiciliario llega a la portería o tótem inteligente exterior.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono">
                      2
                    </span>
                    <span>Contacto digital</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    El vigilante digita la torre y apartamento en la tableta o computador.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono">
                      3
                    </span>
                    <span>Recepción en celular</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    El sistema timbra en el celular con enmascaramiento total de datos personales.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono">
                      4
                    </span>
                    <span>Gestión remota</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    El residente contesta donde esté y autoriza la apertura con chicharra electrónica.
                  </p>
                </div>
              </div>
            </div>

            {/* Split Screen Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Side: Portería Console (7 cols) */}
              <div className="lg:col-span-7">
                <PorteriaConsole
                  apartments={apartments}
                  selectedUnit={selectedUnit}
                  setSelectedUnit={(unit) => {
                    setSelectedUnit(unit);
                    setResidentActiveUnit(unit);
                  }}
                  activeCall={activeCall}
                  onInitiateCall={handleInitiateCall}
                  onHangupCall={handleHangupCall}
                  onEmergencyUnlock={handleEmergencyUnlock}
                  gateUnlocked={gateUnlocked}
                  alerts={alerts}
                  onResolveAlert={handleResolveAlert}
                  onDispatchGuard={handleDispatchGuard}
                  onTriggerTestDistress={handleTriggerTestDistress}
                />
              </div>

              {/* Right Side: Smartphone of the Resident (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                {/* Simulator Switcher for Resident Phone */}
                <div className="w-full max-w-[350px] mb-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>Celular del Residente:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">En tiempo real</span>
                  </div>
                  <select
                    value={residentActiveUnit.id}
                    onChange={(e) => {
                      const u = apartments.find((a) => a.id === e.target.value);
                      if (u) {
                        setResidentActiveUnit(u);
                        setSelectedUnit(u);
                        soundFx.playKeypadBeep(600);
                      }
                    }}
                    className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tower} - Apto {a.unitNumber} ({a.residentName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Smartphone Emulator Frame */}
                <ResidentSmartphone
                  activeCall={activeCall}
                  residentUnit={residentActiveUnit}
                  parcels={parcels}
                  qrPasses={qrPasses}
                  notices={notices}
                  onAuthorizeCall={handleAuthorizeCall}
                  onRejectCall={handleRejectCall}
                  onSendQuickReply={(msg) => {
                    showToast(`Mensaje enviado a portería: "${msg}"`);
                    handleHangupCall();
                  }}
                  onCreateQRPass={handleCreateQRPass}
                  onTriggerEmergencyAlarm={() => {
                    const newAlert: DistressAlert = {
                      id: 'alert-' + Date.now().toString().slice(-4),
                      unitId: residentActiveUnit.id,
                      tower: residentActiveUnit.tower,
                      unitNumber: residentActiveUnit.unitNumber,
                      residentName: residentActiveUnit.residentName,
                      emergencyPhone: residentActiveUnit.realPhone,
                      type: 'panico',
                      timestamp:
                        'Hoy, ' +
                        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      status: 'activa',
                      notes: 'Botón de pánico SOS pulsado en el smartphone del residente',
                    };
                    setAlerts([newAlert, ...alerts]);
                    soundFx.playKeypadBeep(900);
                    showToast(
                      `¡Alerta SOS de emergencia en portería desde ${residentActiveUnit.tower} - #${residentActiveUnit.unitNumber}!`
                    );
                  }}
                />
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW 2: BITÁCORA DIGITAL DE ACCESOS --- */}
        {activeTab === 'bitacora' && <AccessLogTable logs={callHistory} />}

        {/* --- VIEW 3: PAQUETERÍA Y ENCOMIENDAS --- */}
        {activeTab === 'paquetes' && (
          <ParcelsManagement
            parcels={parcels}
            apartments={apartments}
            onAddParcel={handleAddParcel}
            onDeliverParcel={handleDeliverParcel}
          />
        )}

        {/* --- VIEW 4: GESTIÓN DE PARQUEADEROS --- */}
        {activeTab === 'parqueaderos' && (
          <ParkingManagement
            slots={parkingSlots}
            apartments={apartments}
            onOccupySlot={handleOccupySlot}
            onFreeSlot={handleFreeSlot}
          />
        )}

        {/* --- VIEW 5: COMPARATIVA TRADICIONAL VS VIRTUAL & ROI --- */}
        {activeTab === 'comparativa' && <ComparativeAnalysis />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Citofonía Virtual Cloud</span>
            <span>·</span>
            <span>Sistema Inteligente de Acceso Residencial</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Cumplimiento Ley 1581 Habeas Data</span>
            <span>·</span>
            <span>Cifrado de Comunicaciones</span>
            <span>·</span>
            <span>Redundancia PSTN / Celular GSM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
