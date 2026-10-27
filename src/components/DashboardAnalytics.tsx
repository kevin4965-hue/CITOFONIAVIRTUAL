import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Clock, TrendingUp, Zap, AlertCircle, ArrowUpRight, BarChart2 } from 'lucide-react';
import { VisitorCall } from '../types/intercom';

export interface DashboardAnalyticsProps {
  callHistory: VisitorCall[];
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ callHistory }) => {
  const [selectedVisitorFilter, setSelectedVisitorFilter] = useState<string>('todos');

  // Hours range from 06:00 to 23:00 (active gate hours)
  const fullHours = useMemo(() => {
    const list: number[] = [];
    for (let i = 6; i <= 23; i++) {
      list.push(i);
    }
    return list;
  }, []);

  // Filter calls if visitor filter is applied
  const filteredCalls = useMemo(() => {
    if (selectedVisitorFilter === 'todos') return callHistory;
    return callHistory.filter((call) => call.visitorType === selectedVisitorFilter);
  }, [callHistory, selectedVisitorFilter]);

  // Aggregate calls per hour of day from callHistory
  const chartData = useMemo(() => {
    // Count per hour
    const countsPerHour: { [hour: number]: { total: number; autorizados: number; rechazados: number } } = {};
    fullHours.forEach((h) => {
      countsPerHour[h] = { total: 0, autorizados: 0, rechazados: 0 };
    });

    filteredCalls.forEach((call) => {
      let callHour: number | null = null;

      if (call.hour !== undefined && call.hour >= 0 && call.hour <= 23) {
        callHour = call.hour;
      } else {
        // Fallback extract from timestamp e.g. "Hoy, 13:42"
        const match = call.timestamp.match(/(\d{1,2}):/);
        if (match) {
          callHour = parseInt(match[1], 10);
        }
      }

      if (callHour !== null && countsPerHour[callHour]) {
        countsPerHour[callHour].total += 1;
        if (call.status === 'authorized') {
          countsPerHour[callHour].autorizados += 1;
        } else {
          countsPerHour[callHour].rechazados += 1;
        }
      }
    });

    // Find the max value to identify peak hour
    let maxCalls = 0;
    fullHours.forEach((h) => {
      if (countsPerHour[h].total > maxCalls) {
        maxCalls = countsPerHour[h].total;
      }
    });

    return fullHours.map((hour) => {
      const label = `${hour.toString().padStart(2, '0')}:00`;
      const stats = countsPerHour[hour];
      const isPeak = maxCalls > 0 && stats.total === maxCalls;

      return {
        hour,
        hora: label,
        llamadas: stats.total,
        autorizados: stats.autorizados,
        rechazados: stats.rechazados,
        isPeak,
      };
    });
  }, [fullHours, filteredCalls]);

  // Metrics summary
  const summary = useMemo(() => {
    let peakEntry = chartData[0];
    let totalLlamadas = 0;

    chartData.forEach((entry) => {
      totalLlamadas += entry.llamadas;
      if (entry.llamadas > peakEntry.llamadas) {
        peakEntry = entry;
      }
    });

    const activeHoursCount = chartData.filter((c) => c.llamadas > 0).length || 1;
    const avgCallsPerHour = (totalLlamadas / activeHoursCount).toFixed(1);

    return {
      peakHour: peakEntry.llamadas > 0 ? `${peakEntry.hora}` : 'Sin datos',
      peakCount: peakEntry.llamadas,
      totalLlamadas,
      avgCallsPerHour,
    };
  }, [chartData]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-base font-bold text-slate-900">
              DashboardAnalytics: Horas Pico de Ingreso por Llamadas
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gráfico de barras analítico que cuantifica las llamadas de citofonía por hora del día desde{' '}
            <span className="font-mono font-semibold text-slate-700">callHistory</span>
          </p>
        </div>

        {/* Filter by visitor type */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Filtrar motivo:</span>
          <select
            value={selectedVisitorFilter}
            onChange={(e) => setSelectedVisitorFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="todos">Todos los motivos ({callHistory.length})</option>
            <option value="domiciliario">Solo Domicilios (Rappi/Didi)</option>
            <option value="invitado">Solo Visitas Familiares</option>
            <option value="paqueteria">Solo Paquetería</option>
            <option value="servicio">Solo Servicios Técnicos</option>
          </select>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Hora Pico Identificada
            </span>
            <div className="text-xl font-extrabold font-mono text-emerald-950 mt-0.5">
              {summary.peakHour} hrs
            </div>
            <span className="text-[10px] text-emerald-700">
              {summary.peakCount} llamadas recibidas en esta franja
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Total Llamadas en Historial
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
              {summary.totalLlamadas} llamadas
            </div>
            <span className="text-[10px] text-slate-500">
              Registros extraídos de la bitácora
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Promedio en Horas Activas
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
              {summary.avgCallsPerHour} llamadas / hr
            </div>
            <span className="text-[10px] text-slate-500">
              Carga operativa de portería
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Recharts BarChart */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="hora"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-bold text-emerald-400">
                          Hora: {label}
                        </span>
                        {data.isPeak && (
                          <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded uppercase">
                            Franja Pico
                          </span>
                        )}
                      </div>
                      <div className="text-slate-200 font-medium">
                        Total llamadas recibidas:{' '}
                        <strong className="text-white font-mono">{data.llamadas}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="text-emerald-400">
                          ✓ {data.autorizados} autorizadas
                        </span>
                        <span className="text-rose-400">
                          ✕ {data.rechazados} rechazadas
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="llamadas" name="Llamadas Recibidas" radius={[5, 5, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`bar-cell-${index}`}
                  fill={entry.isPeak ? '#059669' : entry.llamadas > 0 ? '#0284c7' : '#e2e8f0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Peak Explanation */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600"></span>
            <span className="font-semibold text-emerald-950">Hora Pico Máxima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-600"></span>
            <span>Flujo Habitual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200"></span>
            <span>Sin Llamadas</span>
          </div>
        </div>

        <span className="font-mono text-[11px] text-slate-500">
          Fuente de datos: callHistory en memoria reactiva
        </span>
      </div>
    </div>
  );
};
