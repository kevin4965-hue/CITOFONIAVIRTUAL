import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AccessPassQR,
  ApartmentUnit,
  BroadcastNotice,
  DistressAlert,
  Parcel,
  ParkingSlot,
  VisitorCall,
  VisitorType,
} from '../types/intercom';
import {
  toAlert,
  toNotice,
  toParcel,
  toPass,
  toSlot,
  toVisitorCall,
  type ApiAlert,
  type ApiCall,
  type ApiNotice,
  type ApiParcel,
  type ApiPass,
  type ApiSlot,
} from './adapters';
import { ApiError, api, type SessionUser } from './client';

type Resource = 'units' | 'calls' | 'parcels' | 'parking' | 'notices' | 'alerts' | 'qr';

const STAFF_RESOURCES: Resource[] = ['units', 'calls', 'parcels', 'parking', 'notices', 'alerts'];
const RESIDENT_RESOURCES: Resource[] = ['units', 'calls', 'parcels', 'notices', 'alerts', 'qr'];

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado');

/**
 * Estado de la aplicación respaldado por el servidor.
 * La fuente de verdad es la API; el WebSocket sólo avisa "algo cambió" y el cliente vuelve a consultar.
 */
export function useCitofonia(user: SessionUser) {
  const staff = user.role !== 'resident';
  const resources = staff ? STAFF_RESOURCES : RESIDENT_RESOURCES;

  const [units, setUnits] = useState<ApartmentUnit[]>([]);
  const [calls, setCalls] = useState<VisitorCall[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [parking, setParking] = useState<ParkingSlot[]>([]);
  const [notices, setNotices] = useState<BroadcastNotice[]>([]);
  const [alerts, setAlerts] = useState<DistressAlert[]>([]);
  const [passes, setPasses] = useState<AccessPassQR[]>([]);
  const [doorOpen, setDoorOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ---------- Toast (con limpieza del temporizador) ----------
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ---------- Carga de datos ----------
  const loaders = useMemo<Record<Resource, () => Promise<void>>>(
    () => ({
      units: async () => setUnits(await api.get<ApartmentUnit[]>('/units')),
      calls: async () => setCalls((await api.get<ApiCall[]>('/calls')).map(toVisitorCall)),
      parcels: async () => setParcels((await api.get<ApiParcel[]>('/parcels')).map(toParcel)),
      parking: async () => setParking((await api.get<ApiSlot[]>('/parking')).map(toSlot)),
      notices: async () => setNotices((await api.get<ApiNotice[]>('/notices')).map(toNotice)),
      alerts: async () => setAlerts((await api.get<ApiAlert[]>('/alerts')).map(toAlert)),
      qr: async () => setPasses((await api.get<ApiPass[]>('/qr')).map(toPass)),
    }),
    []
  );

  const resourcesKey = resources.join(',');
  const refreshAll = useCallback(async () => {
    await Promise.allSettled(resourcesKey.split(',').map((r) => loaders[r as Resource]()));
    setLoaded(true);
  }, [loaders, resourcesKey]);

  // Coalesce ráfagas de eventos del mismo recurso.
  const pending = useRef(new Map<Resource, ReturnType<typeof setTimeout>>());
  const refresh = useCallback(
    (r: Resource) => {
      if (!resourcesKey.split(',').includes(r) || pending.current.has(r)) return;
      pending.current.set(
        r,
        setTimeout(() => {
          pending.current.delete(r);
          loaders[r]().catch(() => undefined);
        }, 40)
      );
    },
    [loaders, resourcesKey]
  );

  // ---------- WebSocket con reconexión ----------
  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let doorTimer: ReturnType<typeof setTimeout> | undefined;
    const pendingTimers = pending.current;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        retry = 0;
        setOnline(true);
        void refreshAll(); // resincroniza lo perdido mientras estuvo desconectado
      };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(String(e.data)) as {
            type: string;
            resource?: Resource;
            open?: boolean;
            until?: number;
          };
          if (m.type === 'changed' && m.resource) refresh(m.resource);
          else if (m.type === 'ring') refresh('calls');
          else if (m.type === 'door') {
            setDoorOpen(!!m.open);
            clearTimeout(doorTimer);
            if (m.open && m.until) doorTimer = setTimeout(() => setDoorOpen(false), Math.max(0, m.until - Date.now()) + 300);
          }
        } catch {
          /* mensaje inválido: se ignora */
        }
      };
      ws.onclose = () => {
        setOnline(false);
        if (!closed) retryTimer = setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++));
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      clearTimeout(doorTimer);
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
      ws?.close();
    };
  }, [refresh, refreshAll]);

  // Carga inicial (el WebSocket vuelve a sincronizar al conectarse).
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Si el WebSocket está caído, se sondea cada 15 s como respaldo.
  useEffect(() => {
    if (online) return;
    const t = setInterval(() => void refreshAll(), 15_000);
    return () => clearInterval(t);
  }, [online, refreshAll]);

  // ---------- Llamada activa ----------
  const activeCall = useMemo<VisitorCall | null>(() => {
    const ringing = calls.filter((c) => c.status === 'ringing');
    if (staff) {
      // El vigilante ve sólo la llamada que él mismo inició (la más reciente).
      return ringing.find((c) => c.createdBy === user.id) ?? null;
    }
    return ringing[0] ?? null;
  }, [calls, staff, user.id]);

  // Notifica el desenlace de la llamada cuando deja de estar activa.
  const prevCallId = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevCallId.current;
    prevCallId.current = activeCall?.id ?? null;
    if (!prev || prev === activeCall?.id) return;
    const final = calls.find((c) => c.id === prev);
    if (!final) return;
    if (final.status === 'authorized') showToast('Acceso autorizado. Puerta abierta.');
    else if (final.status === 'rejected') showToast('Ingreso rechazado por el residente.');
    else if (final.status === 'missed') showToast('Llamada finalizada sin respuesta.');
  }, [activeCall, calls, showToast]);

  // ---------- Acciones ----------
  const attempt = useCallback(
    async (fn: () => Promise<unknown>, okMsg?: string): Promise<boolean> => {
      try {
        await fn();
        if (okMsg) showToast(okMsg);
        return true;
      } catch (e) {
        showToast(errMsg(e));
        return false;
      }
    },
    [showToast]
  );

  const actions = useMemo(
    () => ({
      initiateCall: (d: {
        unit: ApartmentUnit;
        visitorType: VisitorType;
        visitorName: string;
        company: string;
        snapshot: string;
        notes: string;
      }) =>
        attempt(async () => {
          await api.post('/calls', {
            unitId: d.unit.id,
            visitorType: d.visitorType,
            visitorName: d.visitorName,
            company: d.company,
            snapshot: d.snapshot,
            notes: d.notes,
          });
          await loaders.calls();
        }, `Timbrando en el celular de ${d.unit.residentName}...`),

      hangup: (id: string) => attempt(async () => { await api.post(`/calls/${id}/hangup`); await loaders.calls(); }),
      authorize: (id: string) => attempt(async () => { await api.post(`/calls/${id}/authorize`); await loaders.calls(); }),
      reject: (id: string) => attempt(async () => { await api.post(`/calls/${id}/reject`); await loaders.calls(); }),
      quickReply: (id: string, message: string) =>
        attempt(async () => {
          await api.post(`/calls/${id}/reply`, { message });
          await loaders.calls();
        }, 'Mensaje enviado a portería.'),

      emergencyUnlock: (unitId: string) =>
        attempt(async () => {
          await api.post('/door/open', { unitId });
          await loaders.calls();
        }, 'Apertura de portería ejecutada y registrada en bitácora.'),

      addParcel: (d: { unitId: string; courier: string; trackingCode: string }) =>
        attempt(async () => {
          await api.post('/parcels', { ...d });
          await loaders.parcels();
        }, 'Paquete registrado. Notificación enviada al residente.'),

      /** Devuelve null si se entregó, o el mensaje de error del servidor. */
      deliverParcel: async (id: string, pin: string): Promise<string | null> => {
        try {
          await api.post(`/parcels/${id}/deliver`, { pin });
          await loaders.parcels();
          showToast('¡Paquete entregado con éxito!');
          return null;
        } catch (e) {
          return errMsg(e);
        }
      },

      occupySlot: (id: string, d: { vehiclePlate: string; unitVisiting: string; driverName: string }) =>
        attempt(async () => {
          await api.post(`/parking/${id}/occupy`, d);
          await loaders.parking();
        }, `Vehículo ${d.vehiclePlate} asignado al cupo.`),

      freeSlot: (id: string) =>
        attempt(async () => {
          await api.post(`/parking/${id}/free`);
          await loaders.parking();
        }, 'Cupo de parqueadero liberado.'),

      createPass: (d: { guestName: string; notes: string; hoursValid: number }) =>
        attempt(async () => {
          await api.post('/qr', d);
          await loaders.qr();
        }, `Pase QR generado para ${d.guestName}.`),

      sendSos: () =>
        attempt(async () => {
          await api.post('/alerts', { type: 'panico' });
          await loaders.alerts();
        }, 'Alerta SOS enviada a portería.'),

      dispatchAlert: (id: string) =>
        attempt(async () => {
          await api.post(`/alerts/${id}/dispatch`);
          await loaders.alerts();
        }, 'Ronda de vigilancia despachada.'),

      resolveAlert: (id: string, notes?: string) =>
        attempt(async () => {
          await api.post(`/alerts/${id}/resolve`, { notes: notes ?? '' });
          await loaders.alerts();
        }, 'Alerta resuelta y archivada en bitácora.'),

      publishNotice: (d: { title: string; category: string; message: string; targetTowers: string[] }) =>
        attempt(async () => {
          await api.post('/notices', d);
          await loaders.notices();
        }, 'Aviso publicado.'),

    }),
    [attempt, loaders, showToast]
  );

  return {
    units,
    calls,
    parcels,
    parking,
    notices,
    alerts,
    passes,
    activeCall,
    doorOpen,
    online,
    loaded,
    toast,
    showToast,
    ...actions,
  };
}
