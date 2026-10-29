import React, { useState } from 'react';
import { Package, Plus, CheckCircle, Clock, ShieldCheck, Camera, BellRing, Sparkles } from 'lucide-react';
import { Parcel, ApartmentUnit } from '../types/intercom';
import { soundFx } from '../utils/audio';

interface ParcelsManagementProps {
  parcels: Parcel[];
  apartments: ApartmentUnit[];
  onAddParcel: (data: { unitId: string; courier: string; trackingCode: string }) => void | Promise<unknown>;
  /** Devuelve null si se entregó, o el mensaje de error del servidor. */
  onDeliverParcel: (parcelId: string, pinEntered: string) => Promise<string | null>;
}

export const ParcelsManagement: React.FC<ParcelsManagementProps> = ({
  parcels,
  apartments,
  onAddParcel,
  onDeliverParcel,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(apartments[0]?.id || '');
  const [courier, setCourier] = useState('MercadoLibre Full');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryPinModal, setDeliveryPinModal] = useState<Parcel | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const pendingParcels = parcels.filter((p) => p.status === 'en_porteria');
  const deliveredParcels = parcels.filter((p) => p.status === 'entregado');

  const handleRegisterParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUnit = apartments.find((a) => a.id === selectedUnitId) || apartments[0];
    if (!targetUnit) return;
    // El PIN de retiro lo genera el servidor y sólo lo recibe el residente.
    await onAddParcel({ unitId: targetUnit.id, courier, trackingCode: trackingCode.trim() });
    soundFx.playChime();
    setShowAddModal(false);
    setTrackingCode('');
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryPinModal) return;
    const error = await onDeliverParcel(deliveryPinModal.id, pinInput);
    if (error === null) {
      soundFx.playChime();
      setDeliveryPinModal(null);
      setPinInput('');
      setPinError(null);
    } else {
      soundFx.playKeypadBeep(300);
      setPinError(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Feature Explainer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Módulo de Correspondencia & Encomiendas Digitales
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Notificación instantánea con foto y código PIN de retiro seguro al celular del residente
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nuevo Paquete</span>
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div>
            <span className="text-[11px] text-slate-500 block">En Casillero de Portería</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {pendingParcels.length}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Entregados Hoy</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {deliveredParcels.length}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Tasa de Efectividad PIN</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              100%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Costo Adicional</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              $0 COP
            </span>
          </div>
        </div>
      </div>

      {/* Pending Parcels Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Paquetes Pendientes por Retirar ({pendingParcels.length})
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Los residentes reciben notificación con foto y PIN al momento del registro
          </span>
        </div>

        {pendingParcels.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No hay paquetes pendientes en portería en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {pendingParcels.map((p) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                      {p.tower} · Apto #{p.unitNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{p.arrivalTime}</span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 truncate">
                    {p.recipientName}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    Transportadora: <span className="font-semibold">{p.courier}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Guía: {p.trackingCode}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">PIN de Entrega:</span>
                    <span className="font-mono text-sm font-bold text-slate-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {p.pickupPin}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setDeliveryPinModal(p);
                      setPinInput('');
                      setPinError(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Entregar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivered Parcels History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Historial de Entregas Recientes
          </h4>
        </div>
        <div className="divide-y divide-slate-100">
          {deliveredParcels.map((p) => (
            <div key={p.id} className="p-3.5 text-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <span className="font-semibold text-slate-900">
                    {p.tower} - #{p.unitNumber} · {p.recipientName}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {p.courier} (Guía: {p.trackingCode}) · Entregado: {p.pickupTime || 'Hoy'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Validado con PIN
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Register New Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-300 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Registrar Paquete en Portería
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Se enviará una alerta automática con foto y PIN al teléfono del residente.
            </p>

            <form onSubmit={handleRegisterParcel} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Apartamento Destino
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.tower} - Apto {apt.unitNumber} ({apt.residentName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Empresa Transportadora
                </label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="MercadoLibre Full">MercadoLibre Full</option>
                  <option value="Amazon Logistics">Amazon Logistics</option>
                  <option value="Servientrega">Servientrega</option>
                  <option value="Coordinadora">Coordinadora</option>
                  <option value="Inter Rapidísimo">Inter Rapidísimo</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="Rappi Envíos">Rappi Envíos</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Número de Guía o Referencia
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Opcional: si lo dejas vacío se genera uno"
                  maxLength={60}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
                >
                  Guardar y Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery PIN verification modal */}
      {deliveryPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-300 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Confirmar Entrega de Paquete
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Solicita el PIN de 4 dígitos al residente de{' '}
              <strong className="text-slate-900">
                {deliveryPinModal.tower} - #{deliveryPinModal.unitNumber}
              </strong>
            </p>

            <form onSubmit={handleConfirmDelivery} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Digita el PIN del residente:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="ej: 5821"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center font-mono text-xl tracking-widest p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  autoFocus
                />
                {pinError && (
                  <span className="text-[11px] text-rose-600 block mt-1">
                    {pinError}
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryPinModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Validar y Entregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
