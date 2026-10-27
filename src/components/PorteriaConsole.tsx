import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  Lock,
  Unlock,
  Camera,
  UserCheck,
  Package,
  Bike,
  Wrench,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  EyeOff
} from 'lucide-react';
import { ApartmentUnit, VisitorType, VisitorCall, DistressAlert, DistressType } from '../types/intercom';
import { soundFx } from '../utils/audio';
import { IMAGES } from '../data/mockData';
import { SecurityAlerts } from './SecurityAlerts';

interface PorteriaConsoleProps {
  apartments: ApartmentUnit[];
  selectedUnit: ApartmentUnit;
  setSelectedUnit: (unit: ApartmentUnit) => void;
  activeCall: VisitorCall | null;
  onInitiateCall: (callData: {
    unit: ApartmentUnit;
    visitorType: VisitorType;
    visitorName: string;
    company: string;
    snapshot: string;
    notes: string;
  }) => void;
  onHangupCall: () => void;
  onEmergencyUnlock: () => void;
  gateUnlocked: boolean;
  alerts: DistressAlert[];
  onResolveAlert: (alertId: string, notes?: string) => void;
  onDispatchGuard: (alertId: string) => void;
  onTriggerTestDistress: (type: DistressType) => void;
}

export const PorteriaConsole: React.FC<PorteriaConsoleProps> = ({
  apartments,
  selectedUnit,
  setSelectedUnit,
  activeCall,
  onInitiateCall,
  onHangupCall,
  onEmergencyUnlock,
  gateUnlocked,
  alerts,
  onResolveAlert,
  onDispatchGuard,
  onTriggerTestDistress,
}) => {

  const [selectedTower, setSelectedTower] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visitorType, setVisitorType] = useState<VisitorType>('domiciliario');
  const [visitorName, setVisitorName] = useState<string>('Repartidor Domicilio (#492)');
  const [company, setCompany] = useState<string>('Rappi Colombia');
  const [visitorNote, setVisitorNote] = useState<string>('Entrega de pedido a portería');
  const [cameraView, setCameraView] = useState<'courier' | 'guest'>('courier');

  // Filter apartments
  const filteredApartments = apartments.filter((apt) => {
    const matchesTower = selectedTower === 'Todas' || apt.tower === selectedTower;
    const matchesQuery =
      apt.unitNumber.includes(searchQuery) ||
      apt.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.tower.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTower && matchesQuery;
  });

  const handleSelectUnit = (unit: ApartmentUnit) => {
    soundFx.playKeypadBeep(650);
    setSelectedUnit(unit);
  };

  const handleTypeChange = (type: VisitorType) => {
    soundFx.playKeypadBeep(520);
    setVisitorType(type);
    if (type === 'domiciliario') {
      setVisitorName('Repartidor Domicilio (#492)');
      setCompany('Rappi Colombia');
      setCameraView('courier');
    } else if (type === 'invitado') {
      setVisitorName('Familia / Amigo Visitante');
      setCompany('Visita personal');
      setCameraView('guest');
    } else if (type === 'paqueteria') {
      setVisitorName('Mensajero Encomiendas');
      setCompany('Servientrega / Envía');
      setCameraView('courier');
    } else if (type === 'servicio') {
      setVisitorName('Técnico Especializado');
      setCompany('Claro Internet / Enel');
      setCameraView('courier');
    } else {
      setVisitorName('Visitante General');
      setCompany('Ingreso temporal');
    }
  };

  const handleStartCall = () => {
    const snapshotUrl = cameraView === 'courier' ? IMAGES.courierIntercom : IMAGES.guestIntercom;
    soundFx.playKeypadBeep(880);
    onInitiateCall({
      unit: selectedUnit,
      visitorType,
      visitorName,
      company,
      snapshot: snapshotUrl,
      notes: visitorNote,
    });
  };

  const handleCallInitiatingUnit = (unitNumber: string, tower: string) => {
    const target = apartments.find((a) => a.unitNumber === unitNumber && a.tower === tower);
    if (target) {
      setSelectedUnit(target);
      soundFx.playKeypadBeep(880);
      onInitiateCall({
        unit: target,
        visitorType: 'otro',
        visitorName: 'Vigilancia / Verificación SOS',
        company: 'Portería de Seguridad',
        snapshot: IMAGES.guestIntercom,
        notes: 'Llamada de verificación por señal de emergencia recibida',
      });
    }
  };

  const currentSnapshot = cameraView === 'courier' ? IMAGES.courierIntercom : IMAGES.guestIntercom;
  const activeDistressCount = alerts.filter((a) => a.status === 'activa').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full space-y-0">
      {/* Console Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-base font-bold tracking-wide">
              Consola de Vigilancia & Portería Principal
            </h2>
            {activeDistressCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-600 text-white rounded animate-pulse">
                🚨 {activeDistressCount} SOS ACTIVO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Operador: Guardia Juan Carlos M.</span>
            <span>·</span>
            <span>Edificio Los Nogales</span>
            <span>·</span>
            <span className="font-mono tabular-nums">Turno Diurno</span>
          </div>
        </div>

        {/* Gate Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              gateUnlocked
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            {gateUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Puerta Peatonal: ABIERTA</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Puerta Peatonal: ASEGURADA</span>
              </>
            )}
          </div>


          <button
            onClick={onEmergencyUnlock}
            className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
            title="Apertura manual por parte del guardia en caso de contingencia"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Apertura de Guardia</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 flex-1">
        {/* Left Column: Intercom Camera & Visitor Profiling (5 cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            {/* Camera Viewport */}
            <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-[4/3] border border-slate-800 group shadow-inner">
              <img
                src={currentSnapshot}
                alt="Cámara de Citófono en Portería"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Camera Overlays */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono text-white/90 drop-shadow">
                <span className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  CÁMARA TÓTEM 01
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded">1080p EN VIVO</span>
              </div>

              {/* Camera Switcher Buttons */}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 p-1 rounded-lg backdrop-blur-sm">
                <button
                  onClick={() => {
                    setCameraView('courier');
                    soundFx.playKeypadBeep(500);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                    cameraView === 'courier' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Domiciliario
                </button>
                <button
                  onClick={() => {
                    setCameraView('guest');
                    soundFx.playKeypadBeep(550);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                    cameraView === 'guest' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Invitado
                </button>
              </div>

              {gateUnlocked && (
                <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white">
                  <div className="bg-emerald-600 p-3 rounded-full shadow-lg mb-2 animate-bounce">
                    <Unlock className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold tracking-wide uppercase bg-black/60 px-3 py-1 rounded">
                    Acceso Autorizado por Residente
                  </span>
                </div>
              )}
            </div>

            {/* Visitor Classification Selector */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Paso 1: Tipo de Visitante que llega a portería
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleTypeChange('domiciliario')}
                  className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all flex flex-col gap-1 ${
                    visitorType === 'domiciliario'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <Bike className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Domicilio</span>
                  <span className="text-[10px] text-slate-500">Rappi / Didi / Uber</span>
                </button>

                <button
                  onClick={() => handleTypeChange('invitado')}
                  className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all flex flex-col gap-1 ${
                    visitorType === 'invitado'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Invitado</span>
                  <span className="text-[10px] text-slate-500">Familiar o Amigo</span>
                </button>

                <button
                  onClick={() => handleTypeChange('paqueteria')}
                  className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all flex flex-col gap-1 ${
                    visitorType === 'paqueteria'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Paquetería</span>
                  <span className="text-[10px] text-slate-500">MercadoLibre / DHL</span>
                </button>

                <button
                  onClick={() => handleTypeChange('servicio')}
                  className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all flex flex-col gap-1 ${
                    visitorType === 'servicio'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Servicio</span>
                  <span className="text-[10px] text-slate-500">Técnico / Enel</span>
                </button>
              </div>
            </div>

            {/* Visitor Details Input */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nombre / Identificación:</label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Empresa / Referencia:</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Privacy Guarantee Card (Key highlight requested by user) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              <span>Privacidad & Enmascaramiento Activo</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              El vigilante nunca ve el número de teléfono del residente. La llamada se enruta por la
              nube cifrada protegiendo la intimidad (Ley Habeas Data 1581 / GDPR).
            </p>
          </div>
        </div>

        {/* Right Column: Apartment Directory & Dialing Station (7 cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            {/* Step 2 Header & Tower Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Paso 2: Digitar o seleccionar apartamento
                </span>
                <span className="text-xs text-slate-500">
                  Selecciona la unidad habitacional a comunicar
                </span>
              </div>

              {/* Tower segmented filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                {['Todas', 'Torre 1', 'Torre 2', 'Torre 3'].map((tower) => (
                  <button
                    key={tower}
                    onClick={() => {
                      setSelectedTower(tower);
                      soundFx.playKeypadBeep(600);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedTower === tower
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tower}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número (ej: 302) o nombre del copropietario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
              />
            </div>

            {/* Apartment Grid (Fast Dial) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredApartments.map((unit) => {
                const isSelected = selectedUnit.id === unit.id;
                return (
                  <button
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit)}
                    className={`p-2.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isSelected ? 'text-emerald-400' : 'text-slate-900'
                        }`}
                      >
                        {unit.tower} - {unit.unitNumber}
                      </span>
                      {unit.status === 'moroso' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-amber-400 text-slate-900 font-semibold' : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          Alerta
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs truncate font-medium mt-1 ${
                        isSelected ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {unit.residentName}
                    </div>
                    <div
                      className={`text-[10px] flex items-center justify-between mt-1.5 ${
                        isSelected ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="font-mono">{unit.maskedPhone}</span>
                      <span>{unit.preferredChannel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Unit Details & Call Action Station */}
          <div className="pt-3 border-t border-slate-200">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Unidad Destino Seleccionada
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      {selectedUnit.tower} · Apto {selectedUnit.unitNumber}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">({selectedUnit.residentName})</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Número Enmascarado</span>
                  <span className="font-mono text-xs font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedUnit.maskedPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Big Action Bar */}
            {activeCall ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center animate-pulse">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-900 block">
                      Llamada de Citofonía en Progreso...
                    </span>
                    <span className="text-xs text-amber-700">
                      Timbrando en el celular de {activeCall.residentName} (
                      {activeCall.tower} - {activeCall.unitNumber})
                    </span>
                  </div>
                </div>

                <button
                  onClick={onHangupCall}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Finalizar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartCall}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <PhoneCall className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Iniciar Llamada de Citofonía Virtual al Celular</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Alerts Component */}
      <div className="border-t border-slate-800">
        <SecurityAlerts
          alerts={alerts}
          onResolveAlert={onResolveAlert}
          onDispatchGuard={onDispatchGuard}
          onCallInitiatingUnit={handleCallInitiatingUnit}
          onTriggerTestDistress={onTriggerTestDistress}
        />
      </div>
    </div>
  );
};

