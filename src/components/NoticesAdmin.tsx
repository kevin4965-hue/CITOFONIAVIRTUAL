import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import type { BroadcastNotice } from '../types/intercom';

interface NoticesAdminProps {
  notices: BroadcastNotice[];
  towers: string[];
  onPublish: (d: { title: string; category: string; message: string; targetTowers: string[] }) => Promise<boolean>;
}

const CATEGORIES: Array<{ id: BroadcastNotice['category']; label: string }> = [
  { id: 'informativo', label: 'Informativo' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'asamblea', label: 'Asamblea' },
  { id: 'urgente', label: 'Urgente' },
];

export const NoticesAdmin: React.FC<NoticesAdminProps> = ({ notices, towers, onPublish }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<BroadcastNotice['category']>('informativo');
  const [target, setTarget] = useState('Todas las torres');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onPublish({ title, category, message, targetTowers: [target] });
    setBusy(false);
    if (ok) {
      setTitle('');
      setMessage('');
    }
  };

  const field = 'w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Megaphone className="w-4 h-4 text-emerald-600" /> Publicar aviso a residentes
        </h2>
        <input className={field} placeholder="Título" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={field} placeholder="Mensaje" required maxLength={2000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value as BroadcastNotice['category'])}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select className={field} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option>Todas las torres</option>
            {towers.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <button disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg">
          {busy ? 'Publicando...' : 'Publicar'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-3">Avisos publicados</h2>
        <ul className="divide-y divide-slate-100">
          {notices.length === 0 && <li className="text-sm text-slate-500">Aún no hay avisos.</li>}
          {notices.map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{n.category}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
              <p className="text-[10px] text-slate-400 mt-1">{n.date} · {n.targetTowers.join(', ')}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
