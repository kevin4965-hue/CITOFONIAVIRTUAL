import type {
  AccessPassQR,
  ApartmentUnit,
  BroadcastNotice,
  DistressAlert,
  DistressType,
  Parcel,
  ParkingSlot,
  VisitorCall,
  VisitorType,
} from '../types/intercom';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const fmtClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/** "Hoy, 10:30" / "Ayer, 10:30" / "27 oct, 10:30" */
export function fmtWhen(ms: number | null | undefined): string {
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return `Hoy, ${fmtClock(ms)}`;
  if (diffDays === 1) return `Ayer, ${fmtClock(ms)}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${fmtClock(ms)}`;
}

// ---- Formas que devuelve la API ----
export interface ApiCall {
  id: string;
  unitId: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  visitorType: VisitorType;
  visitorName: string;
  company: string;
  cameraSnapshot: string;
  status: VisitorCall['status'];
  createdAt: number;
  durationSeconds: number;
  authorizedBy?: string;
  notes: string;
  createdBy: string | null;
}

export function toVisitorCall(c: ApiCall): VisitorCall {
  const d = new Date(c.createdAt);
  return {
    id: c.id,
    unitId: c.unitId,
    tower: c.tower,
    unitNumber: c.unitNumber,
    residentName: c.residentName,
    visitorType: c.visitorType,
    visitorName: c.visitorName,
    company: c.company,
    cameraSnapshot: c.cameraSnapshot,
    timestamp: fmtWhen(c.createdAt),
    status: c.status,
    durationSeconds: c.durationSeconds,
    authorizedBy: c.authorizedBy,
    notes: c.notes,
    dayOfWeek: DAYS[d.getDay()],
    hour: d.getHours(),
    createdBy: c.createdBy,
  };
}

export interface ApiParcel {
  id: string;
  trackingCode: string;
  tower: string;
  unitNumber: string;
  recipientName: string;
  courier: string;
  photoUrl: string;
  status: 'en_porteria' | 'entregado';
  arrivedAt: number;
  deliveredAt: number | null;
  pickupPin?: string;
}

export const toParcel = (p: ApiParcel): Parcel => ({
  id: p.id,
  trackingCode: p.trackingCode,
  tower: p.tower,
  unitNumber: p.unitNumber,
  recipientName: p.recipientName,
  courier: p.courier,
  arrivalTime: fmtWhen(p.arrivedAt),
  photoUrl: p.photoUrl,
  status: p.status,
  pickupPin: p.pickupPin,
  pickupTime: p.deliveredAt ? fmtWhen(p.deliveredAt) : undefined,
});

export interface ApiSlot {
  id: string;
  slotNumber: string;
  type: ParkingSlot['type'];
  isOccupied: boolean;
  vehiclePlate?: string;
  unitVisiting?: string;
  driverName?: string;
  enteredAt: number | null;
}

export const toSlot = (s: ApiSlot): ParkingSlot => ({
  id: s.id,
  slotNumber: s.slotNumber,
  type: s.type,
  isOccupied: s.isOccupied,
  vehiclePlate: s.vehiclePlate,
  unitVisiting: s.unitVisiting,
  driverName: s.driverName,
  enteredAt: s.enteredAt ? fmtClock(s.enteredAt) : undefined,
});

export interface ApiNotice {
  id: string;
  title: string;
  category: BroadcastNotice['category'];
  message: string;
  targetTowers: string[];
  author: string;
  createdAt: number;
  isRead: boolean;
}

export const toNotice = (n: ApiNotice): BroadcastNotice => ({
  id: n.id,
  title: n.title,
  category: n.category,
  message: n.message,
  targetTowers: n.targetTowers,
  date: new Date(n.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
  author: n.author,
  isRead: n.isRead,
});

export interface ApiPass {
  id: string;
  guestName: string;
  tower: string;
  unitNumber: string;
  validUntil: number;
  qrCode: string;
  usesRemaining: number;
  notes: string;
}

export const toPass = (q: ApiPass): AccessPassQR => ({
  id: q.id,
  guestName: q.guestName,
  tower: q.tower,
  unitNumber: q.unitNumber,
  validUntil:
    q.usesRemaining <= 0 ? 'Utilizado' : q.validUntil < Date.now() ? 'Vencido' : `Válido hasta ${fmtWhen(q.validUntil)}`,
  qrCode: q.qrCode,
  usesRemaining: q.usesRemaining,
  notes: q.notes,
});

export interface ApiAlert {
  id: string;
  unitId: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  type: DistressType;
  status: DistressAlert['status'];
  createdAt: number;
  respondedBy?: string;
  notes: string;
  emergencyPhone?: string;
}

export const toAlert = (a: ApiAlert): DistressAlert => ({
  id: a.id,
  unitId: a.unitId,
  tower: a.tower,
  unitNumber: a.unitNumber,
  residentName: a.residentName,
  emergencyPhone: a.emergencyPhone,
  type: a.type,
  timestamp: fmtWhen(a.createdAt),
  status: a.status,
  respondedBy: a.respondedBy,
  notes: a.notes,
});

export const toUnit = (u: ApartmentUnit): ApartmentUnit => u;
