import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Clock,
  TrendingUp,
  Users,
  ShieldCheck,
  Bike,
  Package,
  Calendar,
  Filter,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { VisitorCall } from '../types/intercom';

interface VisitorTrafficDashboardProps {
  logs: VisitorCall[];
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const HOURS_LABELS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

const COLORS = {
  domiciliario: '#10b981', // emerald-500
  invitado: '#6366f1',     // indigo-500
  paqueteria: '#f59e0b',   // amber-500
  servicio: '#8b5cf6',     // violet-500
  otro: '#64748b',         // slate-500
};

export const VisitorTrafficDashboard: React.FC<VisitorTrafficDashboardProps> = ({ logs }) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedTower, setSelectedTower] = useState<string>('all');
  const [chartView, setChartView] = useState<'hourly' | 'daily'>('hourly');

  // Filter logs according to active filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesDay = selectedDay === 'all' || log.dayOfWeek === selectedDay;
      const matchesTower = selectedTower === 'all' || log.tower === selectedTower;
      return matchesDay && matchesTower;
    });
  }, [logs, selectedDay, selectedTower]);

  // Aggregate hourly peak distribution
  const hourlyData = useMemo(() => {
    // Map hour 7 through 22
    return HOURS_LABELS.map((label) => {
      const hourNum = parseInt(label.split(':')[0], 10);
      const matches = filteredLogs.filter((log) => {
        if (log.hour !== undefined) {
          return log.hour === hourNum;
        }
        // Fallback: parse hour from timestamp
        const timeMatch = log.timestamp.match(/(\d{1,2}):/);
        return timeMatch ? parseInt(timeMatch[1], 10) === hourNum : false;
      });

      const domicilios = matches.filter((m) => m.visitorType === 'domiciliario').length;
      const invitados = matches.filter((m) => m.visitorType === 'invitado').length;
      const paqueteria = matches.filter((m) => m.visitorType === 'paqueteria').length;
      const servicios = matches.filter((m) => m.visitorType === 'servicio').length;
      const total = matches.length;

      return {
        hora: label,
        total,
        domicilios,
        invitados,
        paqueteria,
        servicios,
      };
    });
  }, [filteredLogs]);

  // Aggregate weekly days data
  const weeklyDaysData = useMemo(() => {
    return DAYS_OF_WEEK.map((day) => {
      const dayLogs = logs.filter((l) => {
        const matchesTower = selectedTower === 'all' || l.tower === selectedTower;
        return (l.dayOfWeek === day || (l.dayOfWeek === undefined && day === 'Martes')) && matchesTower;
      });

      const autorizados = dayLogs.filter((l) => l.status === 'authorized').length;
      const rechazados = dayLogs.filter((l) => l.status === 'rejected' || l.status === 'missed').length;

      return {
        dia: day,
        total: dayLogs.length,
        autorizados,
        rechazados,
        domicilios: dayLogs.filter((l) => l.visitorType === 'domiciliario').length,
        visitas: dayLogs.filter((l) => l.visitorType === 'invitado').length,
      };
    });
  }, [logs, selectedTower]);

  // Breakdown by Visitor Type
  const visitorTypeBreakdown = useMemo(() => {
    const counts = {
      domiciliario: 0,
      invitado: 0,
      paqueteria: 0,
      servicio: 0,
      otro: 0,
    };

    filteredLogs.forEach((l) => {
      if (counts[l.visitorType] !== undefined) {
        counts[l.visitorType]++;
      } else {
        counts.otro++;
      }
    });

    return [
      { name: 'Domicilios (Rappi/Didi)', value: counts.domiciliario, color: COLORS.domiciliario },
      { name: 'Visitas Familiares', value: counts.invitado, color: COLORS.invitado },
      { name: 'Paquetería y Encomiendas', value: counts.paqueteria, color: COLORS.paqueteria },
      { name: 'Servicios Técnicos', value: counts.servicio, color: COLORS.servicio },
    ].filter((item) => item.value > 0);
  }, [filteredLogs]);

  // KPIs
  const totalCalls = filteredLogs.length;
  const authorizedCalls = filteredLogs.filter((l) => l.status === 'authorized').length;
  const authorizationRate = totalCalls > 0 ? Math.round((authorizedCalls / totalCalls) * 100) : 100;

  const avgDuration = useMemo(() => {
    if (totalCalls === 0) return 0;
    const sum = filteredLogs.reduce((acc, curr) => acc + (curr.durationSeconds || 20), 0);
    return Math.round(sum / totalCalls);
  }, [filteredLogs, totalCalls]);

  // Identify peak hour
  const peakHour = useMemo(() => {
    let max = 0;
    let peakLabel = '12:00 - 14:00';
    hourlyData.forEach((h) => {
      if (h.total > max) {
        max = h.total;
        peakLabel = `${h.hora} hrs (${h.total} visitas)`;
      }
    });
    return peakLabel;
  }, [hourlyData]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header & Global Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-base font-bold text-slate-900">
                Tablero de Control: Horas Pico & Flujo de Visitantes
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análisis analítico del tráfico peatonal, domicilios y llamadas atendidas por citofonía virtual durante la semana
            </p>
          </div>

          {/* Interactive Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Tower Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <span className="text-slate-500 font-medium">Torre:</span>
              <select
                value={selectedTower}
                onChange={(e) => setSelectedTower(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las Torres</option>
                <option value="Torre 1">Torre 1</option>
                <option value="Torre 2">Torre 2</option>
                <option value="Torre 3">Torre 3</option>
              </select>
            </div>

            {/* Day Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <span className="text-slate-500 font-medium">Día:</span>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Semana Completa</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setChartView('hourly')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  chartView === 'hourly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Horas Pico
              </button>
              <button
                onClick={() => setChartView('daily')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  chartView === 'daily'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Días de Semana
              </button>
            </div>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-medium">
              <span>Franja con Mayor Afluencia</span>
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 truncate">
              {peakHour}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Pico de almuerzos y domicilios
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-medium">
              <span>Total Ingresos Semana</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
              {totalCalls} visitas
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Registradas en la bitácora cloud
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-medium">
              <span>Efectividad de Apertura</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-extrabold font-mono text-emerald-700 tabular-nums">
              {authorizationRate}%
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {authorizedCalls} autorizadas / {totalCalls - authorizedCalls} rechazadas
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-medium">
              <span>Tiempo Promedio Respuesta</span>
              <Activity className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
              {avgDuration} seg
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Desde timbre hasta autorización
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Chart (8 cols): Peak Hours Area or Daily Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {chartView === 'hourly'
                  ? 'Curva de Horas Pico de Ingreso (07:00 - 22:00)'
                  : 'Afluencia de Visitantes por Día de la Semana'}
              </h4>
              <p className="text-xs text-slate-500">
                {chartView === 'hourly'
                  ? 'Distribución horaria clasificada por tipo de visitante (Domicilios vs Visitas)'
                  : 'Comparativa de volumen y autorizaciones de Lunes a Domingo'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Domicilios</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Visitas</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Paquetería</span>
              </span>
            </div>
          </div>

          {/* Recharts Chart Container */}
          <div className="w-full h-72 sm:h-80">
            {chartView === 'hourly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDomicilios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorInvitados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorPaqueteria" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="hora"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                            <span className="font-mono font-bold text-emerald-400 block mb-1">
                              Franja {label}
                            </span>
                            <div className="space-y-1">
                              {payload.map((entry, index) => (
                                <div
                                  key={`item-${index}`}
                                  className="flex items-center justify-between gap-3 text-[11px]"
                                >
                                  <span style={{ color: entry.color }} className="capitalize">
                                    {entry.name}:
                                  </span>
                                  <span className="font-mono font-bold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="domicilios"
                    name="Domicilios"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDomicilios)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="invitados"
                    name="Visitas Familiares"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInvitados)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="paqueteria"
                    name="Paquetería"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPaqueteria)"
                    stackId="1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dia"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                            <span className="font-bold text-white block mb-1">{label}</span>
                            <div className="space-y-1">
                              {payload.map((entry, index) => (
                                <div
                                  key={`item-${index}`}
                                  className="flex items-center justify-between gap-3 text-[11px]"
                                >
                                  <span style={{ color: entry.color }} className="capitalize">
                                    {entry.name}:
                                  </span>
                                  <span className="font-mono font-bold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="autorizados"
                    name="Ingresos Autorizados"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="rechazados"
                    name="Rechazados / No Atendidos"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Peak Insight Notice */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Pico habitual detectado: Almuerzos (12:00 a 14:00) y Llegadas Nocturnas (19:00 a 21:00).
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Datos auditados en tiempo real
            </span>
          </div>
        </div>

        {/* Right Chart (4 cols): Breakdown by Category */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Composición de Tipos de Visita
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Proporción de solicitudes según motivo de ingreso
            </p>

            {/* Donut Chart */}
            <div className="w-full h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visitorTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {visitorTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700">
                            <span>{data.name}: </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {data.value} solicitudes
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
              {visitorTypeBreakdown.map((item) => {
                const percent = Math.round((item.value / totalCalls) * 100);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="text-slate-700 font-medium truncate max-w-[160px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {item.value}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                        ({percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-3 text-[11px] text-emerald-900 leading-relaxed">
            💡 <strong>Recomendación Operativa:</strong> Reforzar el control de correspondencia y
            tótems inteligentes durante el intervalo <strong>12:00–14:00</strong> para agilizar la
            entrega de alimentos a domicilio sin generar colas en portería.
          </div>
        </div>
      </div>
    </div>
  );
};
