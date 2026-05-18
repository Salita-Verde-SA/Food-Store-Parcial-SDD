import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
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
  Cell, 
  Legend 
} from 'recharts';
import { adminApi } from '../../shared/api/admin';
import type { DashboardMetrics } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';

// Mapeo estético de colores para los estados de la FSM
const ESTADOS_COLORS: Record<string, string> = {
  PENDIENTE: '#9ca3af', // Gris
  CONFIRMADO: '#3b82f6', // Azul
  EN_PREP: '#f97316', // Naranja
  EN_CAMINO: '#a855f7', // Púrpura
  ENTREGADO: '#22c55e', // Verde
  CANCELADO: '#ef4444', // Rojo
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

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard Principal" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-500">Cargando analíticas en tiempo real...</span>
        </div>
      </AdminLayout>
    );
  }

  if (isError || !metrics) {
    return (
      <AdminLayout title="Dashboard Principal" subtitle="Resumen analítico y rendimiento de ventas">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4">
          <XCircle className="text-red-500 mx-auto" size={48} />
          <h2 className="text-lg font-extrabold text-red-800">Error al cargar estadísticas</h2>
          <p className="text-xs text-red-600">
            No se pudo establecer conexión con las agregaciones del backend. Por favor verifica que el servidor esté activo.
          </p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl transition-all active:scale-98 cursor-pointer shadow-md shadow-red-600/10"
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
      <div className="flex items-center justify-between bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-100/50 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Actualizando en vivo</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          <span>{isFetching ? 'Actualizando...' : 'Actualizar ahora'}</span>
        </button>
      </div>

      {/* TARJETAS MÉTRICAS (GRID 4 COLUMNAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Facturación */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Facturación Total</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-xs">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-gray-800">{formatCurrency(metrics.ingresos_totales)}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +12.5%
              </span>
              <span className="text-[9px] text-gray-400">vs semana anterior</span>
            </div>
          </div>
        </div>

        {/* Cantidad de Pedidos */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Pedidos Totales</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-xs">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-gray-800">{totalPedidos}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +8.3%
              </span>
              <span className="text-[9px] text-gray-400">órdenes despachadas</span>
            </div>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Ticket Promedio</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shadow-xs">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-gray-800">{formatCurrency(ticketPromedio)}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowUpRight size={10} /> +4.2%
              </span>
              <span className="text-[9px] text-gray-400">valor de consumo medio</span>
            </div>
          </div>
        </div>

        {/* Productos Destacados */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Productos Top</span>
            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center shadow-xs">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-gray-800">{metrics.top_productos.length}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowUpRight size={10} /> Líderes
              </span>
              <span className="text-[9px] text-gray-400">platos más demandados</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS (ÁREA Y TORTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas Históricas por Día (2/3 de ancho) */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-gray-800">Histórico de Facturación</h4>
              <p className="text-[10px] text-gray-400">Análisis temporal de ingresos y volumen de transacciones por día</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-xl">
              <Activity size={14} className="text-orange-500" />
              <span>Gráfico Spline</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {metrics.evolucion_ventas.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Sin datos transaccionales históricos para el rango de fechas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.evolucion_ventas} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="fecha" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 600 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1f2937' }}
                    itemStyle={{ fontSize: '10px', color: '#f97316', fontWeight: 'bold' }}
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Ventas']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#f97316" 
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
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-gray-800">Pedidos por Estado</h4>
              <p className="text-[10px] text-gray-400">Distribución de las órdenes según el flujo FSM</p>
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-gray-400">Sin datos operativos de pedidos registrados.</div>
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
                      <Cell key={`cell-${index}`} fill={ESTADOS_COLORS[entry.name] || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #f3f4f6' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Leyenda manual super estética */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-gray-600 border-t border-gray-50 pt-3">
            {Object.entries(metrics.pedidos_por_estado || {}).map(([estado, cantidad], idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: ESTADOS_COLORS[estado] || '#cbd5e1' }}
                ></span>
                <span className="truncate">{estado}: {cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEED OPERATIVO / ACTIVIDAD DE PEDIDOS */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
          <div>
            <h4 className="text-sm font-extrabold text-gray-800">Estado Operativo de las Órdenes</h4>
            <p className="text-[10px] text-gray-400">Distribución de las órdenes de hoy por canal de entrega</p>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
            <Clock size={10} /> Canal Activo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-50 p-4 rounded-2xl flex items-center justify-between bg-gray-50/50">
            <div>
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block">Entrega por Delivery</span>
              <span className="text-lg font-black text-gray-800 mt-1 block">
                {totalPedidos} órdenes
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              FS
            </div>
          </div>

          <div className="border border-gray-50 p-4 rounded-2xl flex items-center justify-between bg-gray-50/50">
            <div>
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block">Satisfacción Operativa</span>
              <span className="text-lg font-black text-gray-800 mt-1 block">98.4%</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
