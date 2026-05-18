import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  CreditCard, 
  ChevronLeft, 
  ShoppingBag, 
  Home, 
  CheckCircle,
  Truck,
  Store,
  User,
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
import type { DireccionEntrega, DireccionEntregaCreate, CartItem } from '../shared/types';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { items: cartItems, getTotalPrice, clearCart } = useCartStore();

  // Redirigir si no hay ítems en el carrito
  React.useEffect(() => {
    if (cartItems.length === 0 && !checkoutSuccess) {
      navigate('/');
    }
  }, [cartItems]);

  // Estados locales de Checkout
  const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY' | 'TAKE_AWAY'>('DELIVERY');
  const [selectedDireccionId, setSelectedDireccionId] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'MERCADOPAGO' | 'EFECTIVO' | 'TRANSFERENCIA'>('MERCADOPAGO');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [createdPedidoId, setCreatedPedidoId] = useState<number | null>(null);
  
  // Estado de procesamiento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Estados del Brick de Tarjeta Simulada (MercadoPago)
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardBrand, setCardBrand] = useState<'VISA' | 'MASTERCARD' | 'UNKNOWN'>('UNKNOWN');

  // Estados para modal rápido de agregar dirección inline
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [newCalle, setNewCalle] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newPiso, setNewPiso] = useState('');
  const [newDepto, setNewDepto] = useState('');
  const [newIndicaciones, setNewIndicaciones] = useState('');
  const [addrError, setAddrError] = useState<string | null>(null);

  // Query - Obtener direcciones del cliente
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

  // Auto-seleccionar dirección al cargar o si la seleccionada es inválida/borrada
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

  // Mutación - Crear Dirección Inline
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

  // Costo de envío dinámico
  const costoEnvio = tipoEntrega === 'DELIVERY' ? 50.00 : 0.00;
  const subtotal = getTotalPrice();
  const total = subtotal + costoEnvio;

  // Lógica del formato del número de tarjeta para MercadoPago Brick
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    
    // Detectar marca
    if (value.startsWith('4')) setCardBrand('VISA');
    else if (value.startsWith('5')) setCardBrand('MASTERCARD');
    else setCardBrand('UNKNOWN');

    // Formatear en bloques de 4
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
      es_principal: direcciones.length === 0, // Si es la primera, marcar principal
    });
  };

  const handleConfirmPurchase = async () => {
    setGlobalError(null);

    // Validar dirección si es Delivery
    if (tipoEntrega === 'DELIVERY' && !selectedDireccionId) {
      return setGlobalError('Debes ingresar o seleccionar una dirección de envío');
    }

    // Validar tarjeta si es MercadoPago
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
      // 1. Crear el Pedido en estado PENDIENTE
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

      // 2. Procesar según método de pago
      if (metodoPago === 'EFECTIVO' || metodoPago === 'TRANSFERENCIA') {
        setProcessingStep('2. Finalizando transacción...');
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simular retraso elegante
        
        // Limpiar store del carrito
        clearCart();
        setCheckoutSuccess(true);
        setIsProcessing(false);
      } else {
        // MercadoPago
        setProcessingStep('2. Creando preferencia en MercadoPago...');
        const pagoResponse = await pagosApi.crearPago(pedido.id);
        
        setProcessingStep('3. Conectando con MercadoPago Sandbox...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setProcessingStep('4. Aprobando transacción bancaria segura...');
        // Simular el Webhook de aprobación asíncrona directamente al backend (CE-09 end-to-end)
        const mockPaymentId = `test_checkout_${Math.floor(Math.random() * 100000000)}`;
        await pagosApi.simularWebhook(mockPaymentId, 'approved', pagoResponse.external_reference);

        setProcessingStep('5. Verificando inventarios y descontando stock...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Limpiar store del carrito
        clearCart();
        setCheckoutSuccess(true);
        setIsProcessing(false);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setGlobalError(extractErrorMessage(err));
    }
  };

  if (checkoutSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 flex flex-col font-sans items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 text-center space-y-6 animate-scaleUp">
          <div className="w-20 h-20 bg-green-50 border border-green-200/50 rounded-2xl flex items-center justify-center text-green-500 mx-auto animate-bounce">
            <CheckCircle size={44} className="stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-green-600 tracking-widest uppercase font-black bg-green-50 px-3 py-1 rounded-full border border-green-200/20">
              Compra Exitosa
            </span>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight pt-1">¡Gracias por tu compra!</h2>
            <p className="text-xs text-gray-500 leading-relaxed px-4">
              {metodoPago === 'MERCADOPAGO' 
                ? 'Tu pago de MercadoPago ha sido aprobado. El restaurante ya está cocinando tu orden y descontando el stock correspondiente.'
                : 'Tu pedido ha sido registrado con éxito. Prepará el pago correspondiente al retirar o recibir tu envío.'}
            </p>
          </div>

          <div className="bg-orange-50/50 border border-orange-100/50 p-4 rounded-2xl text-left space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Pedido ID:</span>
              <span className="text-gray-800 font-black">#{createdPedidoId}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Método Pago:</span>
              <span className="text-gray-800 font-black">{metodoPago}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold border-t border-orange-100/40 pt-1.5">
              <span>Total Abonado:</span>
              <span className="text-orange-600 font-black">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={() => navigate('/pedidos')}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer"
            >
              Rastrear mi Pedido
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 border border-gray-250 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="block text-[10px] text-orange-600 tracking-widest uppercase font-black">Checkout Seguro</span>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-500 font-bold transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Volver al Menú</span>
        </Link>
      </header>

      {/* CUERPO DE LA PAGINA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: LÓGICA DE CHECOUT (2/3 de pantalla) */}
        <section className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* TÍTULO */}
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Finalizar tu Pedido</h2>
            <p className="text-xs text-gray-500">Selecciona el método de entrega y abona de forma segura</p>
          </div>

          {globalError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs px-4 py-3 rounded-2xl flex items-start gap-2.5 font-medium leading-relaxed">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {/* 1. TIPO DE ENTREGA */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xxs space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <Truck size={14} className="text-orange-500" />
              <span>1. Método de Entrega</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoEntrega('DELIVERY')}
                className={`py-3 px-4 border rounded-2xl font-extrabold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  tipoEntrega === 'DELIVERY'
                    ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-xxs'
                    : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Truck size={20} />
                <span>Envío a Domicilio</span>
              </button>
              <button
                onClick={() => setTipoEntrega('TAKE_AWAY')}
                className={`py-3 px-4 border rounded-2xl font-extrabold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  tipoEntrega === 'TAKE_AWAY'
                    ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-xxs'
                    : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Store size={20} />
                <span>Retiro en Local</span>
              </button>
            </div>

            {/* SELECCIÓN DE DIRECCIÓN (SÓLO SI ES DELIVERY) */}
            {tipoEntrega === 'DELIVERY' && (
              <div className="pt-3 border-t border-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dirección de envío:</span>
                  <button
                    onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                    className="text-[10px] text-orange-600 hover:text-orange-700 font-black cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    <Plus size={12} />
                    <span>Agregar dirección rápida</span>
                  </button>
                </div>

                {direcciones.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-orange-200/50 rounded-2xl p-4 bg-orange-50/10 space-y-3">
                    <p className="text-[11px] text-gray-500">No tienes ninguna dirección registrada.</p>
                    <button
                      onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                      className="py-1.5 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-extrabold rounded-xl text-[10px] transition-colors cursor-pointer"
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
                        className={`p-3.5 border rounded-2xl cursor-pointer select-none transition-all ${
                          selectedDireccionId === dir.id
                            ? 'bg-orange-50/50 border-orange-500 text-orange-950 font-bold shadow-xxs'
                            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-orange-600">{dir.alias}</span>
                          {dir.es_principal && (
                            <span className="text-[8px] bg-orange-100 text-orange-800 border border-orange-200/20 font-black px-1.5 py-0.5 rounded-md">
                              Fav
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-800 font-bold truncate">{dir.calle} {dir.numero}</p>
                        {dir.piso_depto && <p className="text-[9px] text-gray-400 truncate mt-0.5">{dir.piso_depto}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tipoEntrega === 'TAKE_AWAY' && (
              <div className="bg-orange-50/30 border border-orange-100/50 p-4 rounded-2xl flex gap-3 text-left">
                <Store className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-black text-orange-950">Retirás en:</span>
                  <p className="text-[11px] text-orange-900 leading-normal mt-0.5">
                    Av. Rivadavia 1420, Balvanera, CABA.<br />
                    Tu pedido estará listo en aproximadamente **20 - 30 minutos**. ¡Te avisaremos por el rastreador!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. METODO DE PAGO */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xxs space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <CreditCard size={14} className="text-orange-500" />
              <span>2. Medio de Pago</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'MERCADOPAGO', name: 'MercadoPago', icon: <CreditCard size={16} /> },
                { id: 'EFECTIVO', name: 'Efectivo', icon: <DollarSign size={16} /> },
                { id: 'TRANSFERENCIA', name: 'Transferencia', icon: <Sparkles size={16} /> }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setMetodoPago(p.id as any)}
                  className={`py-2.5 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    metodoPago === p.id
                      ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-xxs'
                      : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.icon}
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* BRICK DE TARJETA INTERACTIVA DE MERCADOPAGO */}
            {metodoPago === 'MERCADOPAGO' && (
              <div className="pt-4 border-t border-gray-50 space-y-5 animate-slideDown">
                
                {/* Visual Card Mock */}
                <div className="w-full max-w-sm mx-auto aspect-video bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group select-none">
                  {/* Chip & Brand */}
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-7 bg-gradient-to-br from-amber-200 to-amber-400 rounded-md border border-amber-300 opacity-80 shadow-inner flex items-center justify-center"></div>
                    <span className="font-black italic text-sm tracking-widest text-amber-500">
                      {cardBrand === 'VISA' ? 'VISA' : cardBrand === 'MASTERCARD' ? 'mastercard' : 'MOCK SANDBOX'}
                    </span>
                  </div>

                  {/* Card Number */}
                  <div className="text-lg font-mono tracking-widest text-slate-100 font-bold py-1">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  {/* Card Holder & Expiry */}
                  <div className="flex items-end justify-between font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                    <div className="truncate pr-4 max-w-[200px]">
                      <span className="block text-[8px] text-slate-500 font-sans font-bold">Titular:</span>
                      <span className="font-bold text-slate-200 truncate">{cardName || 'JUAN PEREZ'}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[8px] text-slate-500 font-sans font-bold">Vence:</span>
                      <span className="font-bold text-slate-200">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                {/* Formulario del Brick */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-bold border-b border-gray-50 pb-1.5">
                    <Lock size={12} className="text-green-600" />
                    <span>Tarjeta de Crédito o Débito (Simulador Sandbox MP)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Número de Tarjeta:</label>
                      <input
                        type="text"
                        placeholder="4509 9501 •••• ••••"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Nombre Impreso:</label>
                      <input
                        type="text"
                        placeholder="Ej: JUAN PEREZ"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Vencimiento (MM/YY):</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Código de Seguridad (CVV):</label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {metodoPago === 'EFECTIVO' && (
              <div className="bg-orange-50/20 border border-orange-100/50 p-4 rounded-2xl text-[11px] text-orange-950 leading-relaxed font-medium animate-slideDown">
                💵 Abonarás en **efectivo** al momento de recibir el pedido (o al retirarlo en nuestro local). Por favor, ten listo el monto exacto para agilizar la entrega.
              </div>
            )}

            {metodoPago === 'TRANSFERENCIA' && (
              <div className="bg-orange-50/20 border border-orange-100/50 p-4 rounded-2xl text-[11px] text-orange-950 space-y-1.5 leading-relaxed font-medium animate-slideDown">
                <span className="block font-extrabold text-orange-900">Datos bancarios para transferencia:</span>
                <p>
                  **Banco**: Galicia<br />
                  **CBU**: 0070001120000003429810<br />
                  **Alias**: foodstore.utn.sdd<br />
                  **Monto**: ${total.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-400 italic pt-1 border-t border-orange-100/30">
                  Una vez que confirmes el checkout, coordinaremos vía email o teléfono el envío de tu comprobante de transferencia.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: RESUMEN DE COMPRA (1/3 de pantalla) */}
        <aside className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs space-y-6">
          <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2 pb-3 border-b border-gray-50">
            <ShoppingBag size={14} className="text-orange-500" />
            <span>Resumen del Pedido</span>
          </h3>

          {/* Listado de ítems en miniatura */}
          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {cartItems.map(item => (
              <div key={item.cart_item_key} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-extrabold text-gray-800 block truncate">{item.nombre}</span>
                    <span className="text-[10px] text-gray-400 block font-medium">Cant: {item.cantidad} x ${Number(item.precio).toFixed(2)}</span>
                  </div>
                  <span className="font-black text-gray-700 shrink-0">${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
                {item.exclusiones_nombres && item.exclusiones_nombres.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {item.exclusiones_nombres.map((name, i) => (
                      <span key={i} className="text-[8px] font-extrabold text-gray-500 bg-gray-50 border border-gray-100 px-1 py-0.2 rounded-md shrink-0">
                        🚫 Sin {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cuentas / Totales */}
          <div className="border-t border-gray-50 pt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Subtotal:</span>
              <span className="text-gray-800 font-extrabold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Costo de envío:</span>
              <span className="text-gray-800 font-extrabold">
                {costoEnvio === 0 ? '$0.00 (Retiro)' : `$${costoEnvio.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-800 font-black border-t border-gray-100 pt-3">
              <span>Total:</span>
              <span className="text-orange-600 font-black text-base">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Botón de Confirmar Compra */}
          <button
            onClick={handleConfirmPurchase}
            className="w-full py-4.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-orange-500/10 active:scale-98 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Lock size={14} />
            <span>Confirmar y Comprar</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            <Lock size={10} className="text-green-600" />
            <span>Encriptación Segura de Extremo a Extremo</span>
          </div>
        </aside>
      </main>

      {/* MODAL MOCK DE CARGA / PROCESANDO TRANSACCIÓN */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gray-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-8 text-center space-y-6 animate-scaleUp">
            
            {/* Spinner animado official MP style */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black">Transacción Segura</span>
              <h4 className="font-extrabold text-gray-800 text-sm">Procesando tu pedido</h4>
              <p className="text-[10px] text-gray-400 font-bold px-2 py-1 bg-gray-50 border border-gray-100 rounded-xl leading-relaxed">
                {processingStep}
              </p>
            </div>

            <p className="text-[9px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              No cierres la ventana ni recargues el navegador. Estamos validando la pasarela bancaria e impactando stock de ingredientes.
            </p>
          </div>
        </div>
      )}

      {/* MODAL RAPIDO AGREGAR DIRECCIÓN INLINE */}
      {isAddrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setIsAddrModalOpen(false)} className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"></div>
          <form 
            onSubmit={handleAddAddressInline}
            className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black block">Dirección Express</span>
                <h3 className="font-extrabold text-gray-800 text-sm mt-0.5">Agregar Dirección Rápida</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddrModalOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {addrError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{addrError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Calle:</label>
                  <input
                    type="text" required placeholder="Ej: Av. Rivadavia" value={newCalle} onChange={e => setNewCalle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Número:</label>
                  <input
                    type="text" required placeholder="Ej: 1420" value={newNumero} onChange={e => setNewNumero(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Piso (Opcional):</label>
                  <input
                    type="text" placeholder="Ej: 3" value={newPiso} onChange={e => setNewPiso(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Depto (Opcional):</label>
                  <input
                    type="text" placeholder="Ej: B" value={newDepto} onChange={e => setNewDepto(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Indicaciones (Opcional):</label>
                <textarea
                  placeholder="Ej: Tocar timbre 'B'..." rows={2} value={newIndicaciones} onChange={e => setNewIndicaciones(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 leading-normal font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-50 shrink-0">
              <button
                type="button" onClick={() => setIsAddrModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-[10px] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={createAddressMutation.isPending}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-[10px] shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
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
