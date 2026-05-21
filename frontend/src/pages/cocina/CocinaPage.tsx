import React, { useEffect, useState, useRef } from 'react';
import { api, extractErrorMessage } from '../../shared/api/axios';
import { useAuthStore } from '../../shared/stores/authStore';
import { 
  Play, Volume2, VolumeX, RefreshCw, Layers, Check, Clock, 
  AlertTriangle, Search, AlertCircle, ShoppingBag, Eye, EyeOff, X 
} from 'lucide-react';

interface DetallePedido {
  id: number;
  producto_id: number;
  nombre_snapshot: string;
  precio_snapshot: number;
  cantidad: number;
  personalizacion: number[];
}

interface Pedido {
  id: number;
  usuario_id: number;
  estado_codigo: string;
  total: number;
  notas: string | null;
  created_at: string;
  items: DetallePedido[];
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
  stock: number;
  imagen_url: string | null;
}

export const CocinaPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'sse' | 'polling'>('offline');
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  
  // Catálogo rápido
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Reloj interno para actualizar timers de semáforo
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Cargar pedidos iniciales y configurar canal
  const fetchPedidos = async () => {
    try {
      const response = await api.get<Pedido[]>('/cocina/pedidos');
      setPedidos(response.data);
      setError(null);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    }
  };

  // Reproducir sonido beep usando Web Audio API
  const playAlertSound = () => {
    if (!isAudioEnabled || isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Sintetizar dos tonos ascendentes y modernos para alerta premium
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Web Audio API falló al reproducir alerta:", e);
    }
  };

  // Activar el Audio Context tras interacción explícita del cocinero
  const enableAudioContext = () => {
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setIsAudioEnabled(true);
      playAlertSound();
    } catch (e) {
      console.error("No se pudo iniciar Web Audio Context:", e);
    }
  };

  // Conectar SSE con fallback resiliente de Polling
  const connectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus('connecting');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    
    // Pasar JWT en query string para EventSource nativo del navegador
    const sseUrl = `${API_URL}/cocina/events?token=${accessToken}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('sse');
      setError(null);
      // Cancelar polling de respaldo ya que el canal real-time está activo
      stopPolling();
    };

    // Escuchar el evento inicial de conexión
    es.addEventListener('connected', () => {
      fetchPedidos();
    });

    const handleNewOrder = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        fetchPedidos();
        playAlertSound();
      } catch (err) {
        console.error("Error procesando payload de evento SSE:", err);
      }
    };

    // Registrar escuchas de eventos KDS
    es.addEventListener('PEDIDO_CONFIRMADO', handleNewOrder);
    es.addEventListener('PEDIDO_EN_PREPARACION', handleNewOrder);
    es.addEventListener('PEDIDO_EN_CAMINO', handleNewOrder);
    es.addEventListener('PEDIDO_CANCELADO', handleNewOrder);

    es.onerror = (e) => {
      console.warn("EventSource SSE experimentó un fallo o desconexión. Activando polling de respaldo...");
      es.close();
      setConnectionStatus('polling');
      
      // Iniciar Polling de respaldo (cada 10 segundos)
      startPolling();
      
      // Intentar reconectar el SSE con backoff
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectSSE();
      }, 10000);
    };
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) return;
    fetchPedidos();
    pollingIntervalRef.current = window.setInterval(() => {
      fetchPedidos();
    }, 10000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchPedidos();
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [accessToken]);

  // Avanzar estado de pedido en la FSM a través de la API
  const handleAvanzarEstado = async (pedidoId: number, nuevoEstado: string) => {
    try {
      await api.patch(`/pedidos/${pedidoId}/estado`, {
        nuevo_estado: nuevoEstado
      });
      // Refrescar pedidos
      fetchPedidos();
    } catch (err: any) {
      alert(`Error al cambiar estado: ${extractErrorMessage(err)}`);
    }
  };

  // Cargar catálogo de productos
  const fetchCatalog = async () => {
    setIsCatalogLoading(true);
    try {
      const response = await api.get<Producto[]>('/productos/admin/all');
      setProductos(response.data);
      setCatalogError(null);
    } catch (err: any) {
      setCatalogError(extractErrorMessage(err));
    } finally {
      setIsCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (isCatalogOpen) {
      fetchCatalog();
    }
  }, [isCatalogOpen]);

  // Togglear disponibilidad de producto
  const handleToggleDisponibilidad = async (productoId: number, disponibleActual: boolean) => {
    try {
      await api.patch(`/productos/${productoId}/disponibilidad`, {
        disponible: !disponibleActual
      });
      // Refrescar lista de catálogo local
      setProductos(prev => 
        prev.map(p => p.id === productoId ? { ...p, disponible: !disponibleActual } : p)
      );
    } catch (err: any) {
      alert(`Error al cambiar disponibilidad: ${extractErrorMessage(err)}`);
    }
  };

  // Clasificación de pedidos por columnas
  const pedidosPorPreparar = pedidos.filter(p => p.estado_codigo === 'CONFIRMADO');
  const pedidosEnPreparacion = pedidos.filter(p => p.estado_codigo === 'EN_PREP');

  // Calcular semáforo de urgencia (RN-CO07)
  const getCardStyle = (createdAtStr: string) => {
    const elapsedMinutes = Math.floor((now.getTime() - new Date(createdAtStr).getTime()) / 60000);
    
    if (elapsedMinutes >= 10) {
      return {
        borderClass: 'border-red-500 shadow-lg shadow-red-500/10 ring-2 ring-red-500/20',
        badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
        bgClass: 'bg-slate-900 border-red-500/30',
        minutes: elapsedMinutes
      };
    } else if (elapsedMinutes >= 5) {
      return {
        borderClass: 'border-amber-500 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/10',
        badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        bgClass: 'bg-slate-900 border-amber-500/30',
        minutes: elapsedMinutes
      };
    } else {
      return {
        borderClass: 'border-slate-800 shadow-sm',
        badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700/50',
        bgClass: 'bg-slate-900/60 border-slate-800',
        minutes: elapsedMinutes
      };
    }
  };

  // Filtrado de catálogo
  const filteredProducts = productos.filter(p => 
    p.nombre.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      {/* HEADER DE CABECERA KDS */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30">
            <Layers className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              KITCHEN DISPLAY SYSTEM
              <span className="text-xs text-orange-500 font-medium px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 uppercase tracking-widest">
                KDS v5.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Control de comandas y producción de cocina en tiempo real</p>
          </div>
        </div>

        {/* CONTROLES DE AUDIO, CONEXION Y CATALOGO */}
        <div className="flex items-center space-x-4">
          {/* Indicador de conexión */}
          <div className="flex items-center space-x-2">
            {connectionStatus === 'sse' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                SSE Activo
              </span>
            )}
            {connectionStatus === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Conectando...
              </span>
            )}
            {connectionStatus === 'polling' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="SSE inestable, realizando consultas HTTP periódicas">
                <AlertTriangle className="h-3 w-3" />
                Respaldo Activo
              </span>
            )}
            {connectionStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Offline
              </span>
            )}
          </div>

          {/* Botón de activación de Audio (evitar bloqueo autoplay) */}
          {!isAudioEnabled ? (
            <button 
              onClick={enableAudioContext}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-orange-600/20 transition-all duration-200"
            >
              <Play className="h-4 w-4" />
              Activar KDS y Alarmas
            </button>
          ) : (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-all duration-200 ${
                isMuted 
                  ? 'border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10' 
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
              title={isMuted ? "Activar Sonido de Alarma" : "Silenciar Alarma"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}

          {/* Botón de Catálogo Rápido */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-2 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            <ShoppingBag className="h-4 w-4 text-orange-500" />
            Control de Platos
          </button>

          {/* Botón refresco manual */}
          <button
            onClick={fetchPedidos}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
            title="Refrescar Comandas"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ERROR GLOBAL SI EXISTE */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 font-bold">Entendido</button>
        </div>
      )}

      {/* CUERPO DEL TABLERO KDS */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* COLUMNA 1: POR PREPARAR */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5">
            <h2 className="text-lg font-bold flex items-center gap-3 text-white">
              <span className="h-3 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
              POR PREPARAR
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {pedidosPorPreparar.length}
              </span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Estado: Confirmado</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {pedidosPorPreparar.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                <Check className="h-12 w-12 text-slate-700 mb-3" />
                <p className="font-semibold text-sm">No hay comandas pendientes de ingreso</p>
                <p className="text-xs text-slate-600 mt-1">Todos los pedidos confirmados están en preparación</p>
              </div>
            ) : (
              pedidosPorPreparar.map(pedido => {
                const s = getCardStyle(pedido.created_at);
                return (
                  <div 
                    key={pedido.id}
                    className={`rounded-xl border transition-all duration-300 ${s.bgClass} ${s.borderClass} p-5 flex flex-col justify-between space-y-4`}
                  >
                    <div>
                      {/* Cabecera Tarjeta */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-500">ORDEN</span>
                          <h3 className="text-lg font-black text-white leading-none">#{pedido.id}</h3>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${s.badgeClass}`}>
                          <Clock className="h-3.5 w-3.5" />
                          {s.minutes} min
                        </div>
                      </div>

                      {/* Items de comida */}
                      <div className="mt-4 space-y-2.5">
                        {pedido.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between text-sm py-1 border-b border-slate-800/30 last:border-0">
                            <div>
                              <div className="font-extrabold text-slate-100 flex items-center gap-2">
                                <span className="text-orange-500 font-black text-base">{item.cantidad}x</span> 
                                {item.nombre_snapshot}
                              </div>
                              {/* Personalización (Exclusiones) */}
                              {item.personalizacion && item.personalizacion.length > 0 && (
                                <div className="text-xs text-rose-400 font-semibold mt-1">
                                  Sin ingredientes ID: {item.personalizacion.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notas de personalización del cliente */}
                      {pedido.notas && (
                        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 font-medium">
                          <span className="font-bold uppercase tracking-wider block mb-1 text-[10px] text-amber-500">Notas de cocina:</span>
                          "{pedido.notas}"
                        </div>
                      )}
                    </div>

                    {/* Botón de acción */}
                    <button
                      onClick={() => handleAvanzarEstado(pedido.id, 'EN_PREP')}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
                    >
                      Empezar Preparación
                      <Play className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMNA 2: EN PREPARACION */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5">
            <h2 className="text-lg font-bold flex items-center gap-3 text-white">
              <span className="h-3 w-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></span>
              EN PREPARACIÓN
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {pedidosEnPreparacion.length}
              </span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Estado: En preparación</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {pedidosEnPreparacion.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                <Layers className="h-12 w-12 text-slate-700 mb-3" />
                <p className="font-semibold text-sm">No hay comandas en cocción</p>
                <p className="text-xs text-slate-600 mt-1">Presioná "Empezar Preparación" en la columna izquierda</p>
              </div>
            ) : (
              pedidosEnPreparacion.map(pedido => {
                const s = getCardStyle(pedido.created_at);
                return (
                  <div 
                    key={pedido.id}
                    className={`rounded-xl border transition-all duration-300 ${s.bgClass} ${s.borderClass} p-5 flex flex-col justify-between space-y-4`}
                  >
                    <div>
                      {/* Cabecera Tarjeta */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-500">ORDEN</span>
                          <h3 className="text-lg font-black text-white leading-none">#{pedido.id}</h3>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${s.badgeClass}`}>
                          <Clock className="h-3.5 w-3.5" />
                          {s.minutes} min
                        </div>
                      </div>

                      {/* Items de comida */}
                      <div className="mt-4 space-y-2.5">
                        {pedido.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between text-sm py-1 border-b border-slate-800/30 last:border-0">
                            <div>
                              <div className="font-extrabold text-slate-100 flex items-center gap-2">
                                <span className="text-orange-500 font-black text-base">{item.cantidad}x</span> 
                                {item.nombre_snapshot}
                              </div>
                              {/* Personalización (Exclusiones) */}
                              {item.personalizacion && item.personalizacion.length > 0 && (
                                <div className="text-xs text-rose-400 font-semibold mt-1">
                                  Sin ingredientes ID: {item.personalizacion.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notas de personalización del cliente */}
                      {pedido.notas && (
                        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 font-medium">
                          <span className="font-bold uppercase tracking-wider block mb-1 text-[10px] text-amber-500">Notas de cocina:</span>
                          "{pedido.notas}"
                        </div>
                      )}
                    </div>

                    {/* Botón de acción */}
                    <button
                      onClick={() => handleAvanzarEstado(pedido.id, 'EN_CAMINO')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                    >
                      Listo para Entrega
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* MODAL / SLIDE-OVER DRAWER DE PRODUCTOS Y DISPONIBILIDAD */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl relative">
            
            {/* Cabecera Drawer */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="text-orange-500 h-5 w-5" />
                  Control de Platos
                </h3>
                <p className="text-xs text-slate-400 mt-1">Pausá la disponibilidad de platos sin stock de insumos</p>
              </div>
              <button 
                onClick={() => setIsCatalogOpen(false)}
                className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Caja de Búsqueda */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/55">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar platos en el catálogo..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            {/* Contenido Catalogo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {catalogError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{catalogError}</span>
                </div>
              )}

              {isCatalogLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mb-3" />
                  <p className="text-xs font-semibold">Cargando catálogo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-xs text-slate-600 py-10">No se encontraron productos coincidentes</p>
              ) : (
                filteredProducts.map(producto => (
                  <div 
                    key={producto.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all duration-200 ${
                      producto.disponible 
                        ? 'border-slate-800 bg-slate-900/40' 
                        : 'border-rose-500/20 bg-rose-500/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-sm font-extrabold truncate ${producto.disponible ? 'text-white' : 'text-rose-400 line-through'}`}>
                        {producto.nombre}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{producto.descripcion || 'Sin descripción'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-orange-500 font-bold">${producto.precio}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                          Stock: {producto.stock}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleDisponibilidad(producto.id, producto.disponible)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        producto.disponible
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {producto.disponible ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Reactivar
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
