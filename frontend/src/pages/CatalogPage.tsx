import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Search, 
  Layers, 
  ShieldAlert, 
  Cookie, 
  ShoppingCart, 
  Trash2, 
  X,
  Sparkles,
  UtensilsCrossed,
  Utensils
} from 'lucide-react';

import { productosApi } from '../shared/api/productos';
import { categoriasApi } from '../shared/api/categorias';
import { ingredientesApi } from '../shared/api/ingredientes';
import { useCartStore } from '../shared/stores/cartStore';
import type { Producto, CategoriaTree, Ingrediente } from '../shared/types';

export const CatalogPage = () => {
  const { items: cartItems, addItem, removeItem, clearCart } = useCartStore();

  // Filtros reactivos locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [excludedAllergenIds, setExcludedAllergenIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Paginación reactiva
  const [page, setPage] = useState(0);
  const limit = 12;

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

  // Convertir array de IDs excluidos a string separado por comas
  const excluirAlergenosStr = excludedAllergenIds.length > 0 
    ? excludedAllergenIds.join(',') 
    : undefined;

  // Query - Obtener catálogo público (hace fetch atómico con filtros a FastAPI)
  const { data: catalogData, isLoading, isError } = useQuery({
    queryKey: ['catalog', page, selectedCategoryId, searchTerm, excluirAlergenosStr],
    queryFn: () => productosApi.getCatalog({
      skip: page * limit,
      limit,
      category_id: selectedCategoryId,
      search: searchTerm,
      excluirAlergenos: excluirAlergenosStr,
    }),
    placeholderData: (previousData) => previousData, // Suaviza la transición de carga
  });

  // Helpers de aplanado de categorías
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

  // Manejador del filtro de alérgenos
  const handleToggleAllergenFilter = (id: number) => {
    setExcludedAllergenIds(prev => {
      const next = prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id];
      setPage(0); // Reiniciar paginación al cambiar filtros
      return next;
    });
  };

  const handleSelectCategory = (id: number | null) => {
    setSelectedCategoryId(id);
    setPage(0); // Reiniciar paginación
  };

  // Agregar al carrito con formato tipado
  const handleAddToCart = (prod: Producto) => {
    addItem({
      id: prod.id,
      nombre: prod.nombre,
      precio: Number(prod.precio),
      cantidad: 1
    });
  };

  // Calcular precio total del carrito
  const totalCartPrice = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 flex flex-col font-sans">
      
      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            FS
          </div>
          <div>
            <span className="font-extrabold text-gray-800 text-lg">Food Store</span>
            <span className="block text-[10px] text-orange-600 tracking-widest uppercase font-black">Nuestro Menú</span>
          </div>
        </div>

        {/* Floating Cart Button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart size={18} />
            <span className="font-bold text-xs">Carrito</span>
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-gray-900 border border-white text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {cartItems.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO BANNER BANNER */}
      <section className="bg-gradient-to-r from-gray-900 via-orange-950 to-gray-900 py-12 px-6 text-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-2xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
            <Sparkles size={12} />
            <span>Ingredientes Premium & Seguridad Garantizada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Descubrí Sabores Que Enamoran
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Platos preparados al instante con los ingredientes más frescos. Filtra por tus preferencias y alérgenos de forma 100% segura.
          </p>
        </div>
      </section>

      {/* CUERPO PRINCIPAL DEL CATALOGO */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6 items-start">
        
        {/* FILTROS LATERALES - SIDEBAR */}
        <aside className="w-full md:w-64 space-y-6 shrink-0 md:sticky md:top-24">
          
          {/* BUSCADOR */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Buscador:</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Ej: Pizza, Hamburguesa..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {/* CATEGORIAS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Categorías:</span>
            <div className="space-y-1">
              <button
                onClick={() => handleSelectCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedCategoryId === null 
                    ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Todas</span>
                <Utensils size={12} />
              </button>
              {flatCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategoryId === cat.id 
                      ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.nombre}</span>
                  <Layers size={12} />
                </button>
              ))}
            </div>
          </div>

          {/* FILTRO EXCLUSION ALERGENOS (RN-CA04) */}
          {alergenos.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">🚫 Excluir Alérgenos:</span>
                <p className="text-[10px] text-gray-500">Oculta atómicamente platos que contengan:</p>
              </div>

              <div className="space-y-2 pt-1">
                {alergenos.map(ing => {
                  const isChecked = excludedAllergenIds.includes(ing.id);
                  return (
                    <div 
                      key={ing.id} 
                      onClick={() => handleToggleAllergenFilter(ing.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'bg-red-50/50 border-red-200 text-red-700' 
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500/20 accent-red-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold">{ing.nombre}</span>
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
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 font-medium text-xs">Cargando delicias...</span>
            </div>
          ) : isError || !catalogData ? (
            <div className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-2xl p-6 flex items-start gap-4">
              <ShieldAlert className="text-red-600 shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-red-800">Error de Conexión</h3>
                <p className="text-xs text-red-700 mt-1">No se pudo recuperar el menú en este momento. Intente más tarde.</p>
              </div>
            </div>
          ) : catalogData.items.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-8 max-w-md mx-auto shadow-sm space-y-4">
              <UtensilsCrossed className="mx-auto text-gray-300" size={56} />
              <h3 className="font-bold text-gray-700">Sin coincidencias</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                No encontramos platos libres de tus alérgenos seleccionados o que coincidan con la búsqueda. ¡Intenta ajustar los filtros!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogData.items.map((prod: Producto) => {
                  const containsAllergen = prod.ingredientes.some(i => i.es_alergeno);
                  return (
                    <div 
                      key={prod.id} 
                      className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xxs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Imagen */}
                      <div className="h-44 bg-gray-50 relative flex items-center justify-center shrink-0 border-b border-gray-50">
                        {prod.imagen_url ? (
                          <img 
                            src={prod.imagen_url} 
                            alt={prod.nombre} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-gray-300">
                            <Utensils size={36} className="stroke-1" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Delicia FS</span>
                          </div>
                        )}

                        {/* Badge Precio */}
                        <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-xs font-bold shadow border border-white/10">
                          ${Number(prod.precio).toFixed(2)}
                        </div>
                      </div>

                      {/* Info & Agregar */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-gray-800 text-base sm:text-lg line-clamp-1">{prod.nombre}</h4>
                          {prod.descripcion && (
                            <p className="text-xxs text-gray-500 line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                          )}

                          {/* Chips Alérgenos (RN-CA04) */}
                          {containsAllergen && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {prod.ingredientes.filter(i => i.es_alergeno).map(ing => (
                                <span 
                                  key={ing.id} 
                                  className="inline-flex items-center gap-1 text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-md"
                                >
                                  ⚠️ Contiene: {ing.nombre}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Agregar al carrito */}
                        <button
                          onClick={() => handleAddToCart(prod)}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow active:scale-98 transition-all text-xs cursor-pointer"
                        >
                          <ShoppingCart size={14} />
                          <span>Agregar al Pedido</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {catalogData.total > limit && (
                <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-100">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-gray-500 font-bold">
                    Página {page + 1} de {Math.ceil(catalogData.total / limit)}
                  </span>
                  <button
                    disabled={(page + 1) * limit >= catalogData.total}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* DRAWER DEL CARRITO FLOTANTE */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"
          ></div>
          
          {/* Drawer */}
          <aside className="relative flex flex-col w-96 max-w-full bg-white h-full shadow-2xl z-10 p-6 animate-slideLeft">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                <ShoppingCart className="text-orange-500" size={20} />
                Mi Pedido
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Listado de items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 gap-3">
                  <ShoppingCart size={48} className="stroke-1" />
                  <p className="text-xs font-bold">El carrito está vacío.</p>
                  <p className="text-[10px] text-gray-400">¡Explora nuestro menú y arma tu pedido ideal!</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div 
                    key={item.id} 
                    className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xxs"
                  >
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-gray-800 text-xs break-words">{item.nombre}</h5>
                      <span className="text-[10px] text-gray-500 font-bold block mt-0.5">${item.precio} c/u</span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-black bg-white border border-gray-200 w-8 h-8 rounded-lg flex items-center justify-center text-gray-700">
                        x{item.cantidad}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Quitar plato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Resumen */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-auto space-y-4 shrink-0">
                <div className="flex items-center justify-between text-base font-black text-gray-800">
                  <span>Total:</span>
                  <span className="text-orange-600">${totalCartPrice.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={clearCart}
                    className="flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-gray-600 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Vaciar</span>
                  </button>
                  <button
                    onClick={() => alert('🛒 ¡Pedido Simulado!\nEn la próxima US integraremos MercadoPago para que puedas abonar de forma real.')}
                    className="flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
