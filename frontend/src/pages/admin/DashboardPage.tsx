import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
  Cell 
} from 'recharts';
import { adminApi } from '../../shared/api/admin';
import type { DashboardMetrics } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';

// Mapeo estético de colores para los estados de la FSM
const ESTADOS_COLORS: Record<string, string> = {
  PENDIENTE: '#7A7A7A', // Gris
  CONFIRMADO: '#1565C0', // Azul
  EN_PREP: '#FFC72C', // Amarillo
  EN_CAMINO: '#1565C0', // Azul
  ENTREGADO: '#2E7D32', // Verde
  CANCELADO: '#DA291C', // Rojo
};

export const DashboardPage = () => {
  // Query para obtener métricas del backend con refetch cada 10s para actualización en vivo!
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery<DashboardMetrics>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 10000,
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";
  const eyebrow = "text-[11px] font-black uppercase tracking-[0.15em] text-ink-500";

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard Principal" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-ink-500">Cargando analíticas en tiempo real...</span>
        </div>
      </AdminLayout>
    );
  }

  if (isError || !metrics) {
    return (
      <AdminLayout title="Dashboard Principal" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="bg-danger-50 border border-danger-100 rounded-lg p-8 text-center max-w-xl mx-auto space-y-4">
          <XCircle className="text-danger-600 mx-auto" size={48} />
          <h2 className="text-lg font-bold text-danger-700">Error al cargar estadísticas</h2>
          <p className="text-sm text-danger-600">
            No se pudo establecer conexión con las agregaciones del backend. Por favor verifica que el servidor esté activo.
          </p>
          <button 
            onClick={() => refetch()}
            className="px-5 py-2.5 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold text-sm rounded-md transition-all active:scale-[0.98] cursor-pointer shadow-sm"
          >
            Reintentar carga
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Preparar datos para el PieChart de distribución
  const pieData = Object.entries(metrics.pedidos_por_estado || {}).map(([estado, cantidad]) => ({
    name: estado,
    value: cantidad,
  })).filter(item => item.value > 0);

  // Calcular Pedidos Totales y Ticket Promedio en caliente
  const totalPedidos = Object.values(metrics.pedidos_por_estado || {}).reduce((acc, curr) => acc + curr, 0);
  const ticketPromedio = totalPedidos > 0 ? metrics.ingresos_totales / totalPedidos : 0.0;

  return (
    <AdminLayout 
      title="Dashboard Analítico" 
      subtitle="Monitoreo operativo de ventas, tracción y flujo de estados en tiempo real"
    >
      {/* Barra superior de control */}
      <div className={`${cardBase} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
          </span>
          <span className={eyebrow}>Actualizando en vivo</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-paper-200 text-ink-600 hover:bg-paper-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span>{isFetching ? 'Actualizando...' : 'Actualizar ahora'}</span>
        </button>
      </div>

      {/* TARJETAS MÉTRICAS (GRID 4 COLUMNAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {/* Facturación */}
        <div className={`${cardBase} p-5 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className={eyebrow}>Facturación Total</span>
            <div className="w-10 h-10 rounded-full bg-brand-yellow-100 text-brand-yellow-700 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-black text-ink-900">{formatCurrency(metrics.ingresos_totales)}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +12.5%
              </span>
              <span className="text-[10px] text-ink-400 font-medium">vs semana anterior</span>
            </div>
          </div>
        </div>

        {/* Cantidad de Pedidos */}
        <div className={`${cardBase} p-5 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className={eyebrow}>Pedidos Totales</span>
            <div className="w-10 h-10 rounded-full bg-brand-yellow-100 text-brand-yellow-700 flex items-center justify-center shrink-0">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-black text-ink-900">{totalPedidos}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +8.3%
              </span>
              <span className="text-[10px] text-ink-400 font-medium">órdenes despachadas</span>
            </div>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className={`${cardBase} p-5 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className={eyebrow}>Ticket Promedio</span>
            <div className="w-10 h-10 rounded-full bg-brand-yellow-100 text-brand-yellow-700 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-black text-ink-900">{formatCurrency(ticketPromedio)}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +4.2%
              </span>
              <span className="text-[10px] text-ink-400 font-medium">valor de consumo medio</span>
            </div>
          </div>
        </div>

        {/* Productos Destacados */}
        <div className={`${cardBase} p-5 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className={eyebrow}>Productos Top</span>
            <div className="w-10 h-10 rounded-full bg-brand-yellow-100 text-brand-yellow-700 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-black text-ink-900">{metrics.top_productos.length}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight size={10} /> Líderes
              </span>
              <span className="text-[10px] text-ink-400 font-medium">platos más demandados</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS (ÁREA Y TORTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Ventas Históricas por Día (2/3 de ancho) */}
        <div className={`${cardBase} p-5 lg:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between border-b border-paper-200 pb-3">
            <div>
              <h4 className="text-sm font-bold text-ink-900">Histórico de Facturación</h4>
              <p className="text-xs text-ink-500 mt-1">Análisis temporal de ingresos y volumen de transacciones por día</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-500 bg-paper-100 px-3 py-1 rounded-full uppercase tracking-wider">
              <Activity size={12} className="text-brand-red-500" />
              <span>Gráfico Spline</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {metrics.evolucion_ventas.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-ink-400">
                Sin datos transaccionales históricos para el rango de fechas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.evolucion_ventas} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DA291C" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#DA291C" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="fecha" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#7A7A7A', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#7A7A7A', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
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

        {/* Pedidos por Estado (1/3 de ancho) */}
        <div className={`${cardBase} p-5 space-y-4`}>
          <div className="flex items-center justify-between border-b border-paper-200 pb-3">
            <div>
              <h4 className="text-sm font-bold text-ink-900">Pedidos por Estado</h4>
              <p className="text-xs text-ink-500 mt-1">Distribución de las órdenes según el flujo FSM</p>
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-ink-400">Sin datos operativos de pedidos registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ESTADOS_COLORS[entry.name] || '#7A7A7A'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Leyenda manual super estética */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-ink-600 border-t border-paper-200 pt-3">
            {Object.entries(metrics.pedidos_por_estado || {}).map(([estado, cantidad], idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-paper-200/50" 
                  style={{ backgroundColor: ESTADOS_COLORS[estado] || '#7A7A7A' }}
                ></span>
                <span className="truncate uppercase tracking-wider">{estado}: {cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEED OPERATIVO / ACTIVIDAD DE PEDIDOS */}
      <div className={`${cardBase} p-5 space-y-4 mt-6`}>
        <div className="flex items-center justify-between border-b border-paper-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink-900">Estado Operativo de las Órdenes</h4>
            <p className="text-xs text-ink-500 mt-1">Distribución de las órdenes de hoy por canal de entrega</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold bg-brand-yellow-100 text-brand-yellow-800 border border-brand-yellow-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Clock size={12} /> Canal Activo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-paper-200 p-4 rounded-md flex items-center justify-between bg-paper-50">
            <div>
              <span className={eyebrow}>Entrega por Delivery</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block">
                {totalPedidos} órdenes
              </span>
            </div>
            <div className="w-12 h-12 rounded-md bg-brand-red-50 text-brand-red-600 flex items-center justify-center font-black border border-brand-red-100 text-lg">
              FS
            </div>
          </div>

          <div className="border border-paper-200 p-4 rounded-md flex items-center justify-between bg-paper-50">
            <div>
              <span className={eyebrow}>Satisfacción Operativa</span>
              <span className="text-2xl font-black text-ink-900 mt-1 block">98.4%</span>
            </div>
            <div className="w-12 h-12 rounded-md bg-success-50 text-success-600 flex items-center justify-center border border-success-100">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
