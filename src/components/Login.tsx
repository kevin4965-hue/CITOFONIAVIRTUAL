import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { ApiError, api, type SessionUser } from '../api/client';

interface LoginProps {
  onLoggedIn: (user: SessionUser) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post<{ user: SessionUser }>('/auth/login', { email, password });
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
            <span className="text-emerald-400">C</span>V
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Citofonía Virtual</h1>
            <p className="text-xs text-slate-500">Acceso para residentes, portería y administración</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" />
            {busy ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Tus datos se tratan conforme a la Ley 1581 de 2012 (Habeas Data).
        </p>
      </div>
    </div>
  );
};
