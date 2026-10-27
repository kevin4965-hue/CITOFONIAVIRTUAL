import React, { useState } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  CheckCircle,
  Clock,
  Radio,
  User,
  MapPin,
  Flame,
  HeartPulse,
  Eye,
  AlertOctagon,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { DistressAlert, ApartmentUnit, DistressType } from '../types/intercom';
import { soundFx } from '../utils/audio';

export interface SecurityAlertsProps {
  alerts: DistressAlert[];
  onResolveAlert: (alertId: string, notes?: string) => void;
  onDispatchGuard: (alertId: string) => void;
  onCallInitiatingUnit: (unitNumber: string, tower: string) => void;
  onTriggerTestDistress: (type: DistressType) => void;
}

export const SecurityAlerts: React.FC<SecurityAlertsProps> = ({
  alerts,
  onResolveAlert,
  onDispatchGuard,
  onCallInitiatingUnit,
  onTriggerTestDistress,
}) => {
  const [filterStatus, setFilterStatus] = useState<'todas' | 'activas' | 'resueltas'>('todas');
  const [selectedAlertForNotes, setSelectedAlertForNotes] = useState<DistressAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const activeAlerts = alerts.filter((a) => a.status === 'activa');
  const inProgressAlerts = alerts.filter((a) => a.status === 'en_atencion');

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'activas') return a.status === 'activa' || a.status === 'en_atencion';
    if (filterStatus === 'resueltas') return a.status === 'resuelta';
    return true;
  });

  const getAlertIcon = (type: DistressType) => {
    switch (type) {
      case 'panico':
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      case 'medica':
        return <HeartPulse className="w-4 h-4 text-amber-600" />;
      case 'incendio':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'sospecha':
        return <Eye className="w-4 h-4 text-indigo-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  const getAlertLabel = (type: DistressType) => {
    switch (type) {
      case 'panico':
        return 'Pánico SOS Residente';
      case 'medica':
        return 'Emergencia Médica';
      case 'incendio':
        return 'Alerta de Fuego/Humo';
      case 'sospecha':
        return 'Actividad Sospechosa';
      default:
        return 'Alerta de Seguridad';
    }
  };

  const handleOpenResolveModal = (alert: DistressAlert) => {
    setSelectedAlertForNotes(alert);
    setResolutionNotes('');
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForNotes) return;
    onResolveAlert(
      selectedAlertForNotes.id,
      resolutionNotes.trim() || 'Verificado por vigilancia. Novedad controlada.'
    );
    soundFx.playChime();
    setSelectedAlertForNotes(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-white shadow-md">
      {/* Active High-Priority Emergency Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-rose-700 flex items-center justify-center font-bold shrink-0 shadow">
              <AlertOctagon className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider block text-white drop-shadow">
                ¡SEÑAL DE EMERGENCIA ACTIVA! ({activeAlerts.length})
              </span>
              <span className="text-[11px] text-rose-100 font-mono">
                {activeAlerts[0].tower} · Apto #{activeAlerts[0].unitNumber} ({activeAlerts[0].residentName})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCallInitiatingUnit(activeAlerts[0].unitNumber, activeAlerts[0].tower)}
              className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Intercom Inmediato</span>
            </button>
            <button
              onClick={() => onDispatchGuard(activeAlerts[0].id)}
              className="px-3 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg text-xs font-semibold transition-all border border-rose-300/30"
            >
              Despachar Ronda
            </button>
          </div>
        </div>
      )}

      {/* Component Header & Quick Test Button */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-white">
                SecurityAlerts: Monitoreo de Señales de Emergencia
              </h3>
              {activeAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-600 text-white rounded">
                  {activeAlerts.length} SOS
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Recepción satelital e IP de botones de pánico de copropietarios en tiempo real
            </p>
          </div>
        </div>

        {/* Filter Tabs & Test trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterStatus('todas')}
              className={`px-2 py-1 rounded transition-colors ${
                filterStatus === 'todas'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({alerts.length})
            </button>
            <button
              onClick={() => setFilterStatus('activas')}
              className={`px-2 py-1 rounded transition-colors ${
                filterStatus === 'activas'
                  ? 'bg-rose-950/80 text-rose-300 font-semibold border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendientes ({activeAlerts.length + inProgressAlerts.length})
            </button>
            <button
              onClick={() => setFilterStatus('resueltas')}
              className={`px-2 py-1 rounded transition-colors ${
                filterStatus === 'resueltas'
                  ? 'bg-emerald-950/80 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resueltas
            </button>
          </div>

          {/* Test Signal Button */}
          <button
            onClick={() => onTriggerTestDistress('panico')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1"
            title="Generar señal de pánico de prueba desde un apartamento"
          >
            <Plus className="w-3 h-3" />
            <span>Simular SOS</span>
          </button>
        </div>
      </div>

      {/* List of Recent Distress Alerts */}
      <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No hay alertas registradas bajo este filtro.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isAlertActive = alert.status === 'activa';
            const isAlertInProgress = alert.status === 'en_atencion';

            return (
              <div
                key={alert.id}
                className={`p-3.5 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isAlertActive
                    ? 'bg-rose-950/20 hover:bg-rose-950/30'
                    : isAlertInProgress
                    ? 'bg-amber-950/20 hover:bg-amber-950/30'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Initiating Unit & Distress Info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {getAlertIcon(alert.type)}
                      <span>{getAlertLabel(alert.type)}</span>
                    </span>

                    {/* Status Badge */}
                    {isAlertActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                        ACTIVA (SOS)
                      </span>
                    )}
                    {isAlertInProgress && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                        EN ATENCIÓN
                      </span>
                    )}
                    {alert.status === 'resuelta' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        RESUELTA
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono">
                      {alert.timestamp}
                    </span>
                  </div>

                  {/* Initiating Unit Details */}
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {alert.tower} · Apto #{alert.unitNumber}
                    </span>
                    <span className="text-slate-300 font-medium">{alert.residentName}</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Tel: {alert.emergencyPhone}
                    </span>
                  </div>

                  {alert.notes && (
                    <p className="text-[11px] text-slate-400 italic">
                      &quot;{alert.notes}&quot;
                    </p>
                  )}
                  {alert.respondedBy && (
                    <p className="text-[10px] text-emerald-400/90 font-mono">
                      Atendido por: {alert.respondedBy}
                    </p>
                  )}
                </div>

                {/* Guard Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onCallInitiatingUnit(alert.unitNumber, alert.tower)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                    title="Llamar de inmediato a la unidad por citofonía virtual"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Llamar Apto</span>
                  </button>

                  {alert.status !== 'resuelta' && (
                    <>
                      {isAlertActive && (
                        <button
                          onClick={() => onDispatchGuard(alert.id)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Despachar Ronda
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenResolveModal(alert)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Notes Modal */}
      {selectedAlertForNotes && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Concluir y Resolver Alerta de Seguridad</span>
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Unidad: <strong>{selectedAlertForNotes.tower} - #{selectedAlertForNotes.unitNumber}</strong> ({selectedAlertForNotes.residentName})
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Bitácora de atención del guardia / Resultado:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ej: Se comunicó con el residente, se trataba de falsa alarma accidental por el niño. Novedad superada sin afectaciones."
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForNotes(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow"
                >
                  Registrar como Resuelta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
