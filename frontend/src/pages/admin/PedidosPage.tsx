import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  ArrowRight,
  XCircle,
  MapPin,
  Truck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Store,
} from 'lucide-react';

import { AdminLayout } from '../../shared/ui/AdminLayout';
import { pedidosApi } from '../../shared/api/pedidos';
import type { Pedido, EstadoPedido } from '../../shared/types';

export const PedidosPage = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedTipoEntrega, setSelectedTipoEntrega] = useState<string>('TODOS');

  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  const [advancePedido, setAdvancePedido] = useState<Pedido | null>(null);
  const [advanceMotivo, setAdvanceMotivo] = useState('');
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const [cancelPedidoId, setCancelPedidoId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: pedidosData, isLoading, isError } = useQuery<any>({
    queryKey: ['admin-pedidos'],
    queryFn: pedidosApi.getPedidos,
    refetchInterval: 5000,
  });

  const pedidos: Pedido[] = Array.isArray(pedidosData)
    ? pedidosData
    : pedidosData?.items || [];

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
    },
  });

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
    },
  });

  const toggleExpand = (id: number) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getNextLogicalState = (current: EstadoPedido): EstadoPedido | null => {
    switch (current) {
      case 'PENDIENTE': return 'CONFIRMADO';
      case 'CONFIRMADO': return 'EN_PREP';
      case 'EN_PREP': return 'EN_CAMINO';
      case 'EN_CAMINO': return 'ENTREGADO';
      default: return null;
    }
  };

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
      case 'EN_PREP':
        return 'bg-brand-yellow-100 text-brand-yellow-800 border-brand-yellow-300';
      case 'CONFIRMADO':
      case 'EN_CAMINO':
        return 'bg-info-50 text-info-700 border-info-200';
      case 'ENTREGADO':
        return 'bg-success-50 text-success-700 border-success-100';
      case 'CANCELADO':
        return 'bg-danger-50 text-danger-700 border-danger-200';
      default:
        return 'bg-paper-100 text-ink-700 border-paper-200';
    }
  };

  const filteredPedidos = pedidos.filter(ped => {
    const matchesSearch =
      ped.id.toString().includes(searchTerm) ||
      ped.usuario_id.toString().includes(searchTerm);
    const matchesEstado = selectedEstado === 'TODOS' || ped.estado === selectedEstado;
    const matchesTipo = selectedTipoEntrega === 'TODOS' || ped.tipo_entrega === selectedTipoEntrega;
    return matchesSearch && matchesEstado && matchesTipo;
  });

  const cardBase = 'bg-paper-0 border border-paper-200 rounded-2xl shadow-card';
  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-ink-500';
  const inputBase =
    'w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/15 transition-colors duration-150';

  return (
    <AdminLayout
      title="Administración de Pedidos (FSM)"
      subtitle="Control de órdenes, bitácoras de auditoría y stock interactivo"
    >
      {/* FILTROS */}
      <div className={`${cardBase} p-5 flex flex-col md:flex-row gap-4 items-center justify-between`}>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Pedido ID o Usuario ID…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputBase} pl-10`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <FilterChip icon={<Filter size={14} />} label="Estado">
            <select
              value={selectedEstado}
              onChange={e => setSelectedEstado(e.target.value)}
              className="bg-transparent text-sm font-semibold text-ink-700 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="EN_PREP">En Preparación</option>
              <option value="EN_CAMINO">En Camino</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </FilterChip>

          <FilterChip icon={<Truck size={14} />} label="Entrega">
            <select
              value={selectedTipoEntrega}
              onChange={e => setSelectedTipoEntrega(e.target.value)}
              className="bg-transparent text-sm font-semibold text-ink-700 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos</option>
              <option value="DELIVERY">Delivery</option>
              <option value="TAKE_AWAY">Take Away</option>
            </select>
          </FilterChip>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-ink-500 font-bold text-sm">Cargando tablero operativo…</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800 text-sm">Tablero caído</h3>
            <p className="text-xs text-danger-700 mt-1">
              No se pudo cargar la base de pedidos. Revisá el log de tu servidor FastAPI.
            </p>
          </div>
        </div>
      ) : filteredPedidos.length === 0 ? (
        <div className={`${cardBase} p-12 text-center max-w-sm mx-auto space-y-3`}>
          <AlertCircle size={44} className="mx-auto text-ink-300 stroke-1" />
          <h3 className="font-display text-lg font-bold text-ink-700">Sin coincidencias</h3>
          <p className="text-xs text-ink-500">
            No hay ningún pedido activo con los filtros o ID de búsqueda ingresados.
          </p>
        </div>
      ) : (
        <div className={`${cardBase} overflow-hidden`}>
          {/* Header de tabla */}
          <div className="hidden sm:grid grid-cols-12 gap-4 bg-cream-100 text-brand-red-700 text-[11px] font-black uppercase tracking-[0.18em] px-6 py-3.5 border-b border-paper-200">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Usuario · Fecha</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2">Entrega</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          <div className="divide-y divide-paper-200">
            {filteredPedidos.map(ped => {
              const isExpanded = expandedOrders[ped.id] ?? false;
              const nextState = getNextLogicalState(ped.estado);
              const isCancelable = ped.estado !== 'CANCELADO' && ped.estado !== 'ENTREGADO';

              return (
                <div key={ped.id} className="hover:bg-cream-50 transition-colors">
                  <div className="p-4 sm:px-6 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center flex flex-col gap-3">
                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="font-black text-ink-900 bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-lg text-xs tabular-nums">
                        #{ped.id}
                      </span>
                      <span className="sm:hidden font-display text-base font-black text-brand-red-600 tabular-nums">
                        ${Number(ped.total).toFixed(2)}
                      </span>
                    </div>

                    <div className="sm:col-span-3">
                      <span className="font-bold text-ink-900 block text-sm">
                        Usuario #{ped.usuario_id}
                      </span>
                      <span className="text-[10px] text-ink-500 font-medium">
                        {new Date(ped.fecha_pedido).toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span
                        className={`inline-flex items-center text-[10px] font-black tracking-widest uppercase px-2.5 py-1 border rounded-full ${getStatusBadge(ped.estado)}`}
                      >
                        {ped.estado.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-ink-500 inline-flex items-center gap-1">
                        {ped.tipo_entrega === 'DELIVERY' ? (
                          <><Truck size={11} /> Envío</>
                        ) : (
                          <><Store size={11} /> Retiro</>
                        )}
                      </span>
                    </div>

                    <div className="hidden sm:block sm:col-span-1 text-right">
                      <span className="font-display text-base font-black text-brand-red-600 tabular-nums">
                        ${Number(ped.total).toFixed(2)}
                      </span>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleExpand(ped.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-900 hover:bg-paper-100 transition-colors"
                        title="Ver detalles"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {nextState && (
                        <button
                          onClick={() => {
                            setAdvancePedido(ped);
                            setAdvanceMotivo('');
                            setAdvanceError(null);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-yellow-700 hover:text-brand-yellow-800 hover:bg-brand-yellow-50 transition-colors"
                          title={`Avanzar a ${nextState.replace('_', ' ')}`}
                        >
                          <ArrowRight size={16} />
                        </button>
                      )}

                      {isCancelable && (
                        <button
                          onClick={() => {
                            setCancelPedidoId(ped.id);
                            setCancelMotivo('');
                            setCancelError(null);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-danger-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title="Cancelar pedido"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandible */}
                  {isExpanded && (
                    <div className="px-6 py-5 bg-cream-50 border-t border-paper-200 text-sm animate-slideDown">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <span className={eyebrow}>Ítems del pedido</span>
                          <div className="divide-y divide-paper-200 bg-paper-0 border border-paper-200 rounded-xl overflow-hidden">
                            {ped.detalles.map(det => (
                              <div
                                key={det.id}
                                className="p-3 flex items-start justify-between gap-3 text-xs leading-normal"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-ink-900 block truncate">
                                    {det.producto_nombre}
                                  </span>
                                  <span className="text-[10px] text-ink-500 font-medium">
                                    Cant: {det.cantidad} × ${Number(det.precio_unitario).toFixed(2)}
                                  </span>
                                  {det.personalizacion && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {det.personalizacion.split(',').map((exId, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-200 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
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

                          {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                            <div className="bg-paper-0 border border-paper-200 rounded-xl p-3">
                              <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                <MapPin size={10} />
                                <span>Dirección de entrega</span>
                              </span>
                              <p className="text-xs text-ink-900 font-semibold">
                                {ped.direccion_snapshot}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <span className={eyebrow}>Historial de auditoría</span>
                          {ped.historial && ped.historial.length > 0 ? (
                            <div className="bg-paper-0 border border-paper-200 rounded-xl p-4 space-y-3">
                              {ped.historial.map(hist => (
                                <div
                                  key={hist.id}
                                  className="text-xs leading-relaxed relative pl-4"
                                >
                                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-brand-red-500 ring-4 ring-brand-red-500/15" />
                                  <p className="font-bold text-ink-900">
                                    Transición:{' '}
                                    <span className="text-[9px] bg-paper-100 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">
                                      {hist.estado_origen}
                                    </span>{' '}
                                    →{' '}
                                    <span className="text-[9px] bg-paper-100 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">
                                      {hist.estado_destino}
                                    </span>
                                  </p>
                                  <p className="text-ink-500 text-[10px] mt-0.5">
                                    {new Date(hist.fecha_cambio).toLocaleString('es-AR')}
                                    {hist.operador_email && ` · Op: ${hist.operador_email}`}
                                  </p>
                                  {hist.motivo && (
                                    <p className="text-[10px] text-ink-700 font-medium bg-paper-50 border border-paper-200 p-2 rounded-lg mt-1.5">
                                      Motivo: {hist.motivo}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-ink-400 italic">No hay historial de cambios.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal · Avanzar */}
      {advancePedido !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setAdvancePedido(null)}
            className="fixed inset-0 bg-ink-900/55 backdrop-blur-sm"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = getNextLogicalState(advancePedido.estado);
              if (next) {
                advanceMutation.mutate({ id: advancePedido.id, nuevo_estado: next, motivo: advanceMotivo });
              }
            }}
            className="relative bg-paper-0 rounded-2xl max-w-sm w-full shadow-xl z-10 animate-scaleUp border border-paper-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 pb-3 border-b border-paper-200 shrink-0">
              <div>
                <span className={eyebrow}>Avanzar FSM</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 mt-0.5">
                  Avanzar Estado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdvancePedido(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {advanceError && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium animate-shake">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{advanceError}</span>
                </div>
              )}

              <p className="text-sm text-ink-700 leading-relaxed">
                Vas a avanzar el pedido <strong>#{advancePedido.id}</strong> desde el estado{' '}
                <span className="font-bold text-ink-700 bg-paper-100 px-1.5 py-0.5 rounded border border-paper-200 text-xs">
                  {advancePedido.estado}
                </span>{' '}
                a{' '}
                <span className="font-bold text-brand-red-700 bg-brand-red-50 px-1.5 py-0.5 rounded border border-brand-red-200 text-xs">
                  {getNextLogicalState(advancePedido.estado)}
                </span>.
              </p>

              <div>
                <label className="text-xs text-ink-600 font-bold uppercase tracking-[0.16em] block mb-1.5">
                  Motivo operativo (opcional)
                </label>
                <textarea
                  placeholder="Ej: Plato en horno / Cadete asignado para envío…"
                  rows={2}
                  value={advanceMotivo}
                  onChange={e => setAdvanceMotivo(e.target.value)}
                  className={`${inputBase} resize-none`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-paper-200 shrink-0 bg-paper-50">
              <button
                type="button"
                onClick={() => setAdvancePedido(null)}
                className="flex-1 py-2.5 bg-paper-0 border-2 border-paper-200 hover:border-ink-700 hover:bg-paper-100 text-ink-900 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit"
                disabled={advanceMutation.isPending}
                className="flex-1 py-2.5 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold rounded-xl text-sm shadow-brand active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                {advanceMutation.isPending ? 'Guardando…' : 'Avanzar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal · Cancelar */}
      {cancelPedidoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setCancelPedidoId(null)}
            className="fixed inset-0 bg-ink-900/55 backdrop-blur-sm"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!cancelMotivo.trim()) return setCancelError('El motivo de cancelación es obligatorio.');
              cancelMutation.mutate({ id: cancelPedidoId, motivo: cancelMotivo.trim() });
            }}
            className="relative bg-paper-0 rounded-2xl max-w-sm w-full shadow-xl z-10 animate-scaleUp border border-paper-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="h-1.5 bg-gradient-to-r from-danger-500/0 via-danger-500 to-danger-500/0" />

            <div className="flex items-center justify-between p-6 pb-3 border-b border-paper-200 shrink-0">
              <div>
                <span className={eyebrow}>Tablero de control</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 mt-0.5">
                  Cancelar Pedido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelPedidoId(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {cancelError && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-medium animate-shake">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <p className="text-sm text-ink-700 leading-relaxed">
                ¿Estás seguro de cancelar el pedido <strong>#{cancelPedidoId}</strong>?
                Esta acción es irreversible y queda asentada en la bitácora.
              </p>

              <div>
                <label className="text-xs text-ink-600 font-bold uppercase tracking-[0.16em] block mb-1.5">
                  Motivo de cancelación (obligatorio)
                </label>
                <textarea
                  required
                  placeholder="Ej: Falta de ingredientes / Dirección inexistente…"
                  rows={3}
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  className={`${inputBase} resize-none`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-paper-200 shrink-0 bg-paper-50">
              <button
                type="button"
                onClick={() => setCancelPedidoId(null)}
                className="flex-1 py-2.5 bg-paper-0 border-2 border-paper-200 hover:border-ink-700 hover:bg-paper-100 text-ink-900 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit"
                disabled={cancelMutation.isPending}
                className="flex-1 py-2.5 bg-danger-500 hover:bg-danger-600 text-white font-bold rounded-xl text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

const FilterChip = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 bg-paper-0 border border-paper-200 px-3 py-2 rounded-xl shadow-xs">
    <span className="text-ink-400">{icon}</span>
    <span className="text-[10px] text-ink-500 font-black uppercase tracking-wider">{label}:</span>
    {children}
  </div>
);
