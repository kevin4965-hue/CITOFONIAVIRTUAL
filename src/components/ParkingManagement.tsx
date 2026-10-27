import React, { useState } from 'react';
import { Car, Clock, AlertTriangle, CheckCircle, Plus, LogOut } from 'lucide-react';
import { ParkingSlot, ApartmentUnit } from '../types/intercom';
import { soundFx } from '../utils/audio';

interface ParkingManagementProps {
  slots: ParkingSlot[];
  apartments: ApartmentUnit[];
  onOccupySlot: (slotId: string, data: { vehiclePlate: string; unitVisiting: string; driverName: string }) => void;
  onFreeSlot: (slotId: string) => void;
}

export const ParkingManagement: React.FC<ParkingManagementProps> = ({
  slots,
  apartments,
  onOccupySlot,
  onFreeSlot,
}) => {
  const [showAssignModal, setShowAssignModal] = useState<ParkingSlot | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(apartments[0]?.tower + ' - ' + apartments[0]?.unitNumber);

  const occupiedCount = slots.filter((s) => s.isOccupied).length;
  const availableCount = slots.length - occupiedCount;

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !vehiclePlate.trim()) return;

    onOccupySlot(showAssignModal.id, {
      vehiclePlate: vehiclePlate.toUpperCase().trim(),
      unitVisiting: selectedUnit,
      driverName: driverName.trim() || 'Visitante',
    });

    soundFx.playChime();
    setShowAssignModal(null);
    setVehiclePlate('');
    setDriverName('');
  };

  const handleRelease = (slot: ParkingSlot) => {
    soundFx.playKeypadBeep(500);
    onFreeSlot(slot.id);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Control de Parqueaderos de Visitantes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisión en tiempo real de cupos vehiculares, placas autorizadas y tiempo de estancia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-700">Libres: {availableCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-700">Ocupados: {occupiedCount}</span>
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-rose-500 transition-all duration-300"
              style={{ width: `${(occupiedCount / slots.length) * 100}%` }}
            ></div>
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${(availableCount / slots.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
            <span>Ocupación: {Math.round((occupiedCount / slots.length) * 100)}%</span>
            <span>Reglamento: Máximo 4 horas continuas para visitantes</span>
          </div>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {slots.map((slot) => {
          return (
            <div
              key={slot.id}
              className={`rounded-xl border p-4 transition-all flex flex-col justify-between min-h-[170px] ${
                slot.isOccupied
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold text-slate-900">{slot.slotNumber}</span>
                  {slot.type === 'discapacidad' && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                      Preferencial
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      slot.isOccupied
                        ? 'bg-rose-100 text-rose-800 font-mono'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {slot.isOccupied ? 'OCUPADO' : 'DISPONIBLE'}
                  </span>
                </div>

                {slot.isOccupied ? (
                  <div className="space-y-1">
                    <div className="text-base font-extrabold font-mono text-slate-900 tracking-wider">
                      {slot.vehiclePlate}
                    </div>
                    <div className="text-xs text-slate-700 font-medium truncate">
                      Visita: {slot.unitVisiting}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Ingreso: {slot.enteredAt}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 pt-2">
                    Cupo listo para asignar a vehículo de visitante.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200/60 mt-3">
                {slot.isOccupied ? (
                  <button
                    onClick={() => handleRelease(slot)}
                    className="w-full py-1.5 px-2 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Liberar Cupo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowAssignModal(slot);
                      setVehiclePlate('');
                      setDriverName('');
                    }}
                    className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Asignar Vehículo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Slot Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-300 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Asignar Cupo {showAssignModal.slotNumber}
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Registra los datos del vehículo visitante para control de acceso y seguridad.
            </p>

            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  placeholder="ej: HUL-821"
                  maxLength={7}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  className="w-full text-center font-mono text-lg font-bold tracking-widest p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Apartamento que Visita
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {apartments.map((a) => (
                    <option key={a.id} value={`${a.tower} - ${a.unitNumber}`}>
                      {a.tower} - Apto {a.unitNumber} ({a.residentName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nombre del Conductor
                </label>
                <input
                  type="text"
                  placeholder="ej: Andrés Gómez"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
                >
                  Registrar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
