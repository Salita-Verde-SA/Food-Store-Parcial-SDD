import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  ShoppingBag, 
  Receipt, 
  LogOut, 
  Menu, 
  X,
  Cookie,
  Search,
  Filter,
  ArrowRight,
  XCircle,
  Clock,
  MapPin,
  CheckCircle,
  Truck,
  Store,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

import { useAuthStore } from '../../shared/stores/authStore';
import { pedidosApi } from '../../shared/api/pedidos';
import type { Pedido, EstadoPedido } from '../../shared/types';

export const PedidosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filtros reactivos locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedTipoEntrega, setSelectedTipoEntrega] = useState<string>('TODOS');
  
  // Acordeón de detalles
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  // Estados para Modal de Avanzar Estado
  const [advancePedido, setAdvancePedido] = useState<Pedido | null>(null);
  const [advanceMotivo, setAdvanceMotivo] = useState('');
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // Estados para Modal de Cancelar Pedido (Operativo)
  const [cancelPedidoId, setCancelPedidoId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Query - Obtener todos los pedidos
  const { data: pedidosData, isLoading, isError } = useQuery<any>({
    queryKey: ['admin-pedidos'],
    queryFn: pedidosApi.getPedidos,
    refetchInterval: 5000, // Actualización administrativa en vivo cada 5s!
  });

  const pedidos: Pedido[] = Array.isArray(pedidosData)
    ? pedidosData
    : pedidosData?.items || [];

  // Mutación - Avanzar Estado
  const advanceMutation = useMutation({
    mutationFn: ({ id, nuevo_estado, motivo }: { id: number; nuevo_estado: EstadoPedido; motivo?: string }) => 
      pedidosApi.avanzarEstado(id, { nuevo_estado, motivo: motivo?.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
      setAdvancePedido(null);
      setAdvanceMotivo('');
      setAdvanceError(null);
    },
    onError: (err: any) => {
      setAdvanceError(err.detail || 'Ocurrió un error al avanzar el estado.');
    }
  });

  // Mutación - Cancelar Pedido
  const cancelMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => 
      pedidosApi.cancelarPedido(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
      setCancelPedidoId(null);
      setCancelMotivo('');
      setCancelError(null);
    },
    onError: (err: any) => {
      setCancelError(err.detail || 'Ocurrió un error al cancelar el pedido.');
    }
  });

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar tu sesión de Food Store?')) {
      logout();
      navigate('/login');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper: Calcular el siguiente estado lógico
  const getNextLogicalState = (current: EstadoPedido): EstadoPedido | null => {
    switch (current) {
      case 'PENDIENTE': return 'CONFIRMADO';
      case 'CONFIRMADO': return 'EN_PREP';
      case 'EN_PREP': return 'EN_CAMINO';
      case 'EN_CAMINO': return 'ENTREGADO';
      default: return null; // ENTREGADO o CANCELADO no se pueden avanzar
    }
  };

  // Mapeo estético de estados
  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'CONFIRMADO':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'EN_PREP':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'EN_CAMINO':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'ENTREGADO':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'CANCELADO':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  // Filtrado de pedidos en memoria
  const filteredPedidos = pedidos.filter(ped => {
    // 1. Filtrar por buscador (email o ID)
    const matchesSearch = 
      ped.id.toString().includes(searchTerm) || 
      ped.usuario_id.toString().includes(searchTerm);

    // 2. Filtrar por estado
    const matchesEstado = 
      selectedEstado === 'TODOS' || 
      ped.estado === selectedEstado;

    // 3. Filtrar por tipo entrega
    const matchesTipo = 
      selectedTipoEntrega === 'TODOS' || 
      ped.tipo_entrega === selectedTipoEntrega;

    return matchesSearch && matchesEstado && matchesTipo;
  });

  const navItems = [
    { name: 'Categorías', path: '/admin/categorias', icon: <Layers size={20} />, active: false },
    { name: 'Productos', path: '/admin/productos', icon: <ShoppingBag size={20} />, active: false },
    { name: 'Ingredientes', path: '/admin/ingredientes', icon: <Cookie size={20} />, active: false },
    { name: 'Pedidos', path: '/admin/pedidos', icon: <Receipt size={20} />, active: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/70 via-gray-50 to-amber-50/50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-md border-r border-gray-100 p-5 shadow-sm shrink-0">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            FS
          </div>
          <div>
            <span className="font-extrabold text-gray-800 text-lg">Food Store</span>
            <span className="block text-[10px] text-gray-500 tracking-wider uppercase font-semibold">Admin Panel</span>
          </div>
        </div>

        <nav className="mt-8 space-y-1.5 flex-1">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                item.active 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold text-sm transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="bg-white/50 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-xl font-extrabold text-gray-800">Administración de Pedidos (FSM)</h1>
            <p className="text-xs text-gray-500 mt-0.5">Control de órdenes, bitácoras de auditoría y stock interactivo</p>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-gray-800 text-sm">{user?.nombre} {user?.apellido}</span>
              <span className="block text-[10px] bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full mt-0.5 uppercase font-bold tracking-wider">
                {user?.roles[0]}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shadow-sm">
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </div>
          </div>
        </header>

        {/* Drawer Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-45 flex md:hidden animate-fadeIn">
            <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs"></div>
            <aside className="relative flex flex-col w-64 bg-white p-5 shadow-2xl z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow">FS</div>
                  <span className="font-extrabold text-gray-800">Food Store</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-50 text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-8 space-y-1.5 flex-1">
                {navItems.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      item.active ? 'bg-orange-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="border-t border-gray-100 pt-4 mt-auto">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold text-sm transition-all cursor-pointer"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <div className="sm:hidden mb-2">
            <h1 className="text-2xl font-black text-gray-800">Pedidos</h1>
            <p className="text-xs text-gray-500">Control operativo de ordenes en tiempo real</p>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Buscador */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por Pedido ID o Usuario ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
              />
            </div>

            {/* Selectores */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Estado */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-2xl">
                <Filter size={14} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estado:</span>
                <select
                  value={selectedEstado}
                  onChange={e => setSelectedEstado(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="EN_PREP">En Preparación</option>
                  <option value="EN_CAMINO">En Camino</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              {/* Tipo Entrega */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-2xl">
                <Truck size={14} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entrega:</span>
                <select
                  value={selectedTipoEntrega}
                  onChange={e => setSelectedTipoEntrega(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="TAKE_AWAY">Take Away</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 font-bold text-xs">Cargando tablero operativo...</span>
            </div>
          ) : isError ? (
            <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 flex items-start gap-4">
              <AlertCircle className="text-red-600 shrink-0 animate-pulse" size={24} />
              <div>
                <h3 className="font-bold text-red-800">Tablero Caído</h3>
                <p className="text-xs text-red-700 mt-1">No se pudo cargar la base de pedidos. Revisa el log de tu servidor FastAPI.</p>
              </div>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-sm mx-auto space-y-3 shadow-sm">
              <AlertCircle size={44} className="mx-auto text-gray-300 stroke-1" />
              <h3 className="font-bold text-gray-700 text-sm">Sin coincidencias</h3>
              <p className="text-xs text-gray-400">No hay ningún pedido activo con los filtros o ID de búsqueda ingresados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPedidos.map(ped => {
                const isExpanded = expandedOrders[ped.id] ?? false;
                const nextState = getNextLogicalState(ped.estado);
                const isCancelable = ped.estado !== 'CANCELADO' && ped.estado !== 'ENTREGADO';

                return (
                  <div 
                    key={ped.id}
                    className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xxs space-y-4 hover:border-gray-250 transition-all text-left"
                  >
                    {/* Header del Pedido */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-800 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl text-xs">
                          #{ped.id}
                        </span>
                        <div className="text-xs">
                          <span className="font-bold text-gray-700 block">
                            Usuario ID: {ped.usuario_id}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            Fecha: {new Date(ped.fecha_pedido).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-0.8 border rounded-full ${getStatusBadge(ped.estado)}`}>
                          {ped.estado.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-black tracking-wider uppercase bg-gray-50 border border-gray-150 px-2 py-0.8 rounded-lg text-gray-500">
                          {ped.tipo_entrega === 'DELIVERY' ? '🏍️ Envío' : '🏪 Retiro'}
                        </span>
                        <span className="text-sm font-black text-orange-600">${Number(ped.total).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Fila de controles operativos */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex gap-2">
                        {nextState && (
                          <button
                            onClick={() => { setAdvancePedido(ped); setAdvanceMotivo(''); setAdvanceError(null); }}
                            className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] shadow-sm transition-all cursor-pointer hover:shadow"
                          >
                            <span>Avanzar a: {nextState.replace('_', ' ')}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                        {isCancelable && (
                          <button
                            onClick={() => { setCancelPedidoId(ped.id); setCancelMotivo(''); setCancelError(null); }}
                            className="flex items-center gap-1 border border-red-200 hover:bg-red-50 text-red-600 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer"
                          >
                            <XCircle size={12} />
                            <span>Cancelar Pedido</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => toggleExpand(ped.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-orange-600 font-extrabold cursor-pointer transition-colors ml-auto"
                      >
                        <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* Detalles expandibles */}
                    {isExpanded && (
                      <div className="border-t border-gray-50 pt-4 space-y-4 animate-slideDown">
                        
                        {/* Dirección Snapshot */}
                        {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 space-y-1">
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={10} className="text-orange-500" />
                              <span>Dirección de entrega (Snapshot):</span>
                            </span>
                            <p className="text-xs text-gray-700 font-bold leading-normal">{ped.direccion_snapshot}</p>
                          </div>
                        )}

                        {/* Detalles de platos */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Items del pedido:</span>
                          <div className="divide-y divide-gray-50 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xxs">
                            {ped.detalles.map(det => (
                              <div key={det.id} className="p-3 flex items-start justify-between gap-3 text-xs leading-normal">
                                <div className="min-w-0 flex-1">
                                  <span className="font-extrabold text-gray-800 block truncate">{det.producto_nombre}</span>
                                  <span className="text-[10px] text-gray-400 font-medium">Cant: {det.cantidad} x ${Number(det.precio_unitario).toFixed(2)}</span>
                                  {det.personalizacion && (
                                    <div className="flex flex-wrap gap-0.5 mt-1">
                                      {det.personalizacion.split(',').map((exId, idx) => (
                                        <span key={idx} className="text-[8px] font-black text-gray-500 bg-gray-50 border border-gray-150 px-1 py-0.2 rounded-md shrink-0">
                                          🚫 Sin ingrediente #{exId}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="font-black text-gray-700 shrink-0">${Number(det.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Audit Trail de estados */}
                        {ped.historial && ped.historial.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Historial de auditoría interna (FSM):</span>
                            <div className="bg-orange-50/20 border border-orange-100/30 rounded-2xl p-4 space-y-3">
                              {ped.historial.map((hist, idx) => (
                                <div key={hist.id} className="text-[11px] leading-relaxed relative pl-3.5">
                                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                  <p className="font-bold text-gray-800">
                                    Transición: <span className="text-[10px] bg-white border border-orange-150 px-1.5 py-0.2 rounded font-black text-orange-700">{hist.estado_origen}</span> ➔ <span className="text-[10px] bg-white border border-orange-150 px-1.5 py-0.2 rounded font-black text-orange-700">{hist.estado_destino}</span>
                                  </p>
                                  <p className="text-gray-500 text-[10px]">
                                    {new Date(hist.fecha_change || hist.fecha_cambio).toLocaleString('es-AR')} 
                                    {hist.operador_email && ` · Operador: ${hist.operador_email}`}
                                  </p>
                                  {hist.motivo && (
                                    <p className="text-[10px] text-orange-950 font-bold bg-white/80 border border-orange-150/40 p-2 rounded-xl mt-1">
                                      💬 Motivo: {hist.motivo}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL AVANZAR ESTADO */}
      {advancePedido !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setAdvancePedido(null)} className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"></div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const next = getNextLogicalState(advancePedido.estado);
              if (next) {
                advanceMutation.mutate({ 
                  id: advancePedido.id, 
                  nuevo_estado: next, 
                  motivo: advanceMotivo 
                });
              }
            }}
            className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black block">Avanzar FSM</span>
                <h3 className="font-extrabold text-gray-800 text-sm mt-0.5">Operación: Avanzar Estado</h3>
              </div>
              <button type="button" onClick={() => setAdvancePedido(null)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
                <X size={18} />
              </button>
            </div>

            {advanceError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0 animate-pulse" />
                <span>{advanceError}</span>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[11px] text-gray-500 leading-normal">
                Vas a avanzar el pedido **#{advancePedido.id}** de su estado <span className="font-black text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">{advancePedido.estado}</span> a <span className="font-black text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">{getNextLogicalState(advancePedido.estado)}</span>.
              </p>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Motivo Operativo (Opcional):</label>
                <textarea
                  placeholder="Ej: Plato en horno / Cadete asignado para envío..."
                  rows={2}
                  value={advanceMotivo}
                  onChange={e => setAdvanceMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 leading-normal font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-50 shrink-0">
              <button
                type="button" onClick={() => setAdvancePedido(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-[10px] transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit" disabled={advanceMutation.isPending}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-[10px] shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                {advanceMutation.isPending ? 'Guardando...' : 'Avanzar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL OPERATIVO DE CANCELACIÓN */}
      {cancelPedidoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setCancelPedidoId(null)} className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"></div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!cancelMotivo.trim()) return setCancelError('El motivo de cancelación es obligatorio.');
              cancelMutation.mutate({ id: cancelPedidoId, motivo: cancelMotivo.trim() });
            }}
            className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-red-600 tracking-widest uppercase font-black block">Tablero de Control</span>
                <h3 className="font-extrabold text-gray-800 text-sm mt-0.5">Operación: Cancelar Pedido</h3>
              </div>
              <button type="button" onClick={() => setCancelPedidoId(null)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
                <X size={18} />
              </button>
            </div>

            {cancelError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0 animate-pulse" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 leading-normal font-medium">
                ¿Estás seguro de cancelar el pedido **#{cancelPedidoId}**? Esta es una acción irreversible que anulará la transacción e impactará la bitácora interna.
              </p>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Motivo de Cancelación (Obligatorio):</label>
                <textarea
                  required
                  placeholder="Ej: Falta de ingredientes de última hora / No se encuentra la dirección del cliente..."
                  rows={3}
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 leading-normal font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-50 shrink-0">
              <button
                type="button" onClick={() => setCancelPedidoId(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-[10px] transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit" disabled={cancelMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-[10px] shadow-md shadow-red-600/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
