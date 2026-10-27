import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Unlock,
  ShieldCheck,
  Package,
  QrCode,
  Bell,
  Mic,
  MicOff,
  MessageSquare,
  AlertOctagon,
  Clock,
  Sparkles,
  CheckCircle2,
  Share2,
  Trash2,
  Plus
} from 'lucide-react';
import { VisitorCall, ApartmentUnit, Parcel, AccessPassQR, BroadcastNotice } from '../types/intercom';
import { soundFx } from '../utils/audio';

interface ResidentSmartphoneProps {
  activeCall: VisitorCall | null;
  residentUnit: ApartmentUnit;
  parcels: Parcel[];
  qrPasses: AccessPassQR[];
  notices: BroadcastNotice[];
  onAuthorizeCall: () => void;
  onRejectCall: () => void;
  onSendQuickReply: (text: string) => void;
  onCreateQRPass: (pass: { guestName: string; notes: string; hoursValid: number }) => void;
  onTriggerEmergencyAlarm: () => void;
}

export const ResidentSmartphone: React.FC<ResidentSmartphoneProps> = ({
  activeCall,
  residentUnit,
  parcels,
  qrPasses,
  notices,
  onAuthorizeCall,
  onRejectCall,
  onSendQuickReply,
  onCreateQRPass,
  onTriggerEmergencyAlarm,
}) => {
  const [activeAppTab, setActiveAppTab] = useState<'home' | 'paquetes' | 'qr' | 'avisos'>('home');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [callConnected, setCallConnected] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('12:45');
  const [showNewQRModal, setShowNewQRModal] = useState<boolean>(false);
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newGuestNote, setNewGuestNote] = useState<string>('Visita de amigos');
  const [alarmSent, setAlarmSent] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const residentParcels = parcels.filter(
    (p) => p.tower === residentUnit.tower && p.unitNumber === residentUnit.unitNumber
  );

  const handleAuthorize = () => {
    soundFx.playDoorBuzzer();
    onAuthorizeCall();
  };

  const handleReject = () => {
    soundFx.playKeypadBeep(400);
    onRejectCall();
  };

  const handleCreateQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    onCreateQRPass({
      guestName: newGuestName,
      notes: newGuestNote,
      hoursValid: 4,
    });
    setNewGuestName('');
    setShowNewQRModal(false);
  };

  const handleTriggerAlarm = () => {
    setAlarmSent(true);
    soundFx.playKeypadBeep(900);
    onTriggerEmergencyAlarm();
    setTimeout(() => setAlarmSent(false), 4000);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Phone Case Frame */}
      <div className="w-[330px] sm:w-[350px] h-[670px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700 relative flex flex-col justify-between overflow-hidden">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-900/60"></div>
        </div>

        {/* Screen Area */}
        <div className="w-full h-full bg-slate-100 rounded-[34px] overflow-hidden flex flex-col relative z-10 text-slate-900">
          {/* Mobile Status Bar */}
          <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-white/70 backdrop-blur-sm z-20">
            <span className="font-mono">{currentTimeStr}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] tracking-tight">5G</span>
              <div className="w-5 h-2.5 rounded-sm border border-slate-700 p-0.5 flex items-center">
                <div className="w-3.5 h-full bg-slate-800 rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* SCREEN CONTENT: EITHER ACTIVE CALL OR RESIDENTIAL APP */}
          {activeCall ? (
            /* --- INCOMING / ACTIVE CITÓFONO CALL SCREEN --- */
            <div className="flex-1 bg-slate-950 text-white flex flex-col justify-between p-4 relative overflow-hidden animate-fade-in">
              {/* Background live camera feed with darkened overlay */}
              <div className="absolute inset-0 opacity-40">
                <img
                  src={activeCall.cameraSnapshot}
                  alt="Visitante en portería"
                  className="w-full h-full object-cover scale-105 filter blur-[0.5px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Top Banner: Call Origin */}
              <div className="relative z-10 text-center pt-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-semibold tracking-wide uppercase shadow-md animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  Llamada de Citofonía Virtual
                </div>

                <h3 className="text-xl font-bold mt-2 text-white drop-shadow">
                  Portería Principal
                </h3>
                <p className="text-xs text-slate-300 drop-shadow">
                  {activeCall.tower} · Apto {activeCall.unitNumber}
                </p>
              </div>

              {/* Center Card: Visitor Identity Preview */}
              <div className="relative z-10 my-auto bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 border border-white/15 relative">
                  <img
                    src={activeCall.cameraSnapshot}
                    alt="Cámara de portería"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400">
                    CÁMARA TÓTEM
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      {activeCall.visitorType}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      {activeCall.company || 'En portería'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {activeCall.visitorName}
                  </p>
                  {activeCall.notes && (
                    <p className="text-[11px] text-slate-300 italic">
                      &quot;{activeCall.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Quick Canned Responses */}
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onSendQuickReply('Dejar en portería por favor')}
                    className="text-[10px] bg-white/15 hover:bg-white/25 px-2 py-1 rounded-md text-slate-200 transition-colors"
                  >
                    💬 &quot;Dejar en portería&quot;
                  </button>
                  <button
                    onClick={() => onSendQuickReply('Ya bajo en 2 minutos')}
                    className="text-[10px] bg-white/15 hover:bg-white/25 px-2 py-1 rounded-md text-slate-200 transition-colors"
                  >
                    💬 &quot;Ya bajo en 2 min&quot;
                  </button>
                </div>
              </div>

              {/* Bottom Action Controls: Big Tactile Buttons */}
              <div className="relative z-10 space-y-3 pb-3">
                <div className="flex items-center justify-center gap-4">
                  {/* Push-to-talk mic button */}
                  <button
                    onClick={() => {
                      setIsMicActive(!isMicActive);
                      soundFx.playKeypadBeep(700);
                    }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      isMicActive
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                    title="Hablar por citófono"
                  >
                    {isMicActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Reject Button */}
                  <button
                    onClick={handleReject}
                    className="py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>

                  {/* Authorize & Open Gate Button */}
                  <button
                    onClick={handleAuthorize}
                    className="py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Abrir Puerta</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* --- RESIDENTIAL APP MAIN VIEW --- */
            <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-slate-50">
              {/* App Header */}
              <div className="p-4 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Mi Apartamento
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {residentUnit.tower} · #{residentUnit.unitNumber}
                    </h3>
                  </div>

                  <button
                    onClick={handleTriggerAlarm}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                    title="Alerta silenciosa a portería"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Pánico</span>
                  </button>
                </div>

                {alarmSent && (
                  <div className="mt-2 p-2 bg-rose-600 text-white rounded-lg text-[10px] font-semibold text-center animate-pulse">
                    ¡Alerta enviada a la portería con éxito!
                  </div>
                )}
              </div>

              {/* App Body Tabs */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto">
                {activeAppTab === 'home' && (
                  <>
                    {/* Access Card Overview */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-300">Citofonía en la Nube</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                          ACTIVO
                        </span>
                      </div>
                      <div className="text-sm font-semibold">{residentUnit.residentName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Llamadas enrutadas a {residentUnit.maskedPhone}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Parqueadero asignado:</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {residentUnit.assignedParking}
                        </span>
                      </div>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setActiveAppTab('paquetes')}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Package className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                            {residentParcels.filter((p) => p.status === 'en_porteria').length}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">Encomiendas</span>
                        <span className="text-[10px] text-slate-500">Paquetes recibidos</span>
                      </button>

                      <button
                        onClick={() => setActiveAppTab('qr')}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <QrCode className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {qrPasses.length}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">Pases QR</span>
                        <span className="text-[10px] text-slate-500">Invitados & domicilios</span>
                      </button>
                    </div>

                    {/* Recent Door Activity */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center justify-between">
                        <span>Último Acceso Registrado</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            Repartidor Rappi (#8491)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Autorizado desde el celular · Hoy, 13:42
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeAppTab === 'paquetes' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Paquetes en Portería
                      </h4>
                      <button
                        onClick={() => setActiveAppTab('home')}
                        className="text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Volver
                      </button>
                    </div>

                    {residentParcels.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        No tienes paquetes pendientes por retirar.
                      </div>
                    ) : (
                      residentParcels.map((parcel) => (
                        <div
                          key={parcel.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                {parcel.courier}
                              </span>
                              <div className="text-xs font-bold text-slate-900 mt-1">
                                {parcel.trackingCode}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500">{parcel.arrivalTime}</span>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[11px] text-slate-600">PIN de Retiro:</span>
                            <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                              {parcel.pickupPin}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeAppTab === 'qr' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Pases QR de Invitados
                      </h4>
                      <button
                        onClick={() => setShowNewQRModal(true)}
                        className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Crear Pase</span>
                      </button>
                    </div>

                    {showNewQRModal && (
                      <form
                        onSubmit={handleCreateQR}
                        className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm space-y-2"
                      >
                        <div className="text-xs font-bold text-slate-900">
                          Nuevo Código de Acceso QR
                        </div>
                        <input
                          type="text"
                          placeholder="Nombre del invitado..."
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewQRModal(false)}
                            className="flex-1 py-1.5 text-[11px] font-medium border border-slate-200 rounded-lg text-slate-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-1.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Generar QR
                          </button>
                        </div>
                      </form>
                    )}

                    {qrPasses.map((pass) => (
                      <div
                        key={pass.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900">{pass.guestName}</div>
                            <div className="text-[10px] text-slate-500">{pass.validUntil}</div>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                            {pass.usesRemaining} uso
                          </span>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <QrCode className="w-8 h-8 text-slate-800 shrink-0" />
                          <div className="truncate text-[10px] font-mono text-slate-600">
                            {pass.qrCode}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeAppTab === 'avisos' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Circulares de Administración
                      </h4>
                      <button
                        onClick={() => setActiveAppTab('home')}
                        className="text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Volver
                      </button>
                    </div>

                    {notices.map((n) => (
                      <div
                        key={n.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase text-slate-500">
                            {n.category}
                          </span>
                          <span className="text-[10px] text-slate-400">{n.date}</span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900">{n.title}</h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom App Navigation Bar */}
              <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around text-slate-600">
                <button
                  onClick={() => setActiveAppTab('home')}
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                    activeAppTab === 'home' ? 'text-emerald-600 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Citófono</span>
                </button>
                <button
                  onClick={() => setActiveAppTab('paquetes')}
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                    activeAppTab === 'paquetes'
                      ? 'text-emerald-600 font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Paquetes</span>
                </button>
                <button
                  onClick={() => setActiveAppTab('qr')}
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                    activeAppTab === 'qr' ? 'text-emerald-600 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pases QR</span>
                </button>
                <button
                  onClick={() => setActiveAppTab('avisos')}
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                    activeAppTab === 'avisos' ? 'text-emerald-600 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Avisos</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Home Indicator Bar */}
          <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto my-1.5 shrink-0 z-20"></div>
        </div>
      </div>
    </div>
  );
};
