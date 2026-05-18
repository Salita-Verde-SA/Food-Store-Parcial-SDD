import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShoppingBag,
  CheckCircle,
  Truck,
  Store,
  Plus,
  AlertCircle,
  Sparkles,
  Lock,
  DollarSign,
  X,
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
import { ClientHeader } from '../shared/ui/ClientHeader';
import { ClientFooter } from '../shared/ui/ClientFooter';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useAuthStore();
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
      const estadoVal =
        estadoLocalItem && (estadoLocalItem.value === 'abierto' || estadoLocalItem.value === 'cerrado')
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

  const { data: direcciones = [] } = useQuery<DireccionEntrega[]>({
    queryKey: ['direcciones'],
    queryFn: direccionesApi.getDirecciones,
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
      setNewCalle(''); setNewNumero(''); setNewPiso(''); setNewDepto(''); setNewIndicaciones('');
    },
    onError: (err: any) => {
      setAddrError(extractErrorMessage(err));
    },
  });

  const costoEnvio = tipoEntrega === 'DELIVERY' ? costoEnvioStore : 0.0;
  const subtotal = getTotalPrice();
  const total = subtotal + costoEnvio;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    if (value.startsWith('4')) setCardBrand('VISA');
    else if (value.startsWith('5')) setCardBrand('MASTERCARD');
    else setCardBrand('UNKNOWN');
    setCardNumber(value.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
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
    setProcessingStep('1. Creando pedido en backend…');

    try {
      const forma_pago_codigo = metodoPago === 'MERCADOPAGO' ? 'MP' : 'EFECTIVO';
      const pedidoPayload: CrearPedidoRequest = {
        items: cartItems.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizacion: item.exclusiones.length > 0 ? item.exclusiones.map(Number) : null,
        })),
        forma_pago_codigo,
        direccion_id: tipoEntrega === 'DELIVERY' ? selectedDireccionId : null,
        notas: null,
      };

      const pedido = await pedidosApi.crearPedido(pedidoPayload);
      setCreatedPedidoId(pedido.id);

      if (metodoPago === 'EFECTIVO' || metodoPago === 'TRANSFERENCIA') {
        setProcessingStep('2. Finalizando transacción…');
        await new Promise(resolve => setTimeout(resolve, 1200));
        clearCart();
        setCheckoutSuccess(true);
        setIsProcessing(false);
      } else {
        setProcessingStep('2. Creando preferencia en MercadoPago…');
        const pagoResponse = await pagosApi.crearPago(pedido.id);
        setProcessingStep('3. Conectando con MercadoPago Sandbox…');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProcessingStep('4. Aprobando transacción bancaria segura…');
        const mockPaymentId = `test_checkout_${Math.floor(Math.random() * 100000000)}`;
        await pagosApi.simularWebhook(mockPaymentId, 'approved', pagoResponse.external_reference);
        setProcessingStep('5. Verificando inventarios y descontando stock…');
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

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';
  const labelBase = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  /* ── Pantalla de éxito ── */
  if (checkoutSuccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <ClientHeader eyebrow="Pedido Confirmado" showBackToMenu />

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-warm-mesh opacity-50 pointer-events-none" />

          <div className="relative z-10 max-w-md w-full glass-modal rounded-2xl p-8 text-center space-y-6 animate-glassIn">
            <div className="w-24 h-24 bg-success-50/80 ring-4 ring-success-100/60 rounded-2xl flex items-center justify-center text-success-600 mx-auto backdrop-blur-sm">
              <CheckCircle size={52} className="stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-3xl font-black text-ink-900 tracking-tight">
                ¡Pedido Confirmado!
              </h1>
              <p className="text-sm text-ink-600 leading-relaxed px-4">
                {metodoPago === 'MERCADOPAGO'
                  ? 'Tu pago ha sido aprobado. El restaurante ya está preparando tu orden.'
                  : 'Tu pedido ha sido registrado con éxito. Prepará el pago correspondiente al retirar o recibir tu envío.'}
              </p>
            </div>

            <div className="bg-white/50 border border-white/40 p-4 rounded-2xl text-left space-y-2 backdrop-blur-sm">
              <div className="flex justify-between text-sm text-ink-700 font-semibold">
                <span>Pedido ID:</span>
                <span className="text-ink-900 font-black">#{createdPedidoId}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-700 font-semibold">
                <span>Método de Pago:</span>
                <span className="text-ink-900 font-bold">{metodoPago}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-700 font-semibold border-t border-white/40 pt-2 mt-2">
                <span>Total Abonado:</span>
                <span className="font-display text-brand-red-600 font-black text-xl tabular-nums">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => navigate('/pedidos')}
                className="w-full bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold py-3.5 rounded-2xl shadow-yellow hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                Ver mis pedidos
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full glass-panel rounded-2xl hover:bg-white/80 text-ink-900 font-semibold py-3 transition-all duration-150 cursor-pointer"
              >
                Volver al Menú
              </button>
            </div>
          </div>
        </main>

        <ClientFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ClientHeader eyebrow="Checkout Seguro" showBackToMenu />

      {/* Stepper */}
      <div className="w-full glass-header py-4 px-4 sm:px-6 shrink-0 sticky top-[65px] z-30">
        <div className="max-w-5xl mx-auto flex justify-center items-center gap-2 sm:gap-3">
          <Step label="Dirección" status="done" index={1} />
          <StepDivider done />
          <Step label="Pago" status="active" index={2} />
          <StepDivider />
          <Step label="Confirmación" status="pending" index={3} />
        </div>
      </div>

      {/* Cuerpo */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUMNA IZQUIERDA */}
        <section className="lg:col-span-2 space-y-5 min-w-0">
          {globalError && (
            <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 text-sm px-4 py-3 rounded-2xl flex items-start gap-2.5 font-medium leading-relaxed animate-shake backdrop-blur-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {/* 1 · TIPO DE ENTREGA */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <header className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-red-500/10 text-brand-red-600 flex items-center justify-center shrink-0">
                <Truck size={16} />
              </span>
              <h3 className={eyebrow}>01 · Método de Entrega</h3>
            </header>

            <div className="grid grid-cols-2 gap-3">
              <DeliveryButton
                active={tipoEntrega === 'DELIVERY'}
                onClick={() => setTipoEntrega('DELIVERY')}
                icon={<Truck size={26} />}
                title="Envío a Domicilio"
                sub="20 – 35 min · CABA"
              />
              <DeliveryButton
                active={tipoEntrega === 'TAKE_AWAY'}
                onClick={() => setTipoEntrega('TAKE_AWAY')}
                icon={<Store size={26} />}
                title="Retiro en Local"
                sub="Av. Rivadavia 1420"
              />
            </div>

            {tipoEntrega === 'DELIVERY' && (
              <div className="pt-5 border-t border-white/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`${labelBase} mb-0`}>Dirección de envío</span>
                  <button
                    onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                    className="text-[11px] text-brand-red-600 hover:text-brand-red-700 font-black cursor-pointer flex items-center gap-1 hover:underline uppercase tracking-wider"
                  >
                    <Plus size={12} />
                    <span>Agregar rápida</span>
                  </button>
                </div>

                {direcciones.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/40 rounded-2xl p-4 bg-white/20 space-y-3 backdrop-blur-sm">
                    <p className="text-sm text-ink-500 font-medium">
                      No tenés ninguna dirección registrada.
                    </p>
                    <button
                      onClick={() => { setAddrError(null); setIsAddrModalOpen(true); }}
                      className="glass-panel rounded-xl hover:bg-white/80 text-ink-900 font-semibold px-4 py-2 transition-all duration-150 cursor-pointer text-sm"
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
                        className={`p-4 rounded-2xl cursor-pointer select-none transition-all ${
                          selectedDireccionId === dir.id
                            ? 'bg-brand-red-500/10 border-2 border-brand-red-400/50 text-brand-red-900 shadow-sm backdrop-blur-sm'
                            : 'glass-panel hover:bg-white/70 text-ink-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {dir.alias}
                          </span>
                          {dir.es_principal && (
                            <span className="text-[10px] bg-brand-yellow-400 text-ink-900 font-black px-2 py-0.5 rounded-full">
                              Fav
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold leading-tight">
                          {dir.calle} {dir.numero}
                        </p>
                        {dir.piso_depto && (
                          <p className="text-xs text-ink-500 mt-1">{dir.piso_depto}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tipoEntrega === 'TAKE_AWAY' && (
              <div className="bg-brand-yellow-50/60 border border-brand-yellow-200/50 p-4 rounded-2xl flex gap-3 text-left mt-4 animate-fadeIn backdrop-blur-sm">
                <Store className="text-brand-yellow-700 shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="text-sm font-black text-ink-900">Retirás en:</span>
                  <p className="text-xs text-ink-700 leading-relaxed mt-1">
                    Av. Rivadavia 1420, Balvanera, CABA.<br />
                    Tu pedido estará listo en aproximadamente{' '}
                    <strong className="text-ink-900">20 – 30 minutos</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2 · MÉTODO DE PAGO */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <header className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-red-500/10 text-brand-red-600 flex items-center justify-center shrink-0">
                <CreditCard size={16} />
              </span>
              <h3 className={eyebrow}>02 · Medio de Pago</h3>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'MERCADOPAGO',   name: 'MercadoPago', icon: <CreditCard size={18} /> },
                { id: 'EFECTIVO',      name: 'Efectivo',    icon: <DollarSign size={18} /> },
                { id: 'TRANSFERENCIA', name: 'Transferencia', icon: <Sparkles size={18} /> },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setMetodoPago(p.id as any)}
                  className={`py-3 px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    metodoPago === p.id
                      ? 'bg-brand-red-500/10 border-2 border-brand-red-400/50 text-brand-red-700 backdrop-blur-sm'
                      : 'glass-panel hover:bg-white/70 text-ink-600'
                  }`}
                >
                  {p.icon}
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* Tarjeta MercadoPago */}
            {metodoPago === 'MERCADOPAGO' && (
              <div className="pt-5 border-t border-white/40 space-y-6 animate-slideDown">
                {/* Card visual */}
                <div className="w-full max-w-sm mx-auto aspect-video rounded-2xl p-5 text-paper-0 flex flex-col justify-between shadow-xl relative overflow-hidden select-none bg-gradient-to-br from-ink-900 via-ink-800 to-wine-800">
                  <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-brand-red-500/30 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-brand-yellow-400/20 blur-2xl pointer-events-none" />
                  {/* Overlay glass sutil */}
                  <div className="absolute inset-0 glass-badge pointer-events-none" />

                  <div className="flex items-center justify-between relative">
                    <div className="w-11 h-8 bg-gradient-to-br from-brand-yellow-400 to-brand-yellow-500 rounded-md shadow-inner" />
                    <span className="font-black italic text-sm tracking-widest text-paper-300">
                      {cardBrand === 'VISA' ? 'VISA' : cardBrand === 'MASTERCARD' ? 'mastercard' : 'SANDBOX'}
                    </span>
                  </div>

                  <div className="text-xl font-mono tracking-widest font-bold py-1 relative">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex items-end justify-between font-mono text-xs tracking-wider uppercase text-paper-300 relative">
                    <div className="truncate pr-4 max-w-[200px]">
                      <span className="block text-[10px] font-sans font-bold">Titular</span>
                      <span className="font-bold text-paper-0 truncate">{cardName || 'JUAN PEREZ'}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] font-sans font-bold">Vence</span>
                      <span className="font-bold text-paper-0">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-success-700 font-bold border-b border-white/40 pb-2">
                    <Lock size={14} />
                    <span>Tarjeta de Crédito o Débito · Simulador Sandbox MP</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Número de Tarjeta</label>
                      <input type="text" placeholder="4509 9501 •••• ••••" value={cardNumber} onChange={handleCardNumberChange} className="glass-input" />
                    </div>
                    <div>
                      <label className={labelBase}>Nombre Impreso</label>
                      <input type="text" placeholder="Ej: JUAN PEREZ" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} className="glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelBase}>Vencimiento (MM/YY)</label>
                      <input type="text" placeholder="MM/YY" value={cardExpiry} onChange={handleExpiryChange} className="glass-input text-center tracking-widest font-bold" />
                    </div>
                    <div>
                      <label className={labelBase}>CVV</label>
                      <input type="password" placeholder="•••" value={cardCvv} onChange={handleCvvChange} className="glass-input text-center tracking-widest font-bold" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {metodoPago === 'EFECTIVO' && (
              <div className="bg-brand-yellow-50/60 border border-brand-yellow-200/50 p-4 rounded-2xl text-sm text-ink-900 leading-relaxed font-medium animate-slideDown mt-4 flex gap-3 backdrop-blur-sm">
                <DollarSign className="text-brand-yellow-700 shrink-0 mt-0.5" size={20} />
                <p>
                  Abonarás en <strong>efectivo</strong> al momento de recibir el pedido (o al
                  retirarlo). Por favor, tené listo el monto exacto para agilizar la entrega.
                </p>
              </div>
            )}

            {metodoPago === 'TRANSFERENCIA' && (
              <div className="bg-info-50/70 border border-info-200/50 p-4 rounded-2xl text-sm text-ink-900 space-y-2 leading-relaxed font-medium animate-slideDown mt-4 backdrop-blur-sm">
                <span className="block font-black text-info-700 uppercase tracking-wider text-[11px]">
                  Datos bancarios para transferencia
                </span>
                <p className="text-xs">
                  <strong>Banco</strong>: Galicia<br />
                  <strong>CBU</strong>: 0070001120000003429810<br />
                  <strong>Alias</strong>: foodstore.utn.sdd<br />
                  <strong>Monto</strong>: ${total.toFixed(2)}
                </p>
                <p className="text-[11px] text-info-700 italic pt-2 border-t border-info-200/50">
                  Una vez que confirmes el checkout, coordinaremos vía email o teléfono el envío
                  de tu comprobante.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA · Resumen */}
        <aside className="glass-panel rounded-2xl p-6 space-y-6 sticky top-[120px]">
          <header className="flex items-center gap-2 pb-3 border-b border-white/40">
            <span className="w-8 h-8 rounded-xl bg-brand-red-500/10 text-brand-red-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} />
            </span>
            <h3 className={eyebrow}>Resumen del Pedido</h3>
          </header>

          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {cartItems.map(item => (
              <div key={item.cart_item_key} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-ink-900 block truncate">{item.nombre}</span>
                    <span className="text-xs text-ink-500 block font-medium">
                      Cant: {item.cantidad} × ${Number(item.precio).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-black text-ink-900 shrink-0 tabular-nums">
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </span>
                </div>
                {item.exclusiones_nombres && item.exclusiones_nombres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.exclusiones_nombres.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-danger-50/70 text-danger-700 border border-danger-200/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                      >
                        Sin {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/40 pt-4 space-y-2">
            <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <SummaryRow
              label="Costo de envío"
              value={costoEnvio === 0 ? '$0.00 (Retiro)' : `$${costoEnvio.toFixed(2)}`}
            />
            <div className="flex justify-between items-end border-t border-white/40 pt-3">
              <span className="font-display font-black text-ink-900">Total</span>
              <span className="font-display text-brand-red-600 font-black tabular-nums text-3xl leading-none">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirmPurchase}
            disabled={estadoLocal === 'cerrado'}
            className="w-full bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-4 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 text-base"
          >
            <Lock size={18} />
            <span>{estadoLocal === 'cerrado' ? 'Local Cerrado' : 'Confirmar y Comprar'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-500 font-bold uppercase tracking-wider">
            <Lock size={11} className="text-success-600" />
            <span>Encriptación Segura</span>
          </div>
        </aside>
      </main>

      <ClientFooter />

      {/* Modal procesando */}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="glass-modal rounded-2xl max-w-sm w-full p-8 text-center space-y-6 animate-glassIn overflow-hidden">
            <div className="h-1.5 -mx-8 -mt-8 mb-4 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-white/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 bg-brand-red-50/70 rounded-full flex items-center justify-center text-brand-red-600 backdrop-blur-sm">
                <Lock size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <span className={eyebrow}>Transacción Segura</span>
              <h4 className="font-display text-xl font-extrabold text-ink-900">Procesando tu pedido</h4>
              <p className="text-xs text-ink-700 font-medium px-3 py-2 bg-white/40 border border-white/40 rounded-2xl leading-relaxed">
                {processingStep}
              </p>
            </div>

            <p className="text-xs text-ink-500 leading-relaxed max-w-xs mx-auto">
              No cierres la ventana ni recargues. Estamos validando la pasarela bancaria e
              impactando stock de ingredientes.
            </p>
          </div>
        </div>
      )}

      {/* Modal dirección */}
      {isAddrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setIsAddrModalOpen(false)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"
          />
          <form
            onSubmit={handleAddAddressInline}
            className="relative glass-modal rounded-2xl max-w-sm w-full z-10 animate-glassIn overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 pb-3 border-b border-white/40 shrink-0">
              <div>
                <span className={eyebrow}>Dirección Express</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 mt-0.5">
                  Agregar dirección
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddrModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 transition-colors duration-150 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {addrError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 text-sm px-4 py-3 rounded-2xl flex items-center gap-2 font-medium animate-shake backdrop-blur-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{addrError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelBase}>Calle</label>
                  <input type="text" required placeholder="Ej: Av. Rivadavia" value={newCalle} onChange={e => setNewCalle(e.target.value)} className="glass-input" />
                </div>
                <div>
                  <label className={labelBase}>Número</label>
                  <input type="text" required placeholder="1420" value={newNumero} onChange={e => setNewNumero(e.target.value)} className="glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Piso (opc.)</label>
                  <input type="text" placeholder="3" value={newPiso} onChange={e => setNewPiso(e.target.value)} className="glass-input" />
                </div>
                <div>
                  <label className={labelBase}>Depto (opc.)</label>
                  <input type="text" placeholder="B" value={newDepto} onChange={e => setNewDepto(e.target.value)} className="glass-input" />
                </div>
              </div>

              <div>
                <label className={labelBase}>Indicaciones (opc.)</label>
                <textarea placeholder="Ej: Tocar timbre 'B'…" rows={2} value={newIndicaciones} onChange={e => setNewIndicaciones(e.target.value)} className="glass-input" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-white/40 shrink-0 bg-white/30">
              <button
                type="button"
                onClick={() => setIsAddrModalOpen(false)}
                className="flex-1 glass-panel rounded-2xl hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createAddressMutation.isPending}
                className="flex-1 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
              >
                {createAddressMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-ink-500 font-semibold">{label}</span>
    <span className="text-ink-900 font-bold tabular-nums">{value}</span>
  </div>
);

const DeliveryButton = ({
  active, onClick, icon, title, sub,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string;
}) => (
  <button
    onClick={onClick}
    className={`py-4 px-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 transition-all cursor-pointer ${
      active
        ? 'bg-brand-red-500/10 border-2 border-brand-red-400/50 text-brand-red-700 backdrop-blur-sm'
        : 'glass-panel hover:bg-white/70 text-ink-600'
    }`}
  >
    <span className={active ? 'text-brand-red-600' : 'text-ink-500'}>{icon}</span>
    <span className="leading-tight text-center">{title}</span>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-brand-red-600' : 'text-ink-400'}`}>
      {sub}
    </span>
  </button>
);

const Step = ({ index, label, status }: { index: number; label: string; status: 'done' | 'active' | 'pending' }) => {
  const dot =
    status === 'done'
      ? 'bg-brand-red-500 text-white border-brand-red-500'
      : status === 'active'
      ? 'bg-brand-red-500 text-white border-brand-red-500 ring-4 ring-brand-red-500/15'
      : 'bg-white/40 text-ink-400 border-white/40';
  const text = status === 'pending' ? 'text-ink-400' : 'text-ink-900';
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${dot}`}>
        {status === 'done' ? '✓' : index}
      </span>
      <span className={`text-xs font-black uppercase tracking-wider hidden sm:block ${text}`}>{label}</span>
    </div>
  );
};

const StepDivider = ({ done }: { done?: boolean }) => (
  <div className={`h-0.5 w-8 sm:w-16 rounded-full ${done ? 'bg-brand-red-500' : 'bg-white/30'}`} />
);
