import React, { useState } from 'react';
import {
  PhoneCall,
  Globe,
  Wrench,
  Shield,
  FileText,
  DollarSign,
  TrendingDown,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Calculator
} from 'lucide-react';

export const ComparativeAnalysis: React.FC = () => {
  // Calculator state
  const [apartmentCount, setApartmentCount] = useState<number>(120);
  const [costPerUnitMonth, setCostPerUnitMonth] = useState<number>(2500); // COP per apt/month
  const [traditionalInstallationCost, setTraditionalInstallationCost] = useState<number>(18000000); // 18M COP
  const [traditionalYearlyMaintenance, setTraditionalYearlyMaintenance] = useState<number>(4200000); // 4.2M COP/year

  // Calculations
  const virtualYearlyCost = apartmentCount * costPerUnitMonth * 12;
  const year1TraditionalCost = traditionalInstallationCost + traditionalYearlyMaintenance;
  const year1VirtualCost = virtualYearlyCost;
  const year1Savings = year1TraditionalCost - year1VirtualCost;

  const threeYearTraditional = traditionalInstallationCost + traditionalYearlyMaintenance * 3;
  const threeYearVirtual = virtualYearlyCost * 3;
  const threeYearSavings = threeYearTraditional - threeYearVirtual;

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const comparisonRows = [
    {
      feature: 'Instalación & Despliegue',
      traditional: {
        title: 'Obras civiles invasivas',
        desc: 'Requiere perforación de muros, ducterías, canaletas y tendido de cientos de metros de cables de cobre por shafts y pasillos hasta cada apartamento. Demora de 2 a 4 semanas.',
        bad: true,
      },
      virtual: {
        title: '100% Digital e Inalámbrica',
        desc: 'Cero cables internos. Se implementa en menos de 24 horas configurando el directorio en la nube. Solo requiere una tableta o consola en la portería con internet.',
        bad: false,
      },
    },
    {
      feature: 'Ubicación & Cobertura',
      traditional: {
        title: 'Solo físicamente en el inmueble',
        desc: 'Si el copropietario o arrendatario está en el trabajo, en la calle o de viaje, no puede contestar al citófono ni autorizar visitas o recibir domicilios importantes.',
        bad: true,
      },
      virtual: {
        title: 'Gestión Remota Global',
        desc: 'El residente responde directamente en su teléfono celular o fijo desde cualquier lugar del mundo mediante llamada telefónica GSM directa o aplicación móvil.',
        bad: false,
      },
    },
    {
      feature: 'Mantenimiento & Desgaste',
      traditional: {
        title: 'Costoso y recurrente',
        desc: 'Sulfatado de cables, interferencias de audio, ruidos de estática, sobrecargas eléctricas que queman tableros y repuestos físicos continuos.',
        bad: true,
      },
      virtual: {
        title: 'Cero hardware interno',
        desc: 'No hay cables que se sulfaten ni aparatos dentro de los apartamentos. Las actualizaciones son automáticas en la nube sin costos sorpresa de fontanería o cableado.',
        bad: false,
      },
    },
    {
      feature: 'Seguridad y Privacidad',
      traditional: {
        title: 'Listas en papel expuestas',
        desc: 'Los vigilantes suelen tener cuadernos o carpetas con los nombres completos, teléfonos personales y cédulas expuestos a la vista de cualquier visitante en la ventanilla.',
        bad: true,
      },
      virtual: {
        title: 'Enmascaramiento de Números',
        desc: 'El vigilante digita "Torre 2 - 402" y el sistema genera la llamada sin revelar el número personal del residente. Cumple estrictamente con la Ley Habeas Data 1581 y GDPR.',
        bad: false,
      },
    },
    {
      feature: 'Trazabilidad & Auditoría',
      traditional: {
        title: 'Sin registro ni evidencia',
        desc: 'No queda constancia digital de quién autorizó un ingreso, a qué hora exacta timbró el citófono o si la llamada fue rechazada.',
        bad: true,
      },
      virtual: {
        title: 'Bitácora Digital Forense',
        desc: 'Historial digital en tiempo real con fecha, hora exacta, duración, fotografías del visitante capturadas por la cámara y registro de autorización.',
        bad: false,
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Introduction Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transformación PropTech para Propiedad Horizontal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Citofonía Tradicional vs. Citofonía Virtual en la Nube
          </h2>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            La citofonía virtual elimina por completo la infraestructura de cableado físico entre la
            portería y los apartamentos. Conoce por qué los conjuntos residenciales modernos en Colombia
            y Latinoamérica están migrando a soluciones 100% digitales.
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            Matriz Comparativa de Características
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluación técnica, operativa y de seguridad entre ambos modelos
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                <th className="py-3.5 px-5 font-bold uppercase tracking-wider text-[11px] w-1/4">
                  Criterio de Evaluación
                </th>
                <th className="py-3.5 px-5 font-bold text-rose-900 bg-rose-50/50 w-3/8">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-rose-600" />
                    <span>Citofonía Tradicional 📞</span>
                  </div>
                </th>
                <th className="py-3.5 px-5 font-bold text-emerald-950 bg-emerald-50/60 w-3/8">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Citofonía Virtual en la Nube 🌐</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5 font-bold text-slate-900 align-top">
                    {row.feature}
                  </td>
                  <td className="py-4 px-5 bg-rose-50/20 align-top">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-950 mb-1">
                          {row.traditional.title}
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {row.traditional.desc}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 bg-emerald-50/30 align-top">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-emerald-950 mb-1">
                          {row.virtual.title}
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {row.virtual.desc}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Savings & ROI Calculator */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Calculadora de Inversión y Ahorro para Copropiedades
            </h3>
            <p className="text-xs text-slate-500">
              Simula el retorno de inversión al migrar de citofonía física a citofonía virtual
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-slate-100">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Número de Apartamentos:</span>
                <span className="font-mono text-emerald-700 text-sm font-bold">
                  {apartmentCount} unidades
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="400"
                step="10"
                value={apartmentCount}
                onChange={(e) => setApartmentCount(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>30 aptos</span>
                <span>200 aptos</span>
                <span>400 aptos</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Costo Suscripción Virtual (por apto/mes):</span>
                <span className="font-mono text-slate-900 font-bold">
                  {formatCOP(costPerUnitMonth)} COP
                </span>
              </div>
              <input
                type="range"
                min="1800"
                max="4500"
                step="100"
                value={costPerUnitMonth}
                onChange={(e) => setCostPerUnitMonth(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>$1.800 COP</span>
                <span>$2.500 COP</span>
                <span>$4.500 COP</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span>Cotización obra civil / cableado físico:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCOP(traditionalInstallationCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mantenimiento anual cables tradicionales:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCOP(traditionalYearlyMaintenance)}
                </span>
              </div>
            </div>
          </div>

          {/* Results Column (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 text-white rounded-xl p-5 space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Proyección Financiera para el Consejo de Administración
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">Ahorro en el Año 1</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatCOP(year1Savings)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Evita el 100% de la cuota extraordinaria de cableado
                </span>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">Ahorro Proyectado a 3 Años</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatCOP(threeYearSavings)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Comparado contra reparaciones continuas
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Costo mensual total conjunto (Citofonía Virtual):</span>
                <span className="font-mono font-bold text-white">
                  {formatCOP(apartmentCount * costPerUnitMonth)} COP / mes
                </span>
              </div>
              <div className="flex justify-between">
                <span>Costo anual total conjunto:</span>
                <span className="font-mono font-bold text-white">
                  {formatCOP(virtualYearlyCost)} COP / año
                </span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Tiempo estimado de puesta en marcha:</span>
                <span>Menos de 24 horas (Inmediato)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ecosystem Suppliers Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-xs text-slate-600">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
          Proveedores y Ecosistema de Citofonía Virtual en Latinoamérica
        </h4>
        <p className="leading-relaxed">
          En Colombia y la región existen plataformas reconocidas de software inmobiliario como{' '}
          <strong>Citofy, Munily, KaiLiving o Vecindapp</strong>, que ofrecen integración con operadores
          de telefonía celular (Tigo, Claro, Movistar) para enrutamiento PSTN de respaldo (llamadas
          convencionales a celulares para copropietarios de la tercera edad sin smartphones), además de
          cerraduras inteligentes (IoT) y tótems de auto-registro en recepción.
        </p>
      </div>
    </div>
  );
};
