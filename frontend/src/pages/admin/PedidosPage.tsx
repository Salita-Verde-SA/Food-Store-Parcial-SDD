import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Filter,
  ArrowRight,
  XCircle,
  MapPin,
  Truck,
  Store,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X
} from 'lucide-react';

import { useAuthStore } from '../../shared/stores/authStore';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { pedidosApi } from '../../shared/api/pedidos';
import type { Pedido, EstadoPedido } from '../../shared/types';

export const PedidosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

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

  // Filtrado de pedidos en memoria
  const filteredPedidos = pedidos.filter(ped => {
    const matchesSearch = 
      ped.id.toString().includes(searchTerm) || 
      ped.usuario_id.toString().includes(searchTerm);

    const matchesEstado = 
      selectedEstado === 'TODOS' || 
      ped.estado === selectedEstado;

    const matchesTipo = 
      selectedTipoEntrega === 'TODOS' || 
      ped.tipo_entrega === selectedTipoEntrega;

    return matchesSearch && matchesEstado && matchesTipo;
  });

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";
  const eyebrow = "text-[11px] font-black uppercase tracking-[0.15em] text-ink-500";
  const inputBase = "w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150";

  return (
    <AdminLayout 
      title="Administración de Pedidos (FSM)" 
      subtitle="Control de órdenes, bitácoras de auditoría y stock interactivo"
    >
      {/* BARRA DE FILTROS */}
      <div className={`${cardBase} p-5 flex flex-col md:flex-row gap-4 items-center justify-between mb-6`}>
        {/* Buscador */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por Pedido ID o Usuario ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-paper-50 border border-paper-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-red-500/20 focus:border-brand-red-500 text-sm text-ink-900 placeholder-ink-400"
          />
        </div>

        {/* Selectores */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Estado */}
          <div className="flex items-center gap-2 bg-paper-50 border border-paper-200 px-3 py-2 rounded-md">
            <Filter size={14} className="text-ink-400" />
            <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider">Estado:</span>
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
          </div>

          {/* Tipo Entrega */}
          <div className="flex items-center gap-2 bg-paper-50 border border-paper-200 px-3 py-2 rounded-md">
            <Truck size={14} className="text-ink-400" />
            <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider">Entrega:</span>
            <select
              value={selectedTipoEntrega}
              onChange={e => setSelectedTipoEntrega(e.target.value)}
              className="bg-transparent text-sm font-semibold text-ink-700 focus:outline-none cursor-pointer"
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
          <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-ink-500 font-bold text-sm">Cargando tablero operativo...</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-100 rounded-md p-6 flex items-start gap-4">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800 text-sm">Tablero Caído</h3>
            <p className="text-xs text-danger-700 mt-1">No se pudo cargar la base de pedidos. Revisa el log de tu servidor FastAPI.</p>
          </div>
        </div>
      ) : filteredPedidos.length === 0 ? (
        <div className={`${cardBase} p-12 text-center max-w-sm mx-auto space-y-3`}>
          <AlertCircle size={44} className="mx-auto text-ink-300 stroke-1" />
          <h3 className="font-bold text-ink-700 text-sm">Sin coincidencias</h3>
          <p className="text-xs text-ink-400">No hay ningún pedido activo con los filtros o ID de búsqueda ingresados.</p>
        </div>
      ) : (
        <div className={`${cardBase} overflow-hidden`}>
          {/* Header de Tabla */}
          <div className="hidden sm:grid grid-cols-12 gap-4 bg-brand-red-50 text-brand-red-700 text-[11px] font-black uppercase tracking-wider px-6 py-4 border-b border-paper-200">
            <div className="col-span-2">ID</div>
            <div className="col-span-3">Usuario / Fecha</div>
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
                <div key={ped.id} className="hover:bg-paper-50 transition-colors">
                  {/* Fila Principal */}
                  <div className="p-4 sm:px-6 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center flex flex-col gap-3">
                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="font-black text-ink-900 bg-paper-100 border border-paper-200 px-2.5 py-1 rounded-md text-xs">
                        #{ped.id}
                      </span>
                      {/* En móvil: mostrar total aquí */}
                      <span className="sm:hidden text-sm font-black text-brand-red-500">${Number(ped.total).toFixed(2)}</span>
                    </div>

                    <div className="sm:col-span-3">
                      <span className="font-bold text-ink-700 block text-sm">Usuario: {ped.usuario_id}</span>
                      <span className="text-[10px] text-ink-400 font-medium">{new Date(ped.fecha_pedido).toLocaleString('es-AR')}</span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className={`inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 border rounded-full ${getStatusBadge(ped.estado)}`}>
                        {ped.estado.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-ink-500">
                        {ped.tipo_entrega === 'DELIVERY' ? '🏍️ Envío' : '🏪 Retiro'}
                      </span>
                    </div>

                    <div className="hidden sm:block sm:col-span-1 text-right">
                      <span className="text-sm font-black text-brand-red-500">${Number(ped.total).toFixed(2)}</span>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleExpand(ped.id)}
                        className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-paper-100 transition-colors"
                        title="Ver detalles"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      
                      {nextState && (
                        <button
                          onClick={() => { setAdvancePedido(ped); setAdvanceMotivo(''); setAdvanceError(null); }}
                          className="p-1.5 rounded-md text-brand-yellow-600 hover:text-brand-yellow-700 hover:bg-brand-yellow-50 transition-colors"
                          title={`Avanzar a ${nextState.replace('_', ' ')}`}
                        >
                          <ArrowRight size={16} />
                        </button>
                      )}

                      {isCancelable && (
                        <button
                          onClick={() => { setCancelPedidoId(ped.id); setCancelMotivo(''); setCancelError(null); }}
                          className="p-1.5 rounded-md text-danger-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title="Cancelar Pedido"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalles Expandibles */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-paper-50 border-t border-paper-200 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Detalles de platos */}
                        <div className="space-y-3">
                          <span className={eyebrow}>Ítems del pedido</span>
                          <div className="divide-y divide-paper-200 bg-paper-0 border border-paper-200 rounded-md overflow-hidden">
                            {ped.detalles.map(det => (
                              <div key={det.id} className="p-3 flex items-start justify-between gap-3 text-xs leading-normal">
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-ink-900 block truncate">{det.producto_nombre}</span>
                                  <span className="text-[10px] text-ink-500 font-medium">Cant: {det.cantidad} x ${Number(det.precio_unitario).toFixed(2)}</span>
                                  {det.personalizacion && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {det.personalizacion.split(',').map((exId, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                          🚫 Sin ingrediente #{exId}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="font-black text-ink-900 shrink-0">${Number(det.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          {ped.tipo_entrega === 'DELIVERY' && ped.direccion_snapshot && (
                            <div className="mt-4 bg-paper-0 border border-paper-200 rounded-md p-3">
                              <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                <MapPin size={10} />
                                <span>Dirección de entrega (Snapshot):</span>
                              </span>
                              <p className="text-xs text-ink-900 font-semibold">{ped.direccion_snapshot}</p>
                            </div>
                          )}
                        </div>

                        {/* Audit Trail de estados */}
                        <div className="space-y-3">
                          <span className={eyebrow}>Historial de auditoría interna</span>
                          {ped.historial && ped.historial.length > 0 ? (
                            <div className="bg-paper-0 border border-paper-200 rounded-md p-4 space-y-3">
                              {ped.historial.map((hist, idx) => (
                                <div key={hist.id} className="text-xs leading-relaxed relative pl-3.5">
                                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-brand-red-500"></div>
                                  <p className="font-bold text-ink-900">
                                    Transición: <span className="text-[9px] bg-paper-100 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">{hist.estado_origen}</span> ➔ <span className="text-[9px] bg-paper-100 border border-paper-200 px-1.5 py-0.5 rounded font-black text-ink-700">{hist.estado_destino}</span>
                                  </p>
                                  <p className="text-ink-500 text-[10px] mt-0.5">
                                    {new Date(hist.fecha_change || hist.fecha_cambio).toLocaleString('es-AR')} 
                                    {hist.operador_email && ` · Operador: ${hist.operador_email}`}
                                  </p>
                                  {hist.motivo && (
                                    <p className="text-[10px] text-ink-700 font-medium bg-paper-50 border border-paper-200 p-2 rounded-md mt-1.5">
                                      💬 Motivo: {hist.motivo}
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


      {/* MODAL AVANZAR ESTADO */}
      {advancePedido !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setAdvancePedido(null)} className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
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
            className={`${cardBase} p-6 relative max-w-sm w-full z-10 space-y-5 animate-scaleUp`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div>
                <span className={eyebrow}>Avanzar FSM</span>
                <h3 className="font-black text-ink-900 text-lg mt-0.5">Avanzar Estado</h3>
              </div>
              <button type="button" onClick={() => setAdvancePedido(null)} className="p-1.5 rounded-md hover:bg-paper-100 text-ink-400 hover:text-brand-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {advanceError && (
              <div className="bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3.5 py-2.5 rounded-md flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0 animate-pulse" />
                <span>{advanceError}</span>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-ink-700 leading-normal">
                Vas a avanzar el pedido <strong>#{advancePedido.id}</strong> de su estado <span className="font-bold text-ink-700 bg-paper-100 px-1.5 py-0.5 rounded border border-paper-200 text-xs">{advancePedido.estado}</span> a <span className="font-bold text-brand-red-600 bg-brand-red-50 px-1.5 py-0.5 rounded border border-brand-red-200 text-xs">{getNextLogicalState(advancePedido.estado)}</span>.
              </p>
              <div>
                <label className="text-xs text-ink-600 font-bold uppercase tracking-wider block mb-1.5">Motivo Operativo (Opcional):</label>
                <textarea
                  placeholder="Ej: Plato en horno / Cadete asignado para envío..."
                  rows={2}
                  value={advanceMotivo}
                  onChange={e => setAdvanceMotivo(e.target.value)}
                  className={inputBase + " resize-none"}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-paper-200 shrink-0">
              <button
                type="button" onClick={() => setAdvancePedido(null)}
                className="flex-1 py-2 bg-paper-0 border border-ink-200 hover:bg-paper-50 text-ink-700 font-semibold rounded-md text-sm transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit" disabled={advanceMutation.isPending}
                className="flex-1 py-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold rounded-md text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
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
          <div onClick={() => setCancelPedidoId(null)} className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!cancelMotivo.trim()) return setCancelError('El motivo de cancelación es obligatorio.');
              cancelMutation.mutate({ id: cancelPedidoId, motivo: cancelMotivo.trim() });
            }}
            className={`${cardBase} p-6 relative max-w-sm w-full z-10 space-y-5 animate-scaleUp`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div>
                <span className={eyebrow}>Tablero de Control</span>
                <h3 className="font-black text-ink-900 text-lg mt-0.5">Cancelar Pedido</h3>
              </div>
              <button type="button" onClick={() => setCancelPedidoId(null)} className="p-1.5 rounded-md hover:bg-paper-100 text-ink-400 hover:text-brand-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {cancelError && (
              <div className="bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3.5 py-2.5 rounded-md flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0 animate-pulse" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-ink-700 leading-normal font-medium">
                ¿Estás seguro de cancelar el pedido <strong>#{cancelPedidoId}</strong>? Esta es una acción irreversible que anulará la transacción e impactará la bitácora interna.
              </p>
              <div>
                <label className="text-xs text-ink-600 font-bold uppercase tracking-wider block mb-1.5">Motivo de Cancelación (Obligatorio):</label>
                <textarea
                  required
                  placeholder="Ej: Falta de ingredientes de última hora / No se encuentra la dirección del cliente..."
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
                className="flex-1 py-2 bg-paper-0 border border-ink-200 hover:bg-paper-50 text-ink-700 font-semibold rounded-md text-sm transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="submit" disabled={cancelMutation.isPending}
                className="flex-1 py-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold rounded-md text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};
