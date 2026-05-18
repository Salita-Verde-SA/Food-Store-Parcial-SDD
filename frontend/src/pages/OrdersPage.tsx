import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShoppingBag, 
  Navigation,
  Clock,
  XCircle,
  CheckCircle,
  Truck,
  Store,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Briefcase
} from 'lucide-react';

import { pedidosApi } from '../shared/api/pedidos';
import { pagosApi } from '../shared/api/pagos';
import { useAuthStore } from '../shared/stores/authStore';
import type { Pedido, EstadoPedido } from '../shared/types';

export const OrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  // Estados locales
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  
  // Estados para Modal de Cancelación
  const [cancelPedidoId, setCancelPedidoId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Estados para Modal de Pago Simulador de Pedidos Pendientes
  const [payPedidoId, setPayPedidoId] = useState<number | null>(null);
  const [payTotal, setPayTotal] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [payStep, setPayStep] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Query - Obtener pedidos del cliente
  const { data: pedidosData, isLoading, isError } = useQuery<any>({
    queryKey: ['pedidos'],
    queryFn: pedidosApi.getPedidos,
    refetchInterval: 5000, // Auto-refetch cada 5s para ver actualizaciones en vivo del gestor!
  });

  const pedidos: Pedido[] = Array.isArray(pedidosData)
    ? pedidosData
    : pedidosData?.items || [];

  // Mutación - Cancelar Pedido
  const cancelMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => 
      pedidosApi.cancelarPedido(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setCancelPedidoId(null);
      setCancelMotivo('');
      setCancelError(null);
    },
    onError: (err: any) => {
      setCancelError(err.detail || 'No se pudo cancelar el pedido en este estado.');
    }
  });

  // Mutación - Pagar Pedido Pendiente
  const payMutation = useMutation({
    mutationFn: async ({ pedidoId }: { pedidoId: number }) => {
      setIsPaying(true);
      setPayStep('1. Creando preferencia en MercadoPago...');
      const pagoResponse = await pagosApi.crearPago(pedidoId);
      
      setPayStep('2. Conectando con MercadoPago...');
      await new Promise(r => setTimeout(r, 1200));

      setPayStep('3. Aprobando pago seguro sandbox...');
      const mockPaymentId = `test_orderpay_${Math.floor(Math.random() * 100000000)}`;
      await pagosApi.simularWebhook(mockPaymentId, 'approved', pagoResponse.external_reference);
      
      setPayStep('4. Confirmando transacción...');
      await new Promise(r => setTimeout(r, 800));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setIsPaying(false);
      setPayPedidoId(null);
      setPayError(null);
    },
    onError: (err: any) => {
      setIsPaying(false);
      setPayError(err.detail || 'Ocurrió un error al procesar el pago.');
    }
  });

  const toggleExpand = (id: number) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCancelClick = (id: number) => {
    setCancelPedidoId(id);
    setCancelMotivo('');
    setCancelError(null);
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelMotivo.trim()) return setCancelError('El motivo de cancelación es obligatorio');
    if (cancelPedidoId) {
      cancelMutation.mutate({ id: cancelPedidoId, motivo: cancelMotivo.trim() });
    }
  };

  const handlePayClick = (id: number, total: number) => {
    setPayPedidoId(id);
    setPayTotal(total);
    setPayError(null);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payPedidoId) {
      payMutation.mutate({ pedidoId: payPedidoId });
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión en Food Store?')) {
      logout();
      navigate('/login');
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

  // Progreso FSM en números
  const getFSMStep = (estado: EstadoPedido) => {
    const steps: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO'];
    return steps.indexOf(estado);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 flex flex-col font-sans">
      
      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all">
            FS
          </Link>
          <div>
            <span className="font-extrabold text-gray-800 text-lg">Food Store</span>
            <span className="block text-[10px] text-orange-600 tracking-widest uppercase font-black">Rastreador de Pedidos</span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-500 font-bold transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Volver al Menú</span>
          </Link>

          {/* Menú Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shadow-sm cursor-pointer hover:bg-orange-200 active:scale-95 transition-all"
            >
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </button>

            {isUserMenuOpen && (
              <>
                <div onClick={() => setIsUserMenuOpen(false)} className="fixed inset-0 z-45"></div>
                <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-scaleUp">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <span className="block font-bold text-gray-800 text-xs">{user?.nombre} {user?.apellido}</span>
                    <span className="block text-[9px] text-gray-400 font-medium truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/direcciones"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-bold text-xs transition-all"
                  >
                    <MapPin size={14} />
                    <span>Mis Direcciones</span>
                  </Link>
                  <Link
                    to="/pedidos"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-orange-700 bg-orange-50/50 font-bold text-xs transition-all"
                  >
                    <Navigation size={14} />
                    <span>Mis Pedidos</span>
                  </Link>
                  {user?.roles.some((r: string) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r)) && (
                    <Link
                      to="/admin/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-bold text-xs transition-all"
                    >
                      <Briefcase size={14} />
                      <span>Panel Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs transition-all cursor-pointer border-t border-gray-50 mt-1"
                  >
                    <X size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* CUERPO DE LA PAGINA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        
        {/* TÍTULO */}
        <div>
          <Link to="/" className="sm:hidden flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
            <ChevronLeft size={12} />
            <span>Menú</span>
          </Link>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Historial de Pedidos</h2>
          <p className="text-xs text-gray-500">Realizá el seguimiento en tiempo real y revisá compras anteriores</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 font-bold text-xs">Cargando tus ordenes...</span>
          </div>
        ) : isError ? (
          <div className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-3xl p-6 flex items-start gap-4">
            <AlertTriangle className="text-red-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Error de conexión</h3>
              <p className="text-xs text-red-700 mt-1">No pudimos traer tu historial de pedidos en este momento.</p>
            </div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8 max-w-md mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
              <ShoppingBag size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-700 text-sm">Sin pedidos registrados</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Aún no realizaste ningún pedido en nuestra tienda. ¡Mirá nuestra carta y tentate con nuestras delicias!</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>Ver la Carta</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {pedidos.map(ped => {
              const isExpanded = expandedOrders[ped.id] ?? false;
              const fsmIdx = getFSMStep(ped.estado);
              const isCancelable = ped.estado === 'PENDIENTE' || ped.estado === 'CONFIRMADO';
              const isPayable = ped.estado === 'PENDIENTE' && ped.pago?.status === 'PENDIENTE';

              return (
                <div 
                  key={ped.id}
                  className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xxs space-y-5 transition-all"
                >
                  {/* Encabezado del Pedido Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-800 bg-gray-50 border border-gray-150 px-2.5 py-1 rounded-xl">
                        #{ped.id}
                      </span>
                      <div className="text-xs text-gray-500">
                        <span className="font-bold text-gray-700 block">
                          {new Date(ped.fecha_pedido).toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {ped.tipo_entrega === 'DELIVERY' ? '🏍️ Delivery' : '🏪 Retiro en local'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-full ${getStatusBadge(ped.estado)}`}>
                        {ped.estado.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-black text-orange-600">${Number(ped.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* SECTOR FSM PROGRESS TRACKER (Si no está cancelado) */}
                  {ped.estado !== 'CANCELADO' ? (
                    <div className="py-2 px-1 select-none">
                      {/* Línea de conectores */}
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 right-0 h-1 bg-gray-100 -z-10 rounded"></div>
                        <div 
                          className="absolute left-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 -z-10 rounded transition-all duration-500"
                          style={{ width: `${(fsmIdx / 4) * 100}%` }}
                        ></div>

                        {['Pnd', 'Conf', 'Prep', 'Viaje', 'Listo'].map((step, idx) => {
                          const isDone = fsmIdx >= idx;
                          const isCurrent = fsmIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                isCurrent 
                                  ? 'bg-orange-500 border-orange-500 text-white ring-4 ring-orange-500/20 scale-110' 
                                  : isDone
                                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                                    : 'bg-white border-gray-200 text-gray-300'
                              }`}>
                                {isDone && !isCurrent ? '✓' : idx + 1}
                              </div>
                              <span className={`text-[8px] font-extrabold uppercase tracking-wider ${
                                isCurrent ? 'text-orange-600' : isDone ? 'text-gray-600' : 'text-gray-300'
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-100/50 rounded-2xl p-4 flex gap-3 text-left">
                      <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <span className="text-xs font-black text-red-950">Pedido Cancelado</span>
                        <p className="text-[10px] text-red-800 leading-normal mt-0.5 font-medium">
                          Este pedido fue cancelado y su inventario devuelto al catálogo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Acciones Rápidas */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex gap-2">
                      {isPayable && (
                        <button
                          onClick={() => handlePayClick(ped.id, ped.total)}
                          className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] shadow-sm transition-all cursor-pointer"
                        >
                          <CreditCard size={12} />
                          <span>Abonar con MercadoPago</span>
                        </button>
                      )}

                      {isCancelable && (
                        <button
                          onClick={() => handleCancelClick(ped.id)}
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

                  {/* DETALLES EXPANDIBLES (Items, Dirección y Bitácora de Auditoría) */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 pt-4 space-y-4 animate-slideDown text-left">
                      
                      {/* Dirección / Snapshot */}
                      {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={10} className="text-orange-500" />
                            <span>Dirección de entrega (Snapshot):</span>
                          </span>
                          <p className="text-xs text-gray-700 font-bold leading-normal">{ped.direccion_snapshot}</p>
                        </div>
                      )}

                      {/* Listado de Platos */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Platos del pedido:</span>
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

                      {/* BITÁCORA DE HISTORIAL OPERATIVO (Audit Trail) */}
                      {ped.historial && ped.historial.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Historial de auditoría interna:</span>
                          <div className="bg-orange-50/20 border border-orange-100/30 rounded-2xl p-4 space-y-3">
                            {ped.historial.map((hist, idx) => (
                              <div key={hist.id} className="text-[11px] leading-relaxed relative pl-3.5">
                                {/* Conector bullet */}
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

      {/* MODAL MOCK DE CARGA PARA PAGOS PENDIENTES */}
      {isPaying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gray-950/85 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-8 text-center space-y-6 animate-scaleUp">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black">Procesando Pago de Pedido</span>
              <h4 className="font-extrabold text-gray-800 text-sm">Simulando Sandbox de MercadoPago</h4>
              <p className="text-[10px] text-gray-400 font-bold px-2 py-1 bg-gray-50 border border-gray-100 rounded-xl leading-relaxed">
                {payStep}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO DE CANCELACIÓN */}
      {cancelPedidoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setCancelPedidoId(null)} className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"></div>
          <form 
            onSubmit={handleCancelSubmit}
            className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-red-600 tracking-widest uppercase font-black block">Cancelación de Pedido</span>
                <h3 className="font-extrabold text-gray-800 text-sm mt-0.5">Confirmar Cancelación</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setCancelPedidoId(null)} 
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {cancelError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 leading-normal">
                ¿Estás seguro de cancelar tu pedido **#{cancelPedidoId}**? El estado del pedido cambiará a **CANCELADO** y se repondrá el stock de ingredientes al instante en el catálogo de platos.
              </p>
              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Motivo de Cancelación:</label>
                <textarea
                  required
                  placeholder="Ej: Me equivoqué de plato / No puedo esperar la demora..."
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

      {/* MODAL CONFIRMACIÓN PARA PAGAR PENDIENTES */}
      {payPedidoId !== null && !isPaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setPayPedidoId(null)} className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"></div>
          <form 
            onSubmit={handlePaySubmit}
            className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black block">Abonar Pedido</span>
                <h3 className="font-extrabold text-gray-800 text-sm mt-0.5">Proceder a la Pasarela</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setPayPedidoId(null)} 
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[11px] text-gray-500 leading-normal">
                Vas a completar de manera segura tu pago pendiente del pedido **#{payPedidoId}** por un total de **${payTotal.toFixed(2)}**.
              </p>
              <div className="bg-orange-50/20 border border-orange-100/50 p-4 rounded-2xl flex gap-3 text-left">
                <Lock className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-black text-orange-950">Conexión Encriptada Sandbox</span>
                  <p className="text-[10px] text-orange-900 leading-normal mt-0.5 font-medium">
                    Hacé clic en confirmar para abrir el simulador seguro de MercadoPago y aprobar la transacción de prueba.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-50 shrink-0">
              <button
                type="button" onClick={() => setPayPedidoId(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-[10px] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-[10px] shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export { X };
