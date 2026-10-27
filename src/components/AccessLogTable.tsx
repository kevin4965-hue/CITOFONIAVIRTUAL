import React, { useState } from 'react';
import { Download, Search, CheckCircle, XCircle, Clock, Shield, Camera, Filter, BarChart3, ListFilter, LayoutDashboard, BarChart2 } from 'lucide-react';
import { VisitorCall } from '../types/intercom';
import { VisitorTrafficDashboard } from './VisitorTrafficDashboard';
import { DashboardAnalytics } from './DashboardAnalytics';

interface AccessLogTableProps {
  logs: VisitorCall[];
}

export const AccessLogTable: React.FC<AccessLogTableProps> = ({ logs }) => {
  const [viewMode, setViewMode] = useState<'analytics' | 'dashboard' | 'table' | 'both'>('analytics');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'rejected'>('all');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.unitNumber.includes(searchTerm) ||
      log.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.company && log.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'authorized' && log.status === 'authorized') ||
      (statusFilter === 'rejected' && log.status === 'rejected');

    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha y Hora', 'Torre', 'Apartamento', 'Residente', 'Tipo Visitante', 'Nombre Visitante', 'Empresa', 'Estado', 'Duración (seg)', 'Autorizado Por', 'Notas'];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      log.tower,
      log.unitNumber,
      `"${log.residentName}"`,
      log.visitorType,
      `"${log.visitorName}"`,
      `"${log.company || ''}"`,
      log.status,
      log.durationSeconds,
      `"${log.authorizedBy || ''}"`,
      `"${log.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_citofonia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Mode Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Vista de Bitácora:
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'analytics'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>DashboardAnalytics (Barras por Hora)</span>
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Métricas & Semana</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-slate-700" />
              <span>Historial Detallado</span>
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'both'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-700" />
              <span>Todo</span>
            </button>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {logs.length} registros auditados en tiempo real
        </span>
      </div>

      {/* Dedicated DashboardAnalytics Component */}
      {(viewMode === 'analytics' || viewMode === 'both') && (
        <DashboardAnalytics callHistory={logs} />
      )}

      {/* General VisitorTrafficDashboard Component */}
      {(viewMode === 'dashboard' || viewMode === 'both') && (
        <VisitorTrafficDashboard logs={logs} />
      )}

      {/* Conditional Table Rendering */}
      {(viewMode === 'table' || viewMode === 'both') && (

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bitácora Digital de Citofonía & Accesos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro forense e inviolable de cada timbre, llamada atendida y apertura de puerta
              </p>
            </div>


        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter segmented control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('authorized')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'authorized'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Autorizados
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'rejected'
                  ? 'bg-white text-rose-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rechazados
            </button>
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por apartamento, residente o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Hora / Foto</th>
              <th className="py-3 px-4">Destino</th>
              <th className="py-3 px-4">Residente</th>
              <th className="py-3 px-4">Visitante / Tipo</th>
              <th className="py-3 px-4">Empresa / Referencia</th>
              <th className="py-3 px-4 text-center">Duración</th>
              <th className="py-3 px-4">Resolución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isApproved = log.status === 'authorized';
              return (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setPreviewPhoto(log.cameraSnapshot)}
                >
                  {/* Photo & Timestamp */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-slate-800 border border-slate-200 shrink-0">
                        <img
                          src={log.cameraSnapshot}
                          alt="Captura"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <span className="font-mono text-slate-800 font-semibold block">
                          {log.timestamp}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Destination Unit */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {log.tower} - #{log.unitNumber}
                    </span>
                  </td>

                  {/* Resident */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-medium">
                    {log.residentName}
                  </td>

                  {/* Visitor & Type */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div>
                      <div className="font-semibold text-slate-900">{log.visitorName}</div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight">
                        {log.visitorType}
                      </span>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    {log.company || '—'}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 text-center font-mono text-slate-600 tabular-nums">
                    {log.durationSeconds}s
                  </td>

                  {/* Resolution Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {isApproved ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-emerald-800 block">
                              Acceso Autorizado
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {log.authorizedBy}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-rose-800 block">Rechazado</span>
                            <span className="text-[10px] text-slate-500 block">
                              {log.authorizedBy || 'Llamada no atendida'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* Snapshot Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold font-mono">
                REGISTRO FOTOGRÁFICO DE PORTERÍA
              </span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-700"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="aspect-[4/3] bg-black">
              <img
                src={previewPhoto}
                alt="Foto de acceso"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Resolución de imagen: 1080p FHD</span>
              <span className="text-emerald-400 font-mono">Sincronizado en la Nube</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
