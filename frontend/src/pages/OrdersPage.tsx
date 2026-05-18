import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShoppingBag, 
  Navigation,
  CheckCircle,
  Truck,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  XCircle
} from 'lucide-react';

import { pedidosApi } from '../shared/api/pedidos';
import { pagosApi } from '../shared/api/pagos';
import { useAuthStore } from '../shared/stores/authStore';
import type { Pedido, EstadoPedido } from '../shared/types';
import { Logo } from '../shared/ui/Logo';
import { useFeedback } from '../shared/ui/FeedbackProvider';

export const OrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { showConfirm } = useFeedback();

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

  const handleLogout = async () => {
    const ok = await showConfirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar sesión en Food Store?',
      variant: 'warning',
      confirmText: 'Cerrar sesión'
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
      case 'EN_PREP':
        return 'bg-brand-yellow-100 text-brand-yellow-800 border-brand-yellow-200';
      case 'CONFIRMADO':
      case 'EN_CAMINO':
        return 'bg-info-50 text-info-700 border-info-100';
      case 'ENTREGADO':
        return 'bg-success-50 text-success-700 border-success-100';
      case 'CANCELADO':
        return 'bg-danger-50 text-danger-700 border-danger-100';
      default:
        return 'bg-paper-100 text-ink-700 border-paper-200';
    }
  };

  const getStatusIcon = (estado: EstadoPedido) => {
    switch (estado) {
      case 'EN_CAMINO': return <Truck size={12} />;
      case 'ENTREGADO': return <CheckCircle size={12} />;
      case 'CANCELADO': return <X size={12} />;
      default: return null;
    }
  };

  const getFSMStep = (estado: EstadoPedido) => {
    const steps: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO'];
    return steps.indexOf(estado);
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.15em] text-brand-red-500';
  const cardBase = 'bg-paper-0 border border-paper-200 rounded-lg shadow-sm';
  const inputBase = 'w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150';
  const labelBase = 'block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5';

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col font-sans">
      
      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-paper-0 border-b-2 border-brand-yellow-400 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            <Logo size="md" variant="red" />
          </Link>
          <div>
            <span className="font-black text-ink-900 text-lg leading-tight block">Food Store</span>
            <span className={`block ${eyebrow}`}>Mis Pedidos</span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-red-500 font-semibold transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Volver al menú</span>
          </Link>

          {/* Menú Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-md bg-brand-yellow-100 border border-brand-yellow-300 flex items-center justify-center text-ink-900 font-bold cursor-pointer hover:bg-brand-yellow-200 active:scale-95 transition-all duration-150"
            >
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </button>

            {isUserMenuOpen && (
              <>
                <div onClick={() => setIsUserMenuOpen(false)} className="fixed inset-0 z-45"></div>
                <div className="absolute right-0 mt-2 w-56 bg-paper-0 rounded-lg shadow-md border border-paper-200 p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-paper-200 mb-1">
                    <span className="block font-bold text-ink-900 text-sm">{user?.nombre} {user?.apellido}</span>
                    <span className="block text-[11px] text-ink-400 font-medium truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/direcciones"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-ink-700 hover:bg-paper-100 hover:text-ink-900 font-semibold text-sm transition-colors duration-150"
                  >
                    <MapPin size={14} />
                    <span>Mis Direcciones</span>
                  </Link>
                  <Link
                    to="/pedidos"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md bg-brand-red-50 text-brand-red-700 font-semibold text-sm"
                  >
                    <Navigation size={14} />
                    <span>Mis Pedidos</span>
                  </Link>
                  {user?.roles.some((r: string) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r)) && (
                    <Link
                      to="/admin/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-ink-700 hover:bg-paper-100 hover:text-ink-900 font-semibold text-sm transition-colors duration-150"
                    >
                      <Briefcase size={14} />
                      <span>Panel Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-danger-600 hover:bg-danger-50 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer border-t border-paper-200 mt-1"
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
          <Link to="/" className="sm:hidden flex items-center gap-1 text-[11px] text-ink-500 font-bold uppercase tracking-wider mb-1">
            <ChevronLeft size={12} />
            <span>Menú</span>
          </Link>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 tracking-tight">Historial de Pedidos</h2>
          <p className="text-sm text-ink-500 mt-1">Realizá el seguimiento en tiempo real y revisá compras anteriores</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-ink-500 font-medium text-sm">Cargando tus ordenes...</span>
          </div>
        ) : isError ? (
          <div className="bg-danger-50 border border-danger-100 rounded-lg p-6 flex items-start gap-4">
            <AlertTriangle className="text-danger-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-danger-700">Error de conexión</h3>
              <p className="text-sm text-danger-600 mt-1">No pudimos traer tu historial de pedidos en este momento.</p>
            </div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className={`text-center py-16 ${cardBase} p-8 max-w-md mx-auto space-y-4`}>
            <div className="w-16 h-16 bg-brand-yellow-100 rounded-lg flex items-center justify-center text-brand-yellow-700 mx-auto">
              <ShoppingBag size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink-900">Sin pedidos registrados</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Aún no realizaste ningún pedido en nuestra tienda. ¡Mirá nuestra carta y tentate con nuestras delicias!</p>
            </div>
            <Link
              to="/"
              className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm inline-flex items-center gap-2"
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
                  className={`${cardBase} p-5 space-y-5`}
                >
                  {/* Encabezado del Pedido Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-paper-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-ink-900 bg-paper-100 border border-paper-200 px-2.5 py-1 rounded-md">
                        #{ped.id}
                      </span>
                      <div className="text-xs text-ink-500">
                        <span className="font-bold text-ink-900 block">
                          {new Date(ped.fecha_pedido).toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <span className="text-[10px] text-ink-400 font-medium">
                          {ped.tipo_entrega === 'DELIVERY' ? '🏍️ Delivery' : '🏪 Retiro en local'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(ped.estado)}`}>
                        {getStatusIcon(ped.estado)}
                        <span>{ped.estado.replace('_', ' ')}</span>
                      </span>
                      <span className="text-xl font-black text-brand-red-500 tabular-nums">${Number(ped.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* SECTOR FSM PROGRESS TRACKER (Si no está cancelado) */}
                  {ped.estado !== 'CANCELADO' ? (
                    <div className="py-2 px-1 select-none">
                      {/* Línea de conectores */}
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 right-0 h-1.5 bg-paper-200 -z-10 rounded"></div>
                        <div 
                          className="absolute left-0 h-1.5 bg-brand-red-500 -z-10 rounded transition-all duration-500"
                          style={{ width: `${(fsmIdx / 4) * 100}%` }}
                        ></div>

                        {['Pnd', 'Conf', 'Prep', 'Viaje', 'Listo'].map((step, idx) => {
                          const isDone = fsmIdx >= idx;
                          const isCurrent = fsmIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent 
                                  ? 'bg-brand-red-500 text-white ring-4 ring-brand-red-500/20 scale-125' 
                                  : isDone
                                    ? 'bg-brand-red-500 text-white'
                                    : 'bg-paper-200 text-ink-400'
                              }`}>
                                {isDone && !isCurrent ? '✓' : idx + 1}
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                isCurrent ? 'text-brand-red-600' : isDone ? 'text-ink-600' : 'text-ink-400'
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-danger-50 border border-danger-100 rounded-md p-4 flex gap-3 text-left">
                      <XCircle className="text-danger-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <span className="text-xs font-bold text-danger-700">Pedido Cancelado</span>
                        <p className="text-[10px] text-danger-600 leading-normal mt-0.5 font-medium">
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
                          className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-xs flex items-center gap-1.5"
                        >
                          <CreditCard size={14} />
                          <span>Pagar ahora</span>
                        </button>
                      )}

                      {isCancelable && (
                        <button
                          onClick={() => handleCancelClick(ped.id)}
                          className="bg-paper-0 border border-danger-100 hover:bg-danger-50 hover:border-danger-200 text-danger-600 hover:text-danger-700 font-semibold px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                        >
                          <XCircle size={14} />
                          <span>Cancelar pedido</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => toggleExpand(ped.id)}
                      className="flex items-center gap-1 text-[11px] text-ink-500 hover:text-ink-900 font-bold cursor-pointer transition-colors ml-auto"
                    >
                      <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* DETALLES EXPANDIBLES (Items, Dirección y Bitácora de Auditoría) */}
                  {isExpanded && (
                    <div className="border-t border-paper-200 pt-4 space-y-4 text-left">
                      
                      {/* Dirección / Snapshot */}
                      {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                        <div className="bg-paper-50 border border-paper-200 rounded-md p-3.5 space-y-1">
                          <span className={eyebrow + " flex items-center gap-1"}>
                            <MapPin size={10} />
                            <span>Dirección de entrega (Snapshot):</span>
                          </span>
                          <p className="text-sm text-ink-900 font-semibold leading-normal">{ped.direccion_snapshot}</p>
                        </div>
                      )}

                      {/* Listado de Platos */}
                      <div className="space-y-2.5">
                        <span className={eyebrow}>Platos del pedido</span>
                        <div className="divide-y divide-paper-200 bg-paper-0 border border-paper-200 rounded-md overflow-hidden">
                          {ped.detalles.map(det => (
                            <div key={det.id} className="p-3 flex items-start justify-between gap-3 text-sm leading-normal">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-ink-900 block truncate">{det.producto_nombre}</span>
                                <span className="text-xs text-ink-500 font-medium">Cant: {det.cantidad} x ${Number(det.precio_unitario).toFixed(2)}</span>
                                {det.personalizacion && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {det.personalizacion.split(',').map((exId, idx) => (
                                      <span key={idx} className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        🚫 Sin ingrediente #{exId}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="font-black text-ink-900 shrink-0 tabular-nums">${Number(det.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BITÁCORA DE HISTORIAL OPERATIVO (Audit Trail) */}
                      {ped.historial && ped.historial.length > 0 && (
                        <div className="space-y-2">
                          <span className={eyebrow}>Historial de auditoría interna</span>
                          <div className="bg-paper-50 border border-paper-200 rounded-md p-4 space-y-3">
                            {ped.historial.map((hist, idx) => (
                              <div key={hist.id} className="text-xs leading-relaxed relative pl-3.5">
                                {/* Conector bullet */}
                                <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-brand-red-500"></div>
                                <p className="font-bold text-ink-900">
                                  Transición: <span className="text-[10px] bg-paper-0 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">{hist.estado_origen}</span> ➔ <span className="text-[10px] bg-paper-0 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">{hist.estado_destino}</span>
                                </p>
                                <p className="text-ink-500 text-[10px]">
                                  {new Date(hist.fecha_change || hist.fecha_cambio).toLocaleString('es-AR')} 
                                  {hist.operador_email && ` · Operador: ${hist.operador_email}`}
                                </p>
                                {hist.motivo && (
                                  <p className="text-[11px] text-ink-700 font-semibold bg-paper-0 border border-paper-200 p-2 rounded-md mt-1">
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-paper-0 rounded-xl max-w-sm w-full shadow-lg p-8 text-center space-y-6 animate-scaleUp">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-paper-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-1.5">
              <span className={eyebrow}>Procesando Pago de Pedido</span>
              <h4 className="font-bold text-ink-900 text-sm">Simulando Sandbox de MercadoPago</h4>
              <p className="text-[11px] text-ink-500 font-semibold px-2 py-1 bg-paper-50 border border-paper-200 rounded-md leading-relaxed mt-2">
                {payStep}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO DE CANCELACIÓN */}
      {cancelPedidoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setCancelPedidoId(null)} className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
          <form 
            onSubmit={handleCancelSubmit}
            className="relative bg-paper-0 rounded-xl max-w-sm w-full shadow-lg p-6 z-10 space-y-5 animate-scaleUp border border-paper-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div>
                <span className={eyebrow}>Cancelación de Pedido</span>
                <h3 className="font-bold text-ink-900 text-sm mt-0.5">Confirmar Cancelación</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setCancelPedidoId(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {cancelError && (
              <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3 rounded-md text-sm flex items-center gap-2 font-medium">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-ink-700 leading-normal">
                ¿Estás seguro de cancelar tu pedido <strong>#{cancelPedidoId}</strong>? El estado del pedido cambiará a <strong>CANCELADO</strong> y se repondrá el stock de ingredientes al instante en el catálogo de platos.
              </p>
              <div>
                <label className={labelBase}>Motivo de Cancelación:</label>
                <textarea
                  required
                  placeholder="Ej: Me equivoqué de plato / No puedo esperar la demora..."
                  rows={3}
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  className={inputBase + " resize-none"}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-paper-200 shrink-0">
              <button
                type="button" onClick={() => setCancelPedidoId(null)}
                className="flex-1 bg-paper-0 border border-paper-200 hover:bg-paper-50 hover:border-ink-900 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
              >
                Volver atrás
              </button>
              <button
                type="submit" disabled={cancelMutation.isPending}
                className="flex-1 bg-paper-0 border border-danger-100 hover:bg-danger-50 hover:border-danger-200 text-danger-600 hover:text-danger-700 font-semibold px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer text-sm"
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
          <div onClick={() => setPayPedidoId(null)} className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
          <form 
            onSubmit={handlePaySubmit}
            className="relative bg-paper-0 rounded-xl max-w-sm w-full shadow-lg p-6 z-10 space-y-5 animate-scaleUp border border-paper-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div>
                <span className={eyebrow}>Abonar Pedido</span>
                <h3 className="font-bold text-ink-900 text-sm mt-0.5">Proceder a la Pasarela</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setPayPedidoId(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {payError && (
              <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3 rounded-md text-sm flex items-center gap-2 font-medium">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-ink-700 leading-normal">
                Vas a completar de manera segura tu pago pendiente del pedido <strong>#{payPedidoId}</strong> por un total de <strong>${payTotal.toFixed(2)}</strong>.
              </p>
              <div className="bg-brand-yellow-50 border border-brand-yellow-200 p-4 rounded-md flex gap-3 text-left">
                <Lock className="text-brand-yellow-800 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-bold text-brand-yellow-900">Conexión Encriptada Sandbox</span>
                  <p className="text-[11px] text-brand-yellow-800 leading-normal mt-0.5 font-medium">
                    Hacé clic en confirmar para abrir el simulador seguro de MercadoPago y aprobar la transacción de prueba.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-paper-200 shrink-0">
              <button
                type="button" onClick={() => setPayPedidoId(null)}
                className="flex-1 bg-paper-0 border border-paper-200 hover:bg-paper-50 hover:border-ink-900 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm"
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
