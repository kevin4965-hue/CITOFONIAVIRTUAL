import React from 'react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { soundFx } from '../utils/audio';

export interface NavTab {
  id: string;
  label: string;
  shortLabel?: string;
}

interface NavbarProps {
  tabs: NavTab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  hasActiveCall: boolean;
  userName: string;
  roleLabel: string;
  online: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  isMuted,
  setIsMuted,
  hasActiveCall,
  userName,
  roleLabel,
  online,
  onLogout,
}) => {
  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    soundFx.setMuted(nextState);
    if (!nextState) soundFx.playKeypadBeep(880);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="text-emerald-400">C</span>V
          </div>
          <button
            onClick={() => tabs[0] && setActiveTab(tabs[0].id)}
            className="text-lg font-bold tracking-tight text-slate-900 hover:text-emerald-600 transition-colors whitespace-nowrap text-left"
          >
            Citofonía Virtual
          </button>
        </div>

        {tabs.length > 1 && (
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`transition-colors whitespace-nowrap hover:text-slate-900 ${
                  activeTab === t.id ? 'text-slate-900 font-semibold' : ''
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <span
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500"
            title={online ? 'Conectado en tiempo real' : 'Reconectando...'}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {online ? 'En línea' : 'Reconectando'}
          </span>

          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="hidden sm:inline">{isMuted ? 'Silenciado' : 'Audio activo'}</span>
          </button>

          {hasActiveCall && (
            <span className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg animate-pulse whitespace-nowrap">
              Llamada en curso
            </span>
          )}

          <div className="hidden md:block text-right leading-tight">
            <div className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">{userName}</div>
            <div className="text-[10px] text-slate-500">{roleLabel}</div>
          </div>
          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="lg:hidden flex items-center gap-4 px-4 py-2.5 overflow-x-auto border-t border-slate-100 text-xs font-medium text-slate-600 bg-slate-50/80">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`whitespace-nowrap shrink-0 ${activeTab === t.id ? 'text-slate-900 font-bold' : ''}`}
            >
              {t.shortLabel ?? t.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
