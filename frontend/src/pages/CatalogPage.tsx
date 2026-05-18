import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
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
  MapPin,
  Navigation,
  Briefcase
} from 'lucide-react';

import { productosApi } from '../shared/api/productos';
import { categoriasApi } from '../shared/api/categorias';
import { ingredientesApi } from '../shared/api/ingredientes';
import { useCartStore } from '../shared/stores/cartStore';
import { useAuthStore } from '../shared/stores/authStore';
import { useConfigStore } from '../shared/stores/configStore';
import { configuracionApi } from '../shared/api/configuracion';
import type { Producto, CategoriaTree, Ingrediente } from '../shared/types';
import { useFeedback } from '../shared/ui/FeedbackProvider';
import { Logo } from '../shared/ui/Logo';


export const CatalogPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { showAlert, showConfirm } = useFeedback();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { setConfigs, estadoLocal } = useConfigStore();

  // Query - Obtener configuraciones del backend
  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configuraciones'],
    queryFn: configuracionApi.getPublicConfiguraciones,
  });

  // Hydrate configurations reactively
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
    getTotalPrice
  } = useCartStore();

  // Filtros reactivos locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [excludedAllergenIds, setExcludedAllergenIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Paginación reactiva
  const [page, setPage] = useState(0);
  const limit = 12;

  // Personalización
  const [customizingProduct, setCustomizingProduct] = useState<Producto | null>(null);
  const [exclusions, setExclusions] = useState<number[]>([]);

  // Query - Obtener categorías
  const { data: categoriasTree = [] } = useQuery<CategoriaTree[]>({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getTree,
  });

  // Query - Obtener ingredientes alérgenos para el filtro lateral
  const { data: alergenos = [] } = useQuery<Ingrediente[]>({
    queryKey: ['alergenosFiltro'],
    queryFn: () => ingredientesApi.getAll({ es_alergeno: true }),
  });

  const excluirAlergenosStr = excludedAllergenIds.length > 0
    ? excludedAllergenIds.join(',')
    : undefined;

  // Query - Obtener catálogo público
  const { data: catalogData, isLoading, isError } = useQuery({
    queryKey: ['catalog', page, selectedCategoryId, searchTerm, excluirAlergenosStr],
    queryFn: () => productosApi.getCatalog({
      skip: page * limit,
      limit,
      category_id: selectedCategoryId,
      search: searchTerm,
      excluirAlergenos: excluirAlergenosStr,
    }),
    placeholderData: (previousData) => previousData,
  });

  const getFlattenedCategories = (nodesList: CategoriaTree[]): { id: number; nombre: string }[] => {
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
        message: 'El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos en este momento.',
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

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.15em] text-brand-red-500';
  const cardBase = 'bg-paper-0 border border-paper-200 rounded-lg shadow-sm';
  const inputBase = 'w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150';

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
            <span className={`block ${eyebrow}`}>Nuestro Menú</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <ShoppingCart size={16} />
            <span className="text-xs hidden sm:inline">Carrito</span>
            {getTotalItems() > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-yellow-400 text-ink-900 border-2 border-paper-0 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-10 h-10 rounded-md bg-brand-yellow-100 border border-brand-yellow-300 flex items-center justify-center text-ink-900 font-bold cursor-pointer hover:bg-brand-yellow-200 active:scale-95 transition-all duration-150"
              >
                {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    onClick={() => setIsUserMenuOpen(false)}
                    className="fixed inset-0 z-45"
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-paper-0 rounded-lg shadow-md border border-paper-200 p-2 z-50 animate-fadeIn text-left">
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
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-ink-700 hover:bg-paper-100 hover:text-ink-900 font-semibold text-sm transition-colors duration-150"
                    >
                      <Navigation size={14} />
                      <span>Mis Pedidos</span>
                    </Link>
                    {user?.roles.some((r: string) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r)) && (
                      <Link
                        to="/admin/categorias"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-ink-700 hover:bg-paper-100 hover:text-ink-900 font-semibold text-sm transition-colors duration-150"
                      >
                        <Briefcase size={14} />
                        <span>Panel Admin</span>
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        const ok = await showConfirm({
                          title: 'Cerrar sesión',
                          message: '¿Deseas cerrar sesión?',
                          variant: 'warning',
                          confirmText: 'Cerrar sesión',
                        });
                        if (ok) { logout(); navigate('/login'); }
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-danger-600 hover:bg-danger-50 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer border-t border-paper-200 mt-1"
                    >
                      <X size={14} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold px-4 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] text-xs cursor-pointer"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="bg-brand-red-500 py-16 md:py-20 px-6 text-center relative overflow-hidden shrink-0">
        <svg
          aria-hidden="true"
          className="absolute -top-10 -left-10 w-72 h-72 opacity-10 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round"/>
        </svg>
        <svg
          aria-hidden="true"
          className="absolute -bottom-10 -right-10 w-72 h-72 opacity-10 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round"/>
        </svg>

        <div className="max-w-2xl mx-auto space-y-5 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-brand-yellow-400 text-ink-900 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            <span>Ingredientes premium · Seguridad garantizada</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05]">
            Sabores que enamoran
          </h2>
          <p className="text-brand-yellow-100 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Platos preparados al instante con los ingredientes más frescos. Filtrá por tus preferencias y alérgenos de forma 100% segura.
          </p>
        </div>
      </section>

      {/* BANNER DE LOCAL CERRADO */}
      {estadoLocal === 'cerrado' && (
        <div className="bg-danger-50 border-b border-danger-100 text-danger-700 px-6 py-4 flex items-center justify-center gap-3 animate-fadeIn shrink-0 select-none">
          <AlertTriangle size={18} className="text-danger-500 shrink-0" />
          <div className="text-xs font-bold tracking-wide uppercase leading-normal">
            ¡Atención! El restaurante se encuentra cerrado temporalmente. El menú está disponible solo en modo consulta.
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL DEL CATALOGO */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6 items-start">

        {/* FILTROS LATERALES */}
        <aside className="w-full md:w-64 space-y-6 shrink-0 md:sticky md:top-24">

          {/* BUSCADOR */}
          <div className={`${cardBase} p-5 space-y-3`}>
            <span className={eyebrow}>Búsqueda</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
              <input
                type="text"
                placeholder="Ej: Pizza, Hamburguesa..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>

          {/* CATEGORIAS */}
          <div className={`${cardBase} p-5 space-y-3`}>
            <span className={eyebrow}>Categorías</span>
            <div className="space-y-1">
              <button
                onClick={() => handleSelectCategory(null)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-semibold transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                  selectedCategoryId === null
                    ? 'bg-brand-red-50 text-brand-red-700 border-l-4 border-brand-red-500 pl-2'
                    : 'text-ink-700 hover:bg-paper-100'
                }`}
              >
                <span>Todas</span>
                <Utensils size={14} />
              </button>
              {flatCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-semibold transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? 'bg-brand-red-50 text-brand-red-700 border-l-4 border-brand-red-500 pl-2'
                      : 'text-ink-700 hover:bg-paper-100'
                  }`}
                >
                  <span>{cat.nombre}</span>
                  <Layers size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* FILTRO EXCLUSION ALERGENOS */}
          {alergenos.length > 0 && (
            <div className={`${cardBase} p-5 space-y-3`}>
              <div className="space-y-0.5">
                <span className={eyebrow}>Excluir alérgenos</span>
                <p className="text-xs text-ink-500">Oculta platos que los contengan</p>
              </div>

              <div className="space-y-1.5 pt-1">
                {alergenos.map(ing => {
                  const isChecked = excludedAllergenIds.includes(ing.id);
                  return (
                    <div
                      key={ing.id}
                      onClick={() => handleToggleAllergenFilter(ing.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer select-none transition-colors duration-150 ${
                        isChecked
                          ? 'bg-danger-50 text-danger-700'
                          : 'text-ink-700 hover:bg-paper-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 rounded border-2 border-ink-300 checked:bg-brand-red-500 checked:border-brand-red-500 accent-brand-red-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold">{ing.nombre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* MENU GRID DE PRODUCTOS */}
        <main className="flex-1 space-y-6 w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-ink-500 font-medium text-sm">Cargando delicias...</span>
            </div>
          ) : isError || !catalogData ? (
            <div className="bg-danger-50 border border-danger-100 rounded-lg p-6 flex items-start gap-4">
              <ShieldAlert className="text-danger-600 shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-danger-700">Error de conexión</h3>
                <p className="text-sm text-danger-600 mt-1">No se pudo recuperar el menú en este momento. Intentá más tarde.</p>
              </div>
            </div>
          ) : catalogData.items.length === 0 ? (
            <div className={`text-center py-16 ${cardBase} p-8 max-w-md mx-auto space-y-4`}>
              <UtensilsCrossed className="mx-auto text-ink-300" size={56} />
              <h3 className="text-lg font-bold text-ink-900">Sin coincidencias</h3>
              <p className="text-sm text-ink-500 leading-relaxed">
                No encontramos platos que cumplan tus filtros. Probá ajustar la búsqueda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogData.items.map((prod: Producto) => {
                  const containsAllergen = prod.ingredientes.some(i => i.es_alergeno);
                  const isClosed = estadoLocal === 'cerrado';
                  return (
                    <div
                      key={prod.id}
                      className={`${cardBase} hover:shadow-md hover:border-paper-300 transition-all duration-200 flex flex-col overflow-hidden relative`}
                    >
                      {/* Imagen */}
                      <div className="aspect-square bg-paper-100 relative flex items-center justify-center overflow-hidden">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-ink-300">
                            <Utensils size={48} className="stroke-1" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sin imagen</span>
                          </div>
                        )}

                        {containsAllergen && (
                          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <ShieldAlert size={10} />
                            <span>Alérgeno</span>
                          </div>
                        )}

                        {isClosed && (
                          <div className="absolute inset-0 bg-ink-900/40 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="text-white font-black uppercase tracking-widest text-sm">Local Cerrado</span>
                          </div>
                        )}
                      </div>

                      {/* Info & Agregar */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <h4 className="text-lg font-bold text-ink-900 line-clamp-1">{prod.nombre}</h4>
                          {prod.descripcion && (
                            <p className="text-sm text-ink-500 line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                          )}

                          {prod.ingredientes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {prod.ingredientes.slice(0, 4).map(ing => (
                                <span
                                  key={ing.id}
                                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                    ing.es_alergeno
                                      ? 'bg-danger-50 text-danger-700'
                                      : 'bg-paper-100 text-ink-600'
                                  }`}
                                >
                                  {ing.nombre}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-paper-200">
                          <span className="text-2xl font-black text-brand-red-500 tabular-nums">
                            ${Number(prod.precio).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleAddToCart(prod)}
                            disabled={isClosed}
                            className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {catalogData.total > limit && (
                <div className="flex items-center justify-center gap-3 pt-6 border-t border-paper-200">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="bg-paper-0 border-2 border-paper-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    Anterior
                  </button>
                  <span className="inline-flex items-center justify-center bg-brand-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {page + 1} / {Math.ceil(catalogData.total / limit)}
                  </span>
                  <button
                    disabled={(page + 1) * limit >= catalogData.total}
                    onClick={() => setPage(p => p + 1)}
                    className="bg-paper-0 border-2 border-paper-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE PERSONALIZACIÓN */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setCustomizingProduct(null)}
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm animate-fadeIn"
          ></div>

          <div className="relative bg-paper-0 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-scaleUp border border-paper-200">
            <div className="px-6 py-5 border-b border-paper-200 flex items-center justify-between">
              <div>
                <span className={eyebrow}>Personalización</span>
                <h3 className="text-lg font-bold text-ink-900 leading-tight mt-1">
                  {customizingProduct.nombre}
                </h3>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="w-10 h-10 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-brand-yellow-50 border border-brand-yellow-200 p-4 rounded-md flex gap-3">
                <Sparkles className="text-brand-yellow-700 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-ink-700 leading-relaxed font-medium">
                  Tocá los ingredientes que <strong>NO</strong> querés en tu plato. Ideal para alérgenos y preferencias.
                </p>
              </div>

              <div className="space-y-2">
                <span className={eyebrow}>Ingredientes del plato</span>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
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
                        className={`flex items-center justify-between p-3 rounded-md border cursor-pointer select-none transition-colors duration-150 ${
                          isExcluded
                            ? 'bg-danger-50 border-danger-100 text-danger-700 line-through'
                            : 'bg-paper-0 border-paper-200 hover:border-paper-300 hover:bg-paper-50 text-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-sm flex items-center justify-center border-2 transition-colors ${
                            isExcluded
                              ? 'border-ink-200 bg-paper-100'
                              : 'border-brand-red-500 bg-brand-red-500 text-white'
                          }`}>
                            {!isExcluded && <span className="font-bold text-[11px]">✓</span>}
                          </div>
                          <span className="text-sm font-semibold">{ing.nombre}</span>
                        </div>

                        {ing.es_alergeno && (
                          <span className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Alérgeno
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 rounded-b-xl flex items-center justify-end gap-3">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="bg-paper-0 border-2 border-paper-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
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
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm"
              >
                Confirmar y agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DEL CARRITO */}
      {isCartOpen && (
        <>
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fadeIn"
          ></div>

          <aside className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-paper-0 shadow-lg z-50 flex flex-col animate-slideInRight">
            <div className="bg-brand-red-500 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                Mi pedido
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors duration-150 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <ShoppingCart size={64} className="text-ink-300 stroke-1" />
                  <p className="text-sm font-semibold text-ink-500">El carrito está vacío</p>
                  <p className="text-xs text-ink-400 max-w-[240px]">Explorá nuestro menú y armá tu pedido ideal</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm mt-2"
                  >
                    Ver el menú
                  </button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div
                    key={item.cart_item_key}
                    className={`${cardBase} p-4 space-y-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-ink-900 text-sm break-words leading-tight">{item.nombre}</h5>
                        <span className="text-xs text-ink-500 font-medium block mt-1 tabular-nums">${Number(item.precio).toFixed(2)} c/u</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          disabled={item.cantidad <= 1}
                          onClick={() => updateQuantity(item.cart_item_key, item.cantidad - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 hover:border-paper-300 text-ink-700 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-bold text-ink-900 w-6 text-center tabular-nums">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_key, item.cantidad + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 hover:border-paper-300 text-ink-700 cursor-pointer transition-colors duration-150"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.cart_item_key)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-paper-0 border border-danger-100 hover:bg-danger-50 text-danger-600 cursor-pointer transition-colors duration-150 ml-1"
                          title="Quitar plato"
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
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-600 bg-paper-100 px-2 py-0.5 rounded-full"
                          >
                            Sin {name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-paper-200 text-xs">
                      <span className="text-ink-500 font-semibold">Subtotal</span>
                      <span className="font-black text-ink-900 tabular-nums">${getSubtotal(item).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t-2 border-brand-yellow-400 bg-paper-50 p-6 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-ink-900">Total</span>
                  <span className="text-2xl font-black text-brand-red-500 tabular-nums">${getTotalPrice().toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={clearCart}
                    className="bg-paper-0 border border-danger-100 hover:bg-danger-50 hover:border-danger-200 text-danger-600 hover:text-danger-700 font-semibold px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Vaciar</span>
                  </button>
                  <button
                    onClick={() => {
                      if (estadoLocal === 'cerrado') {
                        showAlert({
                          title: 'Local cerrado',
                          message: 'El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos.',
                          variant: 'warning',
                        });
                        return;
                      }
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    disabled={estadoLocal === 'cerrado'}
                    className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-3.5 rounded-md shadow-brand hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
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
