import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Layers,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  X,
  Sparkles,
  UtensilsCrossed,
  Utensils,
  Plus,
  Minus,
  AlertTriangle,
  Flame,
  ChefHat,
  Star,
} from 'lucide-react';

import { productosApi } from '../shared/api/productos';
import { categoriasApi } from '../shared/api/categorias';
import { ingredientesApi } from '../shared/api/ingredientes';
import { useCartStore } from '../shared/stores/cartStore';
import { useConfigStore } from '../shared/stores/configStore';
import { configuracionApi } from '../shared/api/configuracion';
import type { Producto, CategoriaTree, Ingrediente } from '../shared/types';
import { useFeedback } from '../shared/ui/FeedbackProvider';
import { ClientHeader } from '../shared/ui/ClientHeader';
import { ClientFooter } from '../shared/ui/ClientFooter';

export const CatalogPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useFeedback();

  const { setConfigs, estadoLocal } = useConfigStore();

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

  const {
    items: cartItems,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTotalItems,
    getTotalPrice,
  } = useCartStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [excludedAllergenIds, setExcludedAllergenIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [page, setPage] = useState(0);
  const limit = 12;

  const [customizingProduct, setCustomizingProduct] = useState<Producto | null>(null);
  const [exclusions, setExclusions] = useState<number[]>([]);

  const { data: categoriasTree = [] } = useQuery<CategoriaTree[]>({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getTree,
  });

  const { data: alergenos = [] } = useQuery<Ingrediente[]>({
    queryKey: ['alergenosFiltro'],
    queryFn: () => ingredientesApi.getAll({ es_alergeno: true }),
  });

  const excluirAlergenosStr =
    excludedAllergenIds.length > 0 ? excludedAllergenIds.join(',') : undefined;

  const { data: catalogData, isLoading, isError } = useQuery({
    queryKey: ['catalog', page, selectedCategoryId, searchTerm, excluirAlergenosStr],
    queryFn: () =>
      productosApi.getCatalog({
        skip: page * limit,
        limit,
        category_id: selectedCategoryId,
        search: searchTerm,
        excluirAlergenos: excluirAlergenosStr,
      }),
    placeholderData: (previousData) => previousData,
  });

  const getFlattenedCategories = (
    nodesList: CategoriaTree[]
  ): { id: number; nombre: string }[] => {
    let flat: { id: number; nombre: string }[] = [];
    nodesList.forEach(node => {
      flat.push({ id: node.id, nombre: node.nombre });
      if (node.children && node.children.length > 0) {
        flat.push(...getFlattenedCategories(node.children));
      }
    });
    return flat;
  };
  const flatCategories = getFlattenedCategories(categoriasTree);

  const handleToggleAllergenFilter = (id: number) => {
    setExcludedAllergenIds(prev => {
      const next = prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id];
      setPage(0);
      return next;
    });
  };

  const handleSelectCategory = (id: number | null) => {
    setSelectedCategoryId(id);
    setPage(0);
  };

  const handleAddToCart = (prod: Producto) => {
    if (estadoLocal === 'cerrado') {
      showAlert({
        title: 'Local cerrado',
        message:
          'El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos en este momento.',
        variant: 'warning',
      });
      return;
    }
    if (prod.ingredientes.length === 0) {
      addItem(prod, 1, [], []);
      setIsCartOpen(true);
    } else {
      setCustomizingProduct(prod);
      setExclusions([]);
    }
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';

  return (
    <div className="min-h-screen flex flex-col">
      <ClientHeader
        eyebrow="Nuestro Menú"
        showCart
        cartCount={getTotalItems()}
        onCartClick={() => setIsCartOpen(!isCartOpen)}
      />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-brand-red-500 text-white">
        <div className="absolute inset-0 bg-warm-mesh opacity-40 pointer-events-none" />
        <svg
          aria-hidden="true"
          className="absolute -top-16 -left-10 w-80 h-80 opacity-10 pointer-events-none"
          viewBox="0 0 200 200" fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute -bottom-16 -right-10 w-80 h-80 opacity-10 pointer-events-none"
          viewBox="0 0 200 200" fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round" />
        </svg>

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 glass-badge bg-brand-yellow-400/90 text-ink-900 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm">
            <Sparkles size={13} />
            <span>Ingredientes premium · Cocina abierta</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-[1.02]">
            Sabores que <span className="italic text-brand-yellow-300">enamoran</span>.
          </h1>

          <p className="text-brand-yellow-100 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Platos preparados al instante con los ingredientes más frescos del mercado.
            Filtrá por tus preferencias y alérgenos de forma 100% segura.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-bold">
            <HeroBadge icon={<ChefHat size={12} />} label="Chef del año 2025" />
            <HeroBadge icon={<Flame size={12} />} label="Cocina al instante" />
            <HeroBadge icon={<Star size={12} />} label="4.9 / 5 valoración" />
          </div>
        </div>
      </section>

      {/* Banner local cerrado */}
      {estadoLocal === 'cerrado' && (
        <div className="bg-danger-50/90 backdrop-blur-sm border-b border-danger-200/60 text-danger-700 px-4 sm:px-6 py-3.5 flex items-center justify-center gap-3 animate-fadeIn shrink-0">
          <AlertTriangle size={18} className="text-danger-500 shrink-0" />
          <div className="text-xs sm:text-sm font-bold tracking-wide leading-normal text-center">
            <span className="uppercase tracking-widest">¡Atención!</span> · El restaurante está cerrado temporalmente. El menú está sólo en modo consulta.
          </div>
        </div>
      )}

      {/* ───────── CUERPO ───────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-6 items-start">
        {/* ── FILTROS ── */}
        <aside className="w-full md:w-72 space-y-4 shrink-0 md:sticky md:top-24">
          {/* Buscador */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <span className={eyebrow}>Búsqueda</span>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
                size={16}
              />
              <input
                type="text"
                placeholder="Pizza, hamburguesa, ensalada…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="glass-input pl-10 pr-9"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setPage(0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Categorías */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <span className={eyebrow}>Categorías</span>
            <div className="space-y-1">
              <CategoryButton
                active={selectedCategoryId === null}
                label="Todas"
                onClick={() => handleSelectCategory(null)}
                icon={<Utensils size={14} />}
              />
              {flatCategories.map(cat => (
                <CategoryButton
                  key={cat.id}
                  active={selectedCategoryId === cat.id}
                  label={cat.nombre}
                  onClick={() => handleSelectCategory(cat.id)}
                  icon={<Layers size={14} />}
                />
              ))}
            </div>
          </div>

          {/* Alérgenos */}
          {alergenos.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="space-y-0.5">
                <span className={eyebrow}>Excluir alérgenos</span>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Oculta del menú los platos que los contengan.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                {alergenos.map(ing => {
                  const isChecked = excludedAllergenIds.includes(ing.id);
                  return (
                    <div
                      key={ing.id}
                      onClick={() => handleToggleAllergenFilter(ing.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer select-none transition-all duration-150 ${
                        isChecked
                          ? 'bg-danger-50/80 text-danger-700 backdrop-blur-sm'
                          : 'text-ink-700 hover:bg-white/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 rounded border-2 border-ink-300 accent-brand-red-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold">{ing.nombre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── GRID ── */}
        <main className="flex-1 space-y-6 w-full min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 border-4 border-brand-red-500/30 border-t-brand-red-500 rounded-full animate-spin" />
              <span className="text-ink-500 font-bold text-sm">Cocinando tu menú…</span>
            </div>
          ) : isError || !catalogData ? (
            <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 border-danger-200/50">
              <ShieldAlert className="text-danger-600 shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-danger-700">Error de conexión</h3>
                <p className="text-sm text-danger-600 mt-1">
                  No se pudo recuperar el menú en este momento. Intentá más tarde.
                </p>
              </div>
            </div>
          ) : catalogData.items.length === 0 ? (
            <div className="glass-panel rounded-2xl text-center py-16 p-8 max-w-md mx-auto space-y-4">
              <UtensilsCrossed className="mx-auto text-ink-300 stroke-1" size={56} />
              <h3 className="font-display text-2xl font-bold text-ink-900">Sin coincidencias</h3>
              <p className="text-sm text-ink-500 leading-relaxed">
                No encontramos platos que cumplan tus filtros. Probá ajustar la búsqueda o
                reducir alérgenos excluidos.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Encabezado */}
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-3xl md:text-4xl font-black text-ink-900 tracking-tight">
                    {selectedCategoryId
                      ? flatCategories.find(c => c.id === selectedCategoryId)?.nombre ?? 'Menú'
                      : 'Nuestro menú'}
                  </h2>
                  <p className="text-sm text-ink-500 mt-1 font-medium">
                    {catalogData.total} platos disponibles ·{' '}
                    <span className="text-brand-red-600 font-bold">cocinados al momento</span>
                  </p>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {catalogData.items.map((prod: Producto) => {
                  const containsAllergen = prod.ingredientes.some(i => i.es_alergeno);
                  const isClosed = estadoLocal === 'cerrado';
                  return (
                    <article
                      key={prod.id}
                      className="glass-panel rounded-2xl hover:shadow-[var(--shadow-glass-hover)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden relative group"
                    >
                      {/* Imagen */}
                      <div className="aspect-[5/4] relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 to-cream-200">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-brand-yellow-700/50">
                            <Utensils size={56} className="stroke-1" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">
                              Sin imagen
                            </span>
                          </div>
                        )}

                        {/* Glass overlay en hover */}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-900/40 via-ink-900/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {containsAllergen && (
                          <div className="absolute top-3 right-3 inline-flex items-center gap-1 glass-badge bg-paper-0/85 text-danger-700 border-danger-200/60 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <ShieldAlert size={11} />
                            <span>Alérgeno</span>
                          </div>
                        )}

                        {isClosed && (
                          <div className="absolute inset-0 bg-ink-900/50 flex items-center justify-center backdrop-blur-[3px]">
                            <span className="glass-badge text-white font-display font-black uppercase tracking-widest text-base px-4 py-1.5 rounded-full border-white/30">
                              Local Cerrado
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2.5">
                          <h3 className="font-display text-xl font-extrabold text-ink-900 leading-tight line-clamp-1">
                            {prod.nombre}
                          </h3>
                          {prod.descripcion && (
                            <p className="text-sm text-ink-600 line-clamp-2 leading-relaxed">
                              {prod.descripcion}
                            </p>
                          )}

                          {prod.ingredientes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {prod.ingredientes.slice(0, 4).map(ing => (
                                <span
                                  key={ing.id}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    ing.es_alergeno
                                      ? 'bg-danger-50/80 text-danger-700'
                                      : 'bg-white/60 text-ink-700 border border-white/50'
                                  }`}
                                >
                                  {ing.nombre}
                                </span>
                              ))}
                              {prod.ingredientes.length > 4 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 text-ink-500">
                                  +{prod.ingredientes.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/40">
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-ink-400">
                              Precio
                            </span>
                            <span className="font-display text-2xl font-black text-brand-red-600 tabular-nums leading-none">
                              ${Number(prod.precio).toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddToCart(prod)}
                            disabled={isClosed}
                            className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-brand hover:shadow-[var(--shadow-brand)] transition-all duration-150 active:scale-[0.96] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm flex items-center gap-1.5"
                          >
                            <Plus size={15} />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Paginación */}
              {catalogData.total > limit && (
                <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/30">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="glass-panel rounded-xl hover:bg-white/80 text-ink-900 font-semibold px-4 py-2 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    Anterior
                  </button>
                  <span className="inline-flex items-center justify-center bg-brand-red-500 text-white text-xs font-black px-4 py-2 rounded-full shadow-brand min-w-[90px]">
                    {page + 1} / {Math.ceil(catalogData.total / limit)}
                  </span>
                  <button
                    disabled={(page + 1) * limit >= catalogData.total}
                    onClick={() => setPage(p => p + 1)}
                    className="glass-panel rounded-xl hover:bg-white/80 text-ink-900 font-semibold px-4 py-2 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ClientFooter />

      {/* ── MODAL Personalización ── */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setCustomizingProduct(null)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm animate-fadeIn"
          />
          <div className="relative glass-modal rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-glassIn">
            {/* Acento superior */}
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="px-6 py-5 border-b border-white/40 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <span className={eyebrow}>Personalización</span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 leading-tight mt-1 truncate">
                  {customizingProduct.nombre}
                </h3>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="w-10 h-10 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 transition-colors duration-150 cursor-pointer shrink-0 ml-3"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div className="bg-brand-yellow-50/70 border border-brand-yellow-200/60 p-4 rounded-2xl flex gap-3 backdrop-blur-sm">
                <Sparkles className="text-brand-yellow-700 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-ink-700 leading-relaxed font-medium">
                  Tocá los ingredientes que <strong>NO</strong> querés en tu plato. Ideal para
                  alérgenos y preferencias.
                </p>
              </div>

              <div className="space-y-2">
                <span className={eyebrow}>Ingredientes del plato</span>
                <div className="space-y-1.5">
                  {customizingProduct.ingredientes.map(ing => {
                    const isExcluded = exclusions.includes(ing.id);
                    return (
                      <div
                        key={ing.id}
                        onClick={() => {
                          setExclusions(prev =>
                            prev.includes(ing.id)
                              ? prev.filter(id => id !== ing.id)
                              : [...prev, ing.id]
                          );
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer select-none transition-all duration-150 ${
                          isExcluded
                            ? 'bg-danger-50/80 border border-danger-200/60 text-danger-700 line-through backdrop-blur-sm'
                            : 'glass-panel hover:bg-white/70 text-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isExcluded
                                ? 'border-ink-200 bg-white/50'
                                : 'border-brand-red-500 bg-brand-red-500 text-white'
                            }`}
                          >
                            {!isExcluded && <span className="font-bold text-[11px]">✓</span>}
                          </div>
                          <span className="text-sm font-semibold">{ing.nombre}</span>
                        </div>

                        {ing.es_alergeno && (
                          <span className="inline-flex items-center gap-1 bg-danger-50/80 text-danger-700 border border-danger-200/60 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Alérgeno
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/40 bg-white/30 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="glass-panel rounded-xl hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const excludedNames = customizingProduct.ingredientes
                    .filter(ing => exclusions.includes(ing.id))
                    .map(ing => ing.nombre);

                  addItem(customizingProduct, 1, exclusions, excludedNames);
                  setCustomizingProduct(null);
                  setIsCartOpen(true);
                }}
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm"
              >
                Confirmar y agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER Carrito ── */}
      {isCartOpen && (
        <>
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fadeIn"
          />

          <aside className="fixed inset-y-0 right-0 w-full sm:w-[440px] glass-cart z-50 flex flex-col animate-slideInRight">
            {/* Header rojo sólido */}
            <div className="bg-brand-red-500 text-white px-6 py-5 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-warm-mesh opacity-30 pointer-events-none" />
              <h3 className="font-display text-xl font-extrabold flex items-center gap-2.5 relative z-10">
                <ShoppingCart size={20} />
                <span>Mi pedido</span>
                {getTotalItems() > 0 && (
                  <span className="inline-flex items-center justify-center bg-brand-yellow-400 text-ink-900 text-xs font-black px-2 py-0.5 rounded-full">
                    {getTotalItems()}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl glass-badge hover:bg-white/20 text-white transition-colors duration-150 cursor-pointer relative z-10"
                aria-label="Cerrar carrito"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="w-20 h-20 rounded-2xl glass-panel flex items-center justify-center">
                    <ShoppingCart size={42} className="text-brand-yellow-700 stroke-1" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-lg font-bold text-ink-900">El carrito está vacío</p>
                    <p className="text-xs text-ink-500 max-w-[240px]">
                      Explorá nuestro menú y armá tu pedido ideal
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold px-5 py-2.5 rounded-2xl shadow-yellow hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm mt-2"
                  >
                    Ver el menú
                  </button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div
                    key={item.cart_item_key}
                    className="glass-panel rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-ink-900 text-sm break-words leading-tight">
                          {item.nombre}
                        </h5>
                        <span className="text-xs text-ink-500 font-medium block mt-1 tabular-nums">
                          ${Number(item.precio).toFixed(2)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          disabled={item.cantidad <= 1}
                          onClick={() => updateQuantity(item.cart_item_key, item.cantidad - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Restar"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-black text-ink-900 w-6 text-center tabular-nums">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_key, item.cantidad + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 cursor-pointer transition-all duration-150"
                          aria-label="Sumar"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.cart_item_key)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-danger-50/80 hover:bg-danger-100/80 text-danger-600 cursor-pointer transition-all duration-150 ml-1 backdrop-blur-sm"
                          aria-label="Quitar plato"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {item.exclusiones_nombres && item.exclusiones_nombres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.exclusiones_nombres.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-700 bg-white/60 border border-white/50 px-2 py-0.5 rounded-full"
                          >
                            Sin {name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/40 text-xs">
                      <span className="text-ink-500 font-semibold">Subtotal</span>
                      <span className="font-black text-ink-900 tabular-nums">
                        ${getSubtotal(item).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-white/40 bg-white/50 backdrop-blur-md p-6 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-ink-900">Total</span>
                  <span className="font-display text-3xl font-black text-brand-red-600 tabular-nums">
                    ${getTotalPrice().toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={clearCart}
                    className="col-span-1 glass-panel rounded-xl hover:bg-danger-50/70 text-danger-600 hover:text-danger-700 font-semibold px-3 py-3 transition-all duration-150 cursor-pointer text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Vaciar</span>
                  </button>
                  <button
                    onClick={() => {
                      if (estadoLocal === 'cerrado') {
                        showAlert({
                          title: 'Local cerrado',
                          message:
                            'El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos.',
                          variant: 'warning',
                        });
                        return;
                      }
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    disabled={estadoLocal === 'cerrado'}
                    className="col-span-2 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-3 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
                  >
                    Confirmar pedido
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

const HeroBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="inline-flex items-center gap-1.5 glass-badge px-3 py-1.5 rounded-full text-white">
    <span className="text-brand-yellow-300">{icon}</span>
    <span>{label}</span>
  </span>
);

interface CategoryButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

const CategoryButton = ({ active, label, onClick, icon }: CategoryButtonProps) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-between cursor-pointer ${
      active
        ? 'bg-brand-red-500/10 text-brand-red-700 border-l-4 border-brand-red-500 pl-2'
        : 'text-ink-700 hover:bg-white/60'
    }`}
  >
    <span className="truncate">{label}</span>
    <span className={active ? 'text-brand-red-500' : 'text-ink-400'}>{icon}</span>
  </button>
);
