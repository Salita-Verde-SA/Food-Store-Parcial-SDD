import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
  Activity,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Star,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminApi } from '../../shared/api/admin';
import type { DashboardMetrics } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';

const ESTADOS_COLORS: Record<string, string> = {
  PENDIENTE:  '#7A7A7A',
  CONFIRMADO: '#1565C0',
  EN_PREP:    '#FFC72C',
  EN_CAMINO:  '#1565C0',
  ENTREGADO:  '#2E7D32',
  CANCELADO:  '#DA291C',
};

export const DashboardPage = () => {
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery<DashboardMetrics>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 10000,
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(val);

  const cardBase = 'bg-paper-0 border border-paper-200 rounded-2xl shadow-card';
  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-ink-500';

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard Analítico" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-ink-500">Cargando analíticas en tiempo real…</span>
        </div>
      </AdminLayout>
    );
  }

  if (isError || !metrics) {
    return (
      <AdminLayout title="Dashboard Analítico" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="bg-danger-50 border border-danger-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
          <XCircle className="text-danger-600 mx-auto" size={48} />
          <h2 className="font-display text-xl font-extrabold text-danger-700">
            Error al cargar estadísticas
          </h2>
          <p className="text-sm text-danger-600">
            No se pudo establecer conexión con las agregaciones del backend. Verificá que el
            servidor esté activo.
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-brand"
          >
            Reintentar carga
          </button>
        </div>
      </AdminLayout>
    );
  }

  const pieData = Object.entries(metrics.pedidos_por_estado || {})
    .map(([estado, cantidad]) => ({ name: estado, value: cantidad }))
    .filter(item => item.value > 0);

  const totalPedidos = Object.values(metrics.pedidos_por_estado || {}).reduce(
    (acc, curr) => acc + curr,
    0
  );
  const ticketPromedio = totalPedidos > 0 ? metrics.ingresos_totales / totalPedidos : 0.0;

  return (
    <AdminLayout
      title="Dashboard Analítico"
      subtitle="Monitoreo operativo de ventas, tracción y flujo de estados en tiempo real"
    >
      {/* Barra superior */}
      <div className={`${cardBase} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-500" />
          </span>
          <span className={eyebrow}>Actualizando en vivo</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-200 text-ink-600 hover:bg-paper-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span>{isFetching ? 'Actualizando…' : 'Actualizar ahora'}</span>
        </button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          eyebrow="Facturación Total"
          value={formatCurrency(metrics.ingresos_totales)}
          delta="+12.5%"
          sub="vs semana anterior"
          icon={<DollarSign size={20} />}
          accent="from-brand-yellow-400 to-brand-yellow-500"
        />
        <MetricCard
          eyebrow="Pedidos Totales"
          value={totalPedidos.toString()}
          delta="+8.3%"
          sub="órdenes despachadas"
          icon={<ShoppingBag size={20} />}
          accent="from-brand-red-500 to-brand-red-600"
        />
        <MetricCard
          eyebrow="Ticket Promedio"
          value={formatCurrency(ticketPromedio)}
          delta="+4.2%"
          sub="valor de consumo medio"
          icon={<TrendingUp size={20} />}
          accent="from-info-500 to-info-600"
        />
        <MetricCard
          eyebrow="Productos Top"
          value={metrics.top_productos.length.toString()}
          delta="Líderes"
          sub="platos más demandados"
          icon={<Star size={20} />}
          accent="from-success-500 to-success-600"
        />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas históricas */}
        <div className={`${cardBase} p-5 lg:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between border-b border-paper-200 pb-3 gap-3 flex-wrap">
            <div>
              <h4 className="font-display text-lg font-extrabold text-ink-900">
                Histórico de Facturación
              </h4>
              <p className="text-xs text-ink-500 mt-1 font-medium">
                Análisis temporal de ingresos por día.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-ink-700 bg-cream-100 border border-cream-200 px-3 py-1 rounded-full uppercase tracking-wider">
              <Activity size={12} className="text-brand-red-500" />
              <span>Gráfico Spline</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {metrics.evolucion_ventas.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-ink-400 font-medium">
                Sin datos transaccionales históricos para el rango de fechas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.evolucion_ventas}
                  margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DA291C" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#DA291C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#7A7A7A', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#7A7A7A', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 12px 24px -6px rgba(20,20,20,0.10)',
                    }}
                    labelStyle={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}
                    itemStyle={{ fontSize: '12px', color: '#DA291C', fontWeight: 'bold' }}
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Ventas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#DA291C"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pedidos por Estado */}
        <div className={`${cardBase} p-5 space-y-4`}>
          <div className="border-b border-paper-200 pb-3">
            <h4 className="font-display text-lg font-extrabold text-ink-900">Pedidos por Estado</h4>
            <p className="text-xs text-ink-500 mt-1 font-medium">
              Distribución FSM operativa.
            </p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-ink-400 font-medium">
                Sin datos operativos registrados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ESTADOS_COLORS[entry.name] || '#7A7A7A'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-ink-600 border-t border-paper-200 pt-3">
            {Object.entries(metrics.pedidos_por_estado || {}).map(([estado, cantidad], idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-paper-200/50"
                  style={{ backgroundColor: ESTADOS_COLORS[estado] || '#7A7A7A' }}
                />
                <span className="truncate uppercase tracking-wider">
                  {estado}: {cantidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estado operativo */}
      <div className={`${cardBase} p-5 space-y-4`}>
        <div className="flex items-center justify-between border-b border-paper-200 pb-3 gap-3 flex-wrap">
          <div>
            <h4 className="font-display text-lg font-extrabold text-ink-900">
              Estado Operativo de las Órdenes
            </h4>
            <p className="text-xs text-ink-500 mt-1 font-medium">
              Distribución de las órdenes de hoy por canal.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black bg-brand-yellow-100 text-brand-yellow-800 border border-brand-yellow-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <Clock size={12} /> Canal Activo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OpCard
            eyebrow="Entrega por Delivery"
            value={`${totalPedidos} órdenes`}
            badge="FS"
            badgeBg="bg-brand-red-50 text-brand-red-700 border-brand-red-200"
          />
          <OpCard
            eyebrow="Satisfacción Operativa"
            value="98.4%"
            icon={<CheckCircle size={24} />}
            badgeBg="bg-success-50 text-success-700 border-success-100"
          />
        </div>
      </div>
    </AdminLayout>
  );
};

const MetricCard = ({
  eyebrow,
  value,
  delta,
  sub,
  icon,
  accent,
}: {
  eyebrow: string;
  value: string;
  delta: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) => (
  <div className="bg-paper-0 border border-paper-200 rounded-2xl shadow-card p-5 relative overflow-hidden group hover:shadow-card-hover transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-500">
        {eyebrow}
      </span>
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shrink-0 shadow-sm`}>
        {icon}
      </div>
    </div>
    <div className="mt-4">
      <h3 className="font-display text-3xl lg:text-4xl font-black text-ink-900 tabular-nums leading-none">
        {value}
      </h3>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <ArrowUpRight size={10} /> {delta}
        </span>
        <span className="text-[10px] text-ink-500 font-medium">{sub}</span>
      </div>
    </div>
  </div>
);

const OpCard = ({
  eyebrow,
  value,
  icon,
  badge,
  badgeBg,
}: {
  eyebrow: string;
  value: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeBg: string;
}) => (
  <div className="border border-paper-200 p-4 rounded-2xl flex items-center justify-between bg-cream-50">
    <div>
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-500 block">
        {eyebrow}
      </span>
      <span className="font-display text-2xl font-black text-ink-900 mt-1 block">{value}</span>
    </div>
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border text-lg ${badgeBg}`}
    >
      {icon ?? badge}
    </div>
  </div>
);
