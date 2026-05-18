import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShoppingBag, 
  CheckCircle,
  Truck,
  Store,
  Plus,
  AlertCircle,
  Sparkles,
  Lock,
  DollarSign,
  X
} from 'lucide-react';

import { useCartStore } from '../shared/stores/cartStore';
import { useAuthStore } from '../shared/stores/authStore';
import { direccionesApi } from '../shared/api/direcciones';
import { pedidosApi } from '../shared/api/pedidos';
import type { CrearPedidoRequest } from '../shared/api/pedidos';
import { pagosApi } from '../shared/api/pagos';
import { extractErrorMessage } from '../shared/api/axios';
import type { DireccionEntrega } from '../shared/types';
import { useConfigStore } from '../shared/stores/configStore';
import { configuracionApi } from '../shared/api/configuracion';
import { Logo } from '../shared/ui/Logo';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { items: cartItems, getTotalPrice, clearCart } = useCartStore();

  const { setConfigs, costoEnvio: costoEnvioStore, estadoLocal } = useConfigStore();

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configuraciones'],
    queryFn: configuracionApi.getPublicConfiguraciones,
  });

  React.useEffect(() => {
    if (publicConfigs) {
      const costoEnvioItem = publicConfigs.find(c => c.key === 'costo_envio');
      const estadoLocalItem = publicConfigs.find(c => c.key === 'estado_local');

      const costoVal = costoEnvioItem ? parseFloat(costoEnvioItem.value) : 150.00;
      const estadoVal = estadoLocalItem && (estadoLocalItem.value === 'abierto' || estadoLocalItem.value === 'cerrado')
        ? estadoLocalItem.value
        : 'abierto';

      setConfigs(costoVal, estadoVal);
    }
  }, [publicConfigs, setConfigs]);

  React.useEffect(() => {
    if (cartItems.length === 0 && !checkoutSuccess) {
      navigate('/');
    }
  }, [cartItems]);

  const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY' | 'TAKE_AWAY'>('DELIVERY');
  const [selectedDireccionId, setSelectedDireccionId] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'MERCADOPAGO' | 'EFECTIVO' | 'TRANSFERENCIA'>('MERCADOPAGO');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [createdPedidoId, setCreatedPedidoId] = useState<number | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardBrand, setCardBrand] = useState<'VISA' | 'MASTERCARD' | 'UNKNOWN'>('UNKNOWN');

  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [newCalle, setNewCalle] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newPiso, setNewPiso] = useState('');
  const [newDepto, setNewDepto] = useState('');
  const [newIndicaciones, setNewIndicaciones] = useState('');
  const [addrError, setAddrError] = useState<string | null>(null);

  const { data: direcciones = [], isLoading: isLoadingDirs } = useQuery<DireccionEntrega[]>({
    queryKey: ['direcciones'],
    queryFn: direccionesApi.getDirecciones,
    meta: {
      onSuccess: (data: DireccionEntrega[]) => {
        const principal = data.find(d => d.es_principal);
        if (principal) {
          setSelectedDireccionId(principal.id);
        } else if (data.length > 0) {
          setSelectedDireccionId(data[0].id);
        }
      }
    }
  });

  React.useEffect(() => {
    if (direcciones.length > 0) {
      const exists = direcciones.some(d => d.id === selectedDireccionId);
      if (!exists) {
        const principal = direcciones.find(d => d.es_principal);
        setSelectedDireccionId(principal ? principal.id : direcciones[0].id);
      }
    } else {
      setSelectedDireccionId(null);
    }
  }, [direcciones, selectedDireccionId]);

  const createAddressMutation = useMutation({
    mutationFn: direccionesApi.crearDireccion,
    onSuccess: (newDir) => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
      setSelectedDireccionId(newDir.id);
      setIsAddrModalOpen(false);
      setNewCalle('');
      setNewNumero('');
      setNewPiso('');
      setNewDepto('');
      setNewIndicaciones('');
    },
    onError: (err: any) => {
      setAddrError(extractErrorMessage(err));
    }
  });

  const costoEnvio = tipoEntrega === 'DELIVERY' ? costoEnvioStore : 0.00;
  const subtotal = getTotalPrice();
  const total = subtotal + costoEnvio;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    
    if (value.startsWith('4')) setCardBrand('VISA');
    else if (value.startsWith('5')) setCardBrand('MASTERCARD');
    else setCardBrand('UNKNOWN');

    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  const handleAddAddressInline = (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    if (!newCalle.trim()) return setAddrError('La calle es obligatoria');
    if (!newNumero.trim()) return setAddrError('El número es obligatorio');

    createAddressMutation.mutate({
      alias: 'Dirección de Entrega',
      calle: newCalle.trim(),
      numero: newNumero.trim(),
      piso_depto: [newPiso.trim(), newDepto.trim()].filter(Boolean).join(' ') || null,
      ciudad: 'CABA',
      codigo_postal: '1000',
      es_principal: direcciones.length === 0,
    });
  };

  const handleConfirmPurchase = async () => {
    setGlobalError(null);

    if (estadoLocal === 'cerrado') {
      return setGlobalError('El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos en este momento.');
    }

    if (tipoEntrega === 'DELIVERY' && !selectedDireccionId) {
      return setGlobalError('Debes ingresar o seleccionar una dirección de envío');
    }

    if (metodoPago === 'MERCADOPAGO') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16) return setGlobalError('El número de tarjeta debe tener 16 dígitos');
      if (!cardName.trim()) return setGlobalError('El nombre del titular es obligatorio');
      if (cardExpiry.length < 5) return setGlobalError('La fecha de vencimiento es inválida (MM/YY)');
      if (cardCvv.length < 3) return setGlobalError('El código CVV es obligatorio');
    }

    setIsProcessing(true);
    setProcessingStep('1. Creando pedido en backend...');

    try {
      const forma_pago_codigo = metodoPago === 'MERCADOPAGO' ? 'MP' : 'EFECTIVO';
      const pedidoPayload: CrearPedidoRequest = {
        items: cartItems.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizacion: item.exclusiones.length > 0 ? item.exclusiones.map(Number) : null
        })),
        forma_pago_codigo,
        direccion_id: tipoEntrega === 'DELIVERY' ? selectedDireccionId : null,
        notas: null
      };

      const pedido = await pedidosApi.crearPedido(pedidoPayload);
      setCreatedPedidoId(pedido.id);

      if (metodoPago === 'EFECTIVO' || metodoPago === 'TRANSFERENCIA') {
        setProcessingStep('2. Finalizando transacción...');
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        clearCart();
        setCheckoutSuccess(true);
        setIsProcessing(false);
      } else {
        setProcessingStep('2. Creando preferencia en MercadoPago...');
        const pagoResponse = await pagosApi.crearPago(pedido.id);
        
        setProcessingStep('3. Conectando con MercadoPago Sandbox...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setProcessingStep('4. Aprobando transacción bancaria segura...');
        const mockPaymentId = `test_checkout_${Math.floor(Math.random() * 100000000)}`;
        await pagosApi.simularWebhook(mockPaymentId, 'approved', pagoResponse.external_reference);

        setProcessingStep('5. Verificando inventarios y descontando stock...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        clearCart();
        setCheckoutSuccess(true);
        setIsProcessing(false);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setGlobalError(extractErrorMessage(err));
    }
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.15em] text-brand-red-500';
  const cardBase = 'bg-paper-0 border border-paper-200 rounded-lg shadow-sm';
  const inputBase = 'w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150';
  const labelBase = 'block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5';

  if (checkoutSuccess) {
    return (
      <div className="min-h-screen bg-paper-50 flex flex-col font-sans items-center justify-center p-6 select-none relative overflow-hidden">
        <svg aria-hidden="true" className="absolute -top-10 -left-10 w-72 h-72 opacity-10 pointer-events-none" viewBox="0 0 200 200" fill="none">
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round"/>
        </svg>
        
        <div className="max-w-md w-full bg-paper-0 rounded-2xl border border-paper-200 shadow-lg p-8 text-center space-y-6 animate-scaleUp z-10">
          <div className="w-24 h-24 bg-brand-yellow-400 rounded-full flex items-center justify-center text-ink-900 mx-auto shadow-md">
            <CheckCircle size={48} className="stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-ink-900 tracking-tight">¡Pedido Confirmado!</h1>
            <p className="text-sm text-ink-700 leading-relaxed px-4">
              {metodoPago === 'MERCADOPAGO' 
                ? 'Tu pago ha sido aprobado. El restaurante ya está preparando tu orden.'
                : 'Tu pedido ha sido registrado con éxito. Prepará el pago correspondiente al retirar o recibir tu envío.'}
            </p>
          </div>

          <div className="bg-paper-50 border border-paper-200 p-4 rounded-md text-left space-y-2">
            <div className="flex justify-between text-sm text-ink-700 font-semibold">
              <span>Pedido ID:</span>
              <span className="text-ink-900 font-bold">#{createdPedidoId}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-700 font-semibold">
              <span>Método Pago:</span>
              <span className="text-ink-900 font-bold">{metodoPago}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-700 font-semibold border-t border-paper-200 pt-2">
              <span>Total Abonado:</span>
              <span className="text-brand-red-500 font-black text-lg tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={() => navigate('/pedidos')}
              className="w-full bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold py-3.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              Ver mis pedidos
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-paper-0 border-2 border-ink-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold py-3 rounded-md transition-all duration-150 cursor-pointer"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col font-sans">
      
      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-paper-0 border-b-2 border-brand-yellow-400 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            <Logo size="md" variant="red" />
          </Link>
          <div>
            <span className="font-black text-ink-900 text-lg leading-tight block">Food Store</span>
            <span className={`block ${eyebrow}`}>Checkout Seguro</span>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-red-500 font-semibold transition-colors"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Volver al menú</span>
        </Link>
      </header>

      {/* STEPPER VISUAL */}
      <div className="w-full bg-paper-0 border-b border-paper-200 py-4 px-6 flex justify-center items-center gap-2 md:gap-4 overflow-x-auto shrink-0">
         <span className="bg-brand-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0">Dirección</span>
         <span className="text-paper-300">→</span>
         <span className="bg-brand-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0">Pago</span>
         <span className="text-paper-300">→</span>
         <span className="bg-paper-200 text-ink-500 text-xs font-bold px-3 py-1.5 rounded-full shrink-0">Confirmación</span>
      </div>

      {/* CUERPO DE LA PAGINA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: LÓGICA DE CHECOUT (2/3 de pantalla) */}
        <section className="lg:col-span-2 space-y-6 min-w-0">
          
          {globalError && (
            <div className="bg-danger-50 border border-danger-100 text-danger-700 text-sm px-4 py-3 rounded-md flex items-start gap-2.5 font-medium leading-relaxed">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {/* 1. TIPO DE ENTREGA */}
          <div className={`${cardBase} p-6 space-y-4`}>
            <h3 className={eyebrow + " flex items-center gap-2"}>
              <Truck size={14} />
              <span>1. Método de Entrega</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoEntrega('DELIVERY')}
                className={`py-4 px-4 border rounded-md font-bold text-sm flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  tipoEntrega === 'DELIVERY'
                    ? 'bg-brand-red-50 border-2 border-brand-red-500 text-brand-red-700'
                    : 'bg-paper-0 border-2 border-paper-200 text-ink-600 hover:bg-paper-50'
                }`}
              >
                <Truck size={24} />
                <span>Envío a Domicilio</span>
              </button>
              <button
                onClick={() => setTipoEntrega('TAKE_AWAY')}
                className={`py-4 px-4 border rounded-md font-bold text-sm flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  tipoEntrega === 'TAKE_AWAY'
                    ? 'bg-brand-red-50 border-2 border-brand-red-500 text-brand-red-700'
                    : 'bg-paper-0 border-2 border-paper-200 text-ink-600 hover:bg-paper-50'
                }`}
              >
                <Store size={24} />
                <span>Retiro en Local</span>
              </button>
            </div>

            {/* SELECCIÓN DE DIRECCIÓN (SÓLO SI ES DELIVERY) */}
            {tipoEntrega === 'DELIVERY' && (
              <div className="pt-4 border-t border-paper-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={labelBase + " mb-0"}>Dirección de envío:</span>
                  <button
                    onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                    className="text-[11px] text-brand-red-500 hover:text-brand-red-600 font-bold cursor-pointer flex items-center gap-1 hover:underline uppercase tracking-wider"
                  >
                    <Plus size={12} />
                    <span>Agregar dirección rápida</span>
                  </button>
                </div>

                {direcciones.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-paper-300 rounded-md p-4 bg-paper-50 space-y-3">
                    <p className="text-sm text-ink-500 font-medium">No tienes ninguna dirección registrada.</p>
                    <button
                      onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                      className="bg-paper-0 border-2 border-ink-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
                    >
                      Registrar Dirección
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {direcciones.map(dir => (
                      <div
                        key={dir.id}
                        onClick={() => setSelectedDireccionId(dir.id)}
                        className={`p-4 border rounded-md cursor-pointer select-none transition-all ${
                          selectedDireccionId === dir.id
                            ? 'bg-brand-red-50 border-2 border-brand-red-500 text-brand-red-900'
                            : 'bg-paper-0 border-2 border-paper-200 hover:bg-paper-50 text-ink-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider">{dir.alias}</span>
                          {dir.es_principal && (
                            <span className="text-[10px] bg-brand-yellow-400 text-ink-900 font-bold px-2 py-0.5 rounded-full">
                              Fav
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold">{dir.calle} {dir.numero}</p>
                        {dir.piso_depto && <p className="text-xs text-ink-500 mt-1">{dir.piso_depto}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tipoEntrega === 'TAKE_AWAY' && (
              <div className="bg-brand-yellow-50 border border-brand-yellow-200 p-4 rounded-md flex gap-3 text-left mt-4">
                <Store className="text-brand-yellow-700 shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="text-sm font-bold text-ink-900">Retirás en:</span>
                  <p className="text-xs text-ink-700 leading-relaxed mt-1">
                    Av. Rivadavia 1420, Balvanera, CABA.<br />
                    Tu pedido estará listo en aproximadamente <strong>20 - 30 minutos</strong>. ¡Te avisaremos por el rastreador!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. METODO DE PAGO */}
          <div className={`${cardBase} p-6 space-y-4`}>
            <h3 className={eyebrow + " flex items-center gap-2"}>
              <CreditCard size={14} />
              <span>2. Medio de Pago</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'MERCADOPAGO', name: 'MercadoPago', icon: <CreditCard size={20} /> },
                { id: 'EFECTIVO', name: 'Efectivo', icon: <DollarSign size={20} /> },
                { id: 'TRANSFERENCIA', name: 'Transferencia', icon: <Sparkles size={20} /> }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setMetodoPago(p.id as any)}
                  className={`py-3 px-3 border rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    metodoPago === p.id
                      ? 'bg-brand-red-50 border-2 border-brand-red-500 text-brand-red-700'
                      : 'bg-paper-0 border-2 border-paper-200 text-ink-600 hover:bg-paper-50'
                  }`}
                >
                  {p.icon}
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* BRICK DE TARJETA INTERACTIVA DE MERCADOPAGO */}
            {metodoPago === 'MERCADOPAGO' && (
              <div className="pt-5 border-t border-paper-200 space-y-6 animate-slideDown">
                
                {/* Visual Card Mock */}
                <div className="w-full max-w-sm mx-auto aspect-video bg-ink-900 rounded-xl p-5 text-paper-0 flex flex-col justify-between shadow-md relative overflow-hidden select-none">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-7 bg-brand-yellow-400 rounded-md border border-brand-yellow-500 shadow-inner flex items-center justify-center"></div>
                    <span className="font-black italic text-sm tracking-widest text-paper-300">
                      {cardBrand === 'VISA' ? 'VISA' : cardBrand === 'MASTERCARD' ? 'mastercard' : 'MOCK SANDBOX'}
                    </span>
                  </div>

                  <div className="text-xl font-mono tracking-widest font-bold py-1">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex items-end justify-between font-mono text-xs tracking-wider uppercase text-paper-300">
                    <div className="truncate pr-4 max-w-[200px]">
                      <span className="block text-[10px] font-sans font-bold">Titular:</span>
                      <span className="font-bold text-paper-0 truncate">{cardName || 'JUAN PEREZ'}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] font-sans font-bold">Vence:</span>
                      <span className="font-bold text-paper-0">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                {/* Formulario del Brick */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-success-600 font-bold border-b border-paper-200 pb-2">
                    <Lock size={14} />
                    <span>Tarjeta de Crédito o Débito (Simulador Sandbox MP)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Número de Tarjeta</label>
                      <input
                        type="text"
                        placeholder="4509 9501 •••• ••••"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Nombre Impreso</label>
                      <input
                        type="text"
                        placeholder="Ej: JUAN PEREZ"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        className={inputBase}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Vencimiento (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className={inputBase + " text-center"}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Código CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        className={inputBase + " text-center"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {metodoPago === 'EFECTIVO' && (
              <div className="bg-brand-yellow-50 border border-brand-yellow-200 p-4 rounded-md text-sm text-ink-900 leading-relaxed font-medium animate-slideDown mt-4">
                💵 Abonarás en <strong>efectivo</strong> al momento de recibir el pedido (o al retirarlo en nuestro local). Por favor, ten listo el monto exacto para agilizar la entrega.
              </div>
            )}

            {metodoPago === 'TRANSFERENCIA' && (
              <div className="bg-info-50 border border-info-200 p-4 rounded-md text-sm text-ink-900 space-y-2 leading-relaxed font-medium animate-slideDown mt-4">
                <span className="block font-bold text-info-700">Datos bancarios para transferencia:</span>
                <p className="text-xs">
                  <strong>Banco</strong>: Galicia<br />
                  <strong>CBU</strong>: 0070001120000003429810<br />
                  <strong>Alias</strong>: foodstore.utn.sdd<br />
                  <strong>Monto</strong>: ${total.toFixed(2)}
                </p>
                <p className="text-[11px] text-info-600 italic pt-2 border-t border-info-200">
                  Una vez que confirmes el checkout, coordinaremos vía email o teléfono el envío de tu comprobante de transferencia.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: RESUMEN DE COMPRA (1/3 de pantalla) */}
        <aside className={`${cardBase} p-6 space-y-6 sticky top-24`}>
          <h3 className={eyebrow + " flex items-center gap-2 pb-3 border-b border-paper-200"}>
            <ShoppingBag size={14} />
            <span>Resumen del Pedido</span>
          </h3>

          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {cartItems.map(item => (
              <div key={item.cart_item_key} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-ink-900 block truncate">{item.nombre}</span>
                    <span className="text-xs text-ink-500 block font-medium">Cant: {item.cantidad} x ${Number(item.precio).toFixed(2)}</span>
                  </div>
                  <span className="font-black text-ink-900 shrink-0">${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
                {item.exclusiones_nombres && item.exclusiones_nombres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.exclusiones_nombres.map((name, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        🚫 Sin {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-paper-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-ink-500 font-semibold">
              <span>Subtotal:</span>
              <span className="text-ink-900 font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-500 font-semibold">
              <span>Costo de envío:</span>
              <span className="text-ink-900 font-bold">
                {costoEnvio === 0 ? '$0.00 (Retiro)' : `$${costoEnvio.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-base text-ink-900 font-black border-t border-paper-200 pt-3">
              <span>Total:</span>
              <span className="text-brand-red-500 font-black tabular-nums text-2xl">${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleConfirmPurchase}
            disabled={estadoLocal === 'cerrado'}
            className="w-full bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-4 rounded-md shadow-brand hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 text-base"
          >
            <Lock size={18} />
            <span>{estadoLocal === 'cerrado' ? 'Local Cerrado temporalmente' : 'Confirmar y Comprar'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-400 font-bold uppercase tracking-wider">
            <Lock size={12} className="text-success-600" />
            <span>Encriptación Segura de Extremo a Extremo</span>
          </div>
        </aside>
      </main>

      {/* MODAL MOCK DE CARGA / PROCESANDO TRANSACCIÓN */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-paper-0 rounded-xl max-w-sm w-full shadow-lg p-8 text-center space-y-6 animate-scaleUp border border-paper-200">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-paper-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div className="space-y-2">
              <span className={eyebrow}>Transacción Segura</span>
              <h4 className="font-bold text-ink-900 text-sm">Procesando tu pedido</h4>
              <p className="text-[11px] text-ink-700 font-medium px-2 py-1.5 bg-paper-50 border border-paper-200 rounded-md leading-relaxed">
                {processingStep}
              </p>
            </div>

            <p className="text-xs text-ink-500 leading-relaxed max-w-xs mx-auto">
              No cierres la ventana ni recargues el navegador. Estamos validando la pasarela bancaria e impactando stock de ingredientes.
            </p>
          </div>
        </div>
      )}

      {/* MODAL RAPIDO AGREGAR DIRECCIÓN INLINE */}
      {isAddrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setIsAddrModalOpen(false)} className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm"></div>
          <form 
            onSubmit={handleAddAddressInline}
            className="relative bg-paper-0 rounded-xl max-w-sm w-full shadow-lg p-6 z-10 space-y-5 animate-scaleUp border border-paper-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-200">
              <div>
                <span className={eyebrow}>Dirección Express</span>
                <h3 className="font-bold text-ink-900 text-sm mt-0.5">Agregar Dirección Rápida</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddrModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {addrError && (
              <div className="bg-danger-50 border border-danger-100 text-danger-700 text-sm px-4 py-3 rounded-md flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{addrError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelBase}>Calle</label>
                  <input
                    type="text" required placeholder="Ej: Av. Rivadavia" value={newCalle} onChange={e => setNewCalle(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Número</label>
                  <input
                    type="text" required placeholder="Ej: 1420" value={newNumero} onChange={e => setNewNumero(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Piso (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: 3" value={newPiso} onChange={e => setNewPiso(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Depto (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: B" value={newDepto} onChange={e => setNewDepto(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Indicaciones (Opcional)</label>
                <textarea
                  placeholder="Ej: Tocar timbre 'B'..." rows={2} value={newIndicaciones} onChange={e => setNewIndicaciones(e.target.value)}
                  className={inputBase + " resize-none"}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-paper-200 shrink-0">
              <button
                type="button" onClick={() => setIsAddrModalOpen(false)}
                className="flex-1 bg-paper-0 border border-paper-200 hover:bg-paper-50 hover:border-ink-900 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={createAddressMutation.isPending}
                className="flex-1 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
              >
                {createAddressMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
