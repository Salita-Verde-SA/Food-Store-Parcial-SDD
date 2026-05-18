import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MapPin,
  CreditCard,
  ChevronLeft,
  ShoppingBag,
  CheckCircle,
  Truck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  XCircle,
  Store,
} from 'lucide-react';

import { pedidosApi } from '../shared/api/pedidos';
import { pagosApi } from '../shared/api/pagos';
import type { Pedido, EstadoPedido } from '../shared/types';
import { ClientHeader } from '../shared/ui/ClientHeader';
import { ClientFooter } from '../shared/ui/ClientFooter';

export const OrdersPage = () => {
  const queryClient = useQueryClient();

  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  const [cancelPedidoId, setCancelPedidoId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [payPedidoId, setPayPedidoId] = useState<number | null>(null);
  const [payTotal, setPayTotal] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [payStep, setPayStep] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  const { data: pedidosData, isLoading, isError } = useQuery<any>({
    queryKey: ['pedidos'],
    queryFn: pedidosApi.getPedidos,
    refetchInterval: 5000,
  });

  const pedidos: Pedido[] = Array.isArray(pedidosData)
    ? pedidosData
    : pedidosData?.items || [];

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
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ pedidoId }: { pedidoId: number }) => {
      setIsPaying(true);
      setPayStep('1. Creando preferencia en MercadoPago…');
      const pagoResponse = await pagosApi.crearPago(pedidoId);

      setPayStep('2. Conectando con MercadoPago…');
      await new Promise(r => setTimeout(r, 1200));

      setPayStep('3. Aprobando pago seguro sandbox…');
      const mockPaymentId = `test_orderpay_${Math.floor(Math.random() * 100000000)}`;
      await pagosApi.simularWebhook(mockPaymentId, 'approved', pagoResponse.external_reference);

      setPayStep('4. Confirmando transacción…');
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
    },
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

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
      case 'EN_PREP':
        return 'bg-brand-yellow-100/80 text-brand-yellow-800 border-brand-yellow-300/70';
      case 'CONFIRMADO':
      case 'EN_CAMINO':
        return 'bg-info-50/80 text-info-700 border-info-200/70';
      case 'ENTREGADO':
        return 'bg-success-50/80 text-success-700 border-success-100/70';
      case 'CANCELADO':
        return 'bg-danger-50/80 text-danger-700 border-danger-200/70';
      default:
        return 'bg-white/50 text-ink-700 border-white/50';
    }
  };

  const getStatusIcon = (estado: EstadoPedido) => {
    switch (estado) {
      case 'EN_CAMINO': return <Truck size={11} />;
      case 'ENTREGADO': return <CheckCircle size={11} />;
      case 'CANCELADO': return <X size={11} />;
      default: return null;
    }
  };

  const getFSMStep = (estado: EstadoPedido) => {
    const steps: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO'];
    return steps.indexOf(estado);
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';

  return (
    <div className="min-h-screen flex flex-col">
      <ClientHeader eyebrow="Mis Pedidos" showBackToMenu activeMenu="pedidos" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Encabezado */}
        <div className="space-y-1.5">
          <Link
            to="/"
            className="sm:hidden inline-flex items-center gap-1 text-[11px] text-ink-500 font-bold uppercase tracking-wider"
          >
            <ChevronLeft size={12} />
            <span>Menú</span>
          </Link>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-black text-ink-900 tracking-tight">
                Historial de Pedidos
              </h1>
              <p className="text-sm text-ink-500 mt-1.5 font-medium">
                Seguimiento en tiempo real y archivo de compras anteriores.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 glass-panel text-ink-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
              </span>
              <span>Sincronización en vivo</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-ink-500 font-bold text-sm">Cargando tus órdenes…</span>
          </div>
        ) : isError ? (
          <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <AlertTriangle className="text-danger-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-danger-700">Error de conexión</h3>
              <p className="text-sm text-danger-600 mt-1">
                No pudimos traer tu historial de pedidos en este momento.
              </p>
            </div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl p-8 max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white/50 flex items-center justify-center text-brand-yellow-700 mx-auto">
              <ShoppingBag size={36} className="stroke-1" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-extrabold text-ink-900">Sin pedidos registrados</h3>
              <p className="text-sm text-ink-500 leading-relaxed">
                Aún no realizaste ningún pedido. ¡Mirá nuestra carta y tentate con nuestras delicias!
              </p>
            </div>
            <Link
              to="/"
              className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm inline-flex items-center gap-2"
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
                <article key={ped.id} className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
                  {/* Encabezado */}
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/40">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-ink-900 bg-white/60 border border-white/50 px-3 py-1.5 rounded-xl text-xs tabular-nums">
                        #{ped.id}
                      </span>
                      <div className="text-xs text-ink-500">
                        <span className="font-bold text-ink-900 block">
                          {new Date(ped.fecha_pedido).toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                          {ped.tipo_entrega === 'DELIVERY' ? (
                            <><Truck size={11} /> Delivery</>
                          ) : (
                            <><Store size={11} /> Retiro en local</>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(ped.estado)}`}>
                        {getStatusIcon(ped.estado)}
                        <span>{ped.estado.replace('_', ' ')}</span>
                      </span>
                      <span className="font-display text-2xl font-black text-brand-red-600 tabular-nums leading-none">
                        ${Number(ped.total).toFixed(2)}
                      </span>
                    </div>
                  </header>

                  {/* FSM progress */}
                  {ped.estado !== 'CANCELADO' ? (
                    <div className="py-2 px-1 select-none">
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1.5 bg-white/40 rounded-full -z-10" />
                        <div
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 bg-brand-red-500 rounded-full -z-10 transition-all duration-500"
                          style={{ width: `calc((100% - 1rem) * ${fsmIdx / 4})` }}
                        />

                        {['Pnd', 'Conf', 'Prep', 'Viaje', 'Listo'].map((step, idx) => {
                          const isDone = fsmIdx >= idx;
                          const isCurrent = fsmIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0 z-10">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                                  isCurrent
                                    ? 'bg-brand-red-500 text-white border-brand-red-500 ring-4 ring-brand-red-500/15 scale-110'
                                    : isDone
                                    ? 'bg-brand-red-500 text-white border-brand-red-500'
                                    : 'bg-white/50 text-ink-400 border-white/50'
                                }`}
                              >
                                {isDone && !isCurrent ? '✓' : idx + 1}
                              </div>
                              <span
                                className={`text-[9px] font-black uppercase tracking-wider ${
                                  isCurrent ? 'text-brand-red-700' : isDone ? 'text-ink-700' : 'text-ink-400'
                                }`}
                              >
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-4 flex gap-3 text-left backdrop-blur-sm">
                      <XCircle className="text-danger-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <span className="text-xs font-black text-danger-700 uppercase tracking-wider">
                          Pedido Cancelado
                        </span>
                        <p className="text-xs text-danger-600 leading-normal mt-0.5 font-medium">
                          Este pedido fue cancelado y su inventario devuelto al catálogo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {isPayable && (
                        <button
                          onClick={() => handlePayClick(ped.id, ped.total)}
                          className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2 rounded-2xl shadow-sm hover:shadow-brand transition-all duration-150 active:scale-[0.96] cursor-pointer text-xs flex items-center gap-1.5"
                        >
                          <CreditCard size={14} />
                          <span>Pagar ahora</span>
                        </button>
                      )}
                      {isCancelable && (
                        <button
                          onClick={() => handleCancelClick(ped.id)}
                          className="glass-panel border border-danger-200/60 hover:bg-danger-50/70 text-danger-600 hover:text-danger-700 font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                        >
                          <XCircle size={14} />
                          <span>Cancelar pedido</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => toggleExpand(ped.id)}
                      className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 font-bold cursor-pointer transition-colors ml-auto"
                    >
                      <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Detalles */}
                  {isExpanded && (
                    <div className="border-t border-white/40 pt-5 space-y-5 text-left animate-slideDown">
                      {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                        <div className="glass-panel rounded-2xl p-4 space-y-1">
                          <span className={`${eyebrow} flex items-center gap-1`}>
                            <MapPin size={11} />
                            <span>Dirección de entrega</span>
                          </span>
                          <p className="text-sm text-ink-900 font-semibold leading-normal">
                            {ped.direccion_snapshot}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <span className={eyebrow}>Platos del pedido</span>
                        <div className="divide-y divide-white/30 glass-panel rounded-2xl overflow-hidden">
                          {ped.detalles.map(det => (
                            <div key={det.id} className="p-3.5 flex items-start justify-between gap-3 text-sm leading-normal">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-ink-900 block truncate">
                                  {det.producto_nombre}
                                </span>
                                <span className="text-xs text-ink-500 font-medium">
                                  Cant: {det.cantidad} × ${Number(det.precio_unitario).toFixed(2)}
                                </span>
                                {det.personalizacion && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {det.personalizacion.split(',').map((exId, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 bg-danger-50/80 text-danger-700 border border-danger-200/60 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                      >
                                        Sin ingrediente #{exId}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="font-black text-ink-900 shrink-0 tabular-nums">
                                ${Number(det.subtotal).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {ped.historial && ped.historial.length > 0 && (
                        <div className="space-y-2">
                          <span className={eyebrow}>Historial de auditoría</span>
                          <div className="bg-white/20 border border-white/30 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
                            {ped.historial.map(hist => (
                              <div key={hist.id} className="text-xs leading-relaxed relative pl-4">
                                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-brand-red-500 ring-4 ring-brand-red-500/15" />
                                <p className="font-bold text-ink-900">
                                  Transición:{' '}
                                  <span className="text-[10px] bg-white/60 border border-white/50 px-1.5 py-0.5 rounded font-black text-ink-700">
                                    {hist.estado_origen}
                                  </span>{' '}
                                  →{' '}
                                  <span className="text-[10px] bg-white/60 border border-white/50 px-1.5 py-0.5 rounded font-black text-ink-700">
                                    {hist.estado_destino}
                                  </span>
                                </p>
                                <p className="text-ink-500 text-[10px] mt-0.5">
                                  {new Date(hist.fecha_cambio).toLocaleString('es-AR')}
                                  {hist.operador_email && ` · Operador: ${hist.operador_email}`}
                                </p>
                                {hist.motivo && (
                                  <p className="text-[11px] text-ink-700 font-semibold bg-white/40 border border-white/40 p-2 rounded-xl mt-1.5">
                                    Motivo: {hist.motivo}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      <ClientFooter />

      {/* Modal · procesando pago */}
      {isPaying && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fadeIn select-none">
          <div className="glass-modal rounded-2xl max-w-sm w-full p-8 text-center space-y-6 animate-glassIn overflow-hidden">
            <div className="h-1.5 -mx-8 -mt-8 mb-4 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-white/40 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 bg-brand-red-500/10 rounded-full flex items-center justify-center text-brand-red-600">
                <Lock size={20} />
              </div>
            </div>
            <div className="space-y-2">
              <span className={eyebrow}>Procesando Pago</span>
              <h4 className="font-display text-xl font-extrabold text-ink-900">
                Simulando Sandbox de MercadoPago
              </h4>
              <p className="text-xs text-ink-700 font-medium px-3 py-2 glass-panel rounded-2xl leading-relaxed">
                {payStep}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal · cancelación */}
      {cancelPedidoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setCancelPedidoId(null)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"
          />
          <form
            onSubmit={handleCancelSubmit}
            className="relative glass-modal rounded-2xl max-w-sm w-full z-10 animate-glassIn overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="h-1.5 bg-gradient-to-r from-danger-500/0 via-danger-500 to-danger-500/0" />

            <div className="flex items-center justify-between p-6 pb-3 border-b border-white/40 shrink-0">
              <div>
                <span className={eyebrow}>Cancelación</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 mt-0.5">
                  Confirmar Cancelación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelPedidoId(null)}
                className="w-9 h-9 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/80 text-ink-700 transition-all duration-150 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {cancelError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium animate-shake backdrop-blur-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <p className="text-sm text-ink-700 leading-relaxed">
                ¿Estás seguro de cancelar tu pedido <strong>#{cancelPedidoId}</strong>?
                El estado cambiará a <strong>CANCELADO</strong> y se repondrá el stock de
                ingredientes al instante.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5">
                  Motivo de Cancelación
                </label>
                <textarea
                  required
                  placeholder="Ej: Me equivoqué de plato / No puedo esperar la demora…"
                  rows={3}
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-white/40 shrink-0 bg-white/30">
              <button
                type="button"
                onClick={() => setCancelPedidoId(null)}
                className="flex-1 glass-panel hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer text-sm"
              >
                Volver atrás
              </button>
              <button
                type="submit"
                disabled={cancelMutation.isPending}
                className="flex-1 bg-danger-500 hover:bg-danger-600 active:bg-danger-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm"
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal · confirmar pago */}
      {payPedidoId !== null && !isPaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setPayPedidoId(null)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"
          />
          <form
            onSubmit={handlePaySubmit}
            className="relative glass-modal rounded-2xl max-w-sm w-full z-10 animate-glassIn overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 pb-3 border-b border-white/40 shrink-0">
              <div>
                <span className={eyebrow}>Abonar Pedido</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 mt-0.5">
                  Proceder a la Pasarela
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayPedidoId(null)}
                className="w-9 h-9 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/80 text-ink-700 transition-all duration-150 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {payError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium animate-shake backdrop-blur-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <p className="text-sm text-ink-700 leading-relaxed">
                Vas a completar de manera segura tu pago pendiente del pedido{' '}
                <strong>#{payPedidoId}</strong> por un total de{' '}
                <strong className="text-brand-red-600">${payTotal.toFixed(2)}</strong>.
              </p>

              <div className="glass-panel rounded-2xl p-4 flex gap-3 text-left">
                <Lock className="text-brand-yellow-700 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-black text-ink-900 uppercase tracking-wider">
                    Conexión Encriptada · Sandbox
                  </span>
                  <p className="text-xs text-ink-700 leading-normal mt-0.5 font-medium">
                    Hacé clic en confirmar para abrir el simulador seguro de MercadoPago y
                    aprobar la transacción de prueba.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-white/40 shrink-0 bg-white/30">
              <button
                type="button"
                onClick={() => setPayPedidoId(null)}
                className="flex-1 glass-panel hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm"
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
