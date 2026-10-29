export type VisitorType = 'domiciliario' | 'invitado' | 'servicio' | 'paqueteria' | 'otro';

export type CallStatus = 'idle' | 'ringing' | 'connected' | 'authorized' | 'rejected' | 'missed';

export interface ApartmentUnit {
  id: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  maskedPhone: string;
  /** Sólo presente para administración y para el propio residente; nunca para portería. */
  realPhone?: string;
  email?: string;
  /** Estado de cartera: sólo administración. */
  status?: 'al_dia' | 'moroso' | 'desocupado';
  residentsCount: number;
  assignedParking: string;
  preferredChannel: 'App Móvil' | 'Llamada Celular GSM' | 'WhatsApp Bot';
}

export interface VisitorCall {
  id: string;
  unitId: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  visitorType: VisitorType;
  visitorName: string;
  company?: string;
  cameraSnapshot: string;
  timestamp: string;
  status: CallStatus;
  durationSeconds: number;
  authorizedBy?: string;
  notes?: string;
  dayOfWeek?: string;
  hour?: number;
  /** Id del usuario (vigilante) que inició la llamada. */
  createdBy?: string | null;
}


export interface Parcel {
  id: string;
  trackingCode: string;
  tower: string;
  unitNumber: string;
  recipientName: string;
  courier: string;
  arrivalTime: string;
  photoUrl: string;
  status: 'en_porteria' | 'entregado';
  /** Sólo lo recibe el residente destinatario. */
  pickupPin?: string;
  pickupTime?: string;
  receiverSignature?: string;
}

export interface ParkingSlot {
  id: string;
  slotNumber: string;
  type: 'visitante' | 'residente' | 'discapacidad';
  isOccupied: boolean;
  vehiclePlate?: string;
  unitVisiting?: string;
  enteredAt?: string;
  driverName?: string;
}

export interface BroadcastNotice {
  id: string;
  title: string;
  category: 'mantenimiento' | 'urgente' | 'asamblea' | 'informativo';
  message: string;
  targetTowers: string[];
  date: string;
  author: string;
  isRead?: boolean;
}

export interface AccessPassQR {
  id: string;
  guestName: string;
  unitNumber: string;
  tower: string;
  validUntil: string;
  qrCode: string;
  usesRemaining: number;
  notes: string;
}

export type DistressType = 'panico' | 'medica' | 'incendio' | 'sospecha';
export type AlertResolutionStatus = 'activa' | 'en_atencion' | 'resuelta';

export interface DistressAlert {
  id: string;
  unitId: string;
  tower: string;
  unitNumber: string;
  residentName: string;
  /** Sólo se entrega a portería. */
  emergencyPhone?: string;
  type: DistressType;
  timestamp: string;
  status: AlertResolutionStatus;
  respondedBy?: string;
  notes?: string;
}

