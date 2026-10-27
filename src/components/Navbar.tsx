import React from 'react';
import { Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  hasActiveCall: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMuted,
  setIsMuted,
  hasActiveCall,
}) => {
  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    soundFx.setMuted(nextState);
    if (!nextState) {
      soundFx.playKeypadBeep(880);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="text-emerald-400">C</span>V
          </div>
          <button
            onClick={() => setActiveTab('simulador')}
            className="text-lg font-bold tracking-tight text-slate-900 hover:text-emerald-600 transition-colors whitespace-nowrap text-left"
          >
            Citofonía Virtual
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line, unboxed, text links) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('simulador')}
            className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
              activeTab === 'simulador' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Simulador Dual (Portería + Celular)
          </button>
          <button
            onClick={() => setActiveTab('bitacora')}
            className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
              activeTab === 'bitacora' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Bitácora Digital de Accesos
          </button>
          <button
            onClick={() => setActiveTab('paquetes')}
            className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
              activeTab === 'paquetes' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Paquetería & Casilleros
          </button>
          <button
            onClick={() => setActiveTab('parqueaderos')}
            className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
              activeTab === 'parqueaderos' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Gestión Parqueaderos
          </button>
          <button
            onClick={() => setActiveTab('comparativa')}
            className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
              activeTab === 'comparativa' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Tradicional vs. Virtual & ROI
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title={isMuted ? 'Efectos de audio silenciados' : 'Audio de citófono activo'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="hidden sm:inline">{isMuted ? 'Sonido Silenciado' : 'Audio Activo'}</span>
          </button>

          <button
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm whitespace-nowrap ${
              hasActiveCall
                ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {hasActiveCall ? 'Llamada en Curso' : 'Abrir Consola'}
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="lg:hidden flex items-center gap-4 px-4 py-2.5 overflow-x-auto border-t border-slate-100 text-xs font-medium text-slate-600 bg-slate-50/80">
        <button
          onClick={() => setActiveTab('simulador')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'simulador' ? 'text-slate-900 font-bold' : ''}`}
        >
          Simulador Dual
        </button>
        <button
          onClick={() => setActiveTab('bitacora')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'bitacora' ? 'text-slate-900 font-bold' : ''}`}
        >
          Bitácora
        </button>
        <button
          onClick={() => setActiveTab('paquetes')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'paquetes' ? 'text-slate-900 font-bold' : ''}`}
        >
          Paquetería
        </button>
        <button
          onClick={() => setActiveTab('parqueaderos')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'parqueaderos' ? 'text-slate-900 font-bold' : ''}`}
        >
          Parqueaderos
        </button>
        <button
          onClick={() => setActiveTab('comparativa')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'comparativa' ? 'text-slate-900 font-bold' : ''}`}
        >
          Tradicional vs Virtual
        </button>
      </div>
    </header>
  );
};
