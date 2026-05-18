import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Search, 
  AlertCircle,
  ShieldAlert,
  Layers,
  Cookie,
  Image as ImageIcon
} from 'lucide-react';

import { productosApi } from '../../shared/api/productos';
import { categoriasApi } from '../../shared/api/categorias';
import { ingredientesApi } from '../../shared/api/ingredientes';
import type { Producto, Categoria, Ingrediente, CategoriaTree } from '../../shared/types';
import { useAuthStore } from '../../shared/stores/authStore';

export const ProductosManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const isAdmin = user?.roles.some((r: string) => r === 'ADMIN') ?? false;

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  
  // Campos del Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<string>('0.00');
  const [stock, setStock] = useState<number>(0);
  const [disponible, setDisponible] = useState(true);
  const [imagenUrl, setImagenUrl] = useState('');
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<number[]>([]);
  const [selectedIngredienteIds, setSelectedIngredienteIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Query - Obtener productos (admin list completo con stock cuantitativo)
  const { data: productos = [], isLoading, isError, error } = useQuery<Producto[]>({
    queryKey: ['productosAdmin'],
    queryFn: () => productosApi.listAdmin(),
  });

  // Query - Obtener categorías planas (para dropdown de selección)
  const { data: categoriasTree = [] } = useQuery<CategoriaTree[]>({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getTree,
  });

  // Query - Obtener ingredientes
  const { data: ingredientes = [] } = useQuery<Ingrediente[]>({
    queryKey: ['ingredientes'],
    queryFn: () => ingredientesApi.getAll(),
  });

  // Mutación - Crear
  const createMutation = useMutation({
    mutationFn: productosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al crear el producto';
      setFormError(detail);
    }
  });

  // Mutación - Editar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      productosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al actualizar el producto';
      setFormError(detail);
    }
  });

  // Mutación - Ajuste físico rápido de stock
  const patchStockMutation = useMutation({
    mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) => 
      productosApi.patchStock(id, cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Error al ajustar el inventario.');
    }
  });

  // Mutación - Eliminar
  const deleteMutation = useMutation({
    mutationFn: productosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Error al dar de baja el producto.');
    }
  });

  // Auxiliar para aplanar árbol de categorías
  const getFlattenedCategories = (nodesList: CategoriaTree[]): Categoria[] => {
    let flat: Categoria[] = [];
    nodesList.forEach(node => {
      flat.push({
        id: node.id,
        nombre: node.nombre,
        descripcion: node.descripcion,
        parent_id: node.parent_id
      });
      if (node.children && node.children.length > 0) {
        flat.push(...getFlattenedCategories(node.children));
      }
    });
    return flat;
  };
  const flatCategorias = getFlattenedCategories(categoriasTree);

  // Controladores de modal
  const openCreateModal = () => {
    setEditingProducto(null);
    setNombre('');
    setDescripcion('');
    setPrecio('0.00');
    setStock(0);
    setDisponible(true);
    setImagenUrl('');
    setSelectedCategoriaIds([]);
    setSelectedIngredienteIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Producto) => {
    setEditingProducto(prod);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion || '');
    setPrecio(Number(prod.precio).toFixed(2));
    setStock(prod.stock ?? 0);
    setDisponible(prod.disponible);
    setImagenUrl(prod.imagen_url || '');
    setSelectedCategoriaIds(prod.categorias.map(c => c.id));
    setSelectedIngredienteIds(prod.ingredientes.map(i => i.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProducto(null);
    setFormError(null);
  };

  // Ajuste interactivo de stock local + remoto
  const handleStockAdjust = (id: number, currentStock: number, delta: number) => {
    if (!isManager) return;
    if (currentStock + delta < 0) {
      alert('⚠️ OPERACIÓN RECHAZADA:\nEl stock físico no puede ser menor a cero.');
      return;
    }
    patchStockMutation.mutate({ id, cantidad: delta });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }

    const priceNum = Number(precio);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('El precio debe ser un número mayor a 0.');
      return;
    }

    if (stock < 0) {
      setFormError('El stock inicial no puede ser negativo.');
      return;
    }

    if (selectedCategoriaIds.length === 0) {
      setFormError('Debe asociar el producto a al menos una categoría.');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: priceNum,
      stock,
      disponible,
      imagen_url: imagenUrl.trim() || null,
      categoria_ids: selectedCategoriaIds,
      ingrediente_ids: selectedIngredienteIds,
    };

    if (editingProducto) {
      updateMutation.mutate({ id: editingProducto.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    if (window.confirm(`¿Estás seguro de que deseas dar de baja el producto "${nombre}"?\nSe aplicará una baja lógica (soft delete).`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoriaIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const toggleIngrediente = (id: number) => {
    setSelectedIngredienteIds(prev => 
      prev.includes(id) ? prev.filter(iId => iId !== id) : [...prev, id]
    );
  };

  // Filtrado de productos por buscador
  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full space-y-6">
      {/* Cabecera / Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar productos en stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 placeholder-gray-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isManager && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Grid de Productos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 font-medium text-sm">Cargando catálogo...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn">
          <AlertCircle className="text-red-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800">Error al cargar productos</h3>
            <p className="text-sm text-red-700 mt-1">{(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}</p>
          </div>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="text-center py-16 bg-white/50 border border-gray-100 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
          <ShoppingBag className="mx-auto text-gray-300" size={56} />
          <h3 className="mt-4 font-bold text-gray-700">No hay productos cargados</h3>
          <p className="text-sm text-gray-500 mt-2">Introduce productos gastronómicos en tu base de datos para habilitar la facturación y ventas.</p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm cursor-pointer"
            >
              <Plus size={18} />
              <span>Crear Producto</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProductos.map(prod => {
            const hasAllergen = prod.ingredientes.some(i => i.es_alergeno);
            return (
              <div 
                key={prod.id} 
                className="bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 group flex flex-col justify-between overflow-hidden relative"
              >
                {/* Imagen del Producto */}
                <div className="h-44 bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-50 shrink-0">
                  {prod.imagen_url ? (
                    <img 
                      src={prod.imagen_url} 
                      alt={prod.nombre} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300 group-hover:text-orange-300 transition-colors duration-300">
                      <ImageIcon size={48} className="stroke-1" />
                      <span className="text-xxs font-bold uppercase tracking-widest">Sin Imagen</span>
                    </div>
                  )}

                  {/* Badge de Alérgeno */}
                  {hasAllergen && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-md border border-red-400">
                      <ShieldAlert size={12} />
                      <span>Alérgeno</span>
                    </div>
                  )}

                  {/* Badge de Precio */}
                  <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-sm font-bold shadow border border-white/10">
                    ${Number(prod.precio).toFixed(2)}
                  </div>
                </div>

                {/* Contenido / Detalle */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-gray-800 text-lg line-clamp-1">{prod.nombre}</h4>
                      <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shrink-0 border ${
                        prod.disponible 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {prod.disponible ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    {prod.descripcion && (
                      <p className="text-xs text-gray-500 line-clamp-2">{prod.descripcion}</p>
                    )}

                    {/* Categorías */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {prod.categorias.map(cat => (
                        <span 
                          key={cat.id} 
                          className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-100 font-bold px-2 py-0.5 rounded-lg"
                        >
                          <Layers size={10} />
                          {cat.nombre}
                        </span>
                      ))}
                    </div>

                    {/* Ingredientes */}
                    {prod.ingredientes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ingredientes / Receta:</span>
                        <div className="flex flex-wrap gap-1">
                          {prod.ingredientes.map(ing => (
                            <span 
                              key={ing.id} 
                              className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                ing.es_alergeno 
                                  ? 'bg-red-50 text-red-700 border-red-200' 
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}
                            >
                              {ing.nombre}
                              {ing.es_alergeno && '⚠️'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fila de Inventario / Stock */}
                  <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-xxs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Existencias:</span>
                      <span className={`text-sm font-extrabold ${
                        (prod.stock ?? 0) <= 0 
                          ? 'text-red-600' 
                          : (prod.stock ?? 0) < 5 
                            ? 'text-amber-600' 
                            : 'text-gray-700'
                      }`}>
                        {(prod.stock ?? 0) <= 0 ? 'Sin Stock (0 u.)' : `${prod.stock} unidades`}
                      </span>
                    </div>

                    {/* Control rápido +/- de stock */}
                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStockAdjust(prod.id, prod.stock ?? 0, -1)}
                          disabled={patchStockMutation.isPending}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-xxs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Restar 1 unidad"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleStockAdjust(prod.id, prod.stock ?? 0, 1)}
                          disabled={patchStockMutation.isPending}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-xxs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Sumar 1 unidad"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de Edición/Baja */}
                {isManager && (
                  <div className="flex items-center justify-end gap-2 px-5 pb-5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                      title="Editar producto"
                    >
                      <Edit size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(prod.id, prod.nombre)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
                        title="Baja del producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ShoppingBag className="text-orange-500" size={20} />
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button 
                onClick={closeModal}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2 text-sm animate-shake">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fila Nombre y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Pizza Margherita, Gaseosa Cola"
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all font-semibold"
                    style={{ color: '#1f2937' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Precio ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all font-bold"
                    style={{ color: '#1f2937' }}
                  />
                </div>
              </div>

              {/* Fila Stock, Disponible e Imagen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={!!editingProducto} // Bloquea si edita (exige el uso del control +/- en la lista)
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-gray-50/50 disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all font-semibold"
                    style={{ color: !!editingProducto ? '#9ca3af' : '#1f2937' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">URL Imagen (Opcional)</label>
                  <input
                    type="url"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                    placeholder="https://ejemplo.com/comida.jpg"
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-200 flex items-center gap-2 h-11">
                    <input
                      type="checkbox"
                      id="disponible"
                      checked={disponible}
                      onChange={(e) => setDisponible(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 cursor-pointer accent-orange-500"
                    />
                    <label htmlFor="disponible" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                      Disponible
                    </label>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Descripción del Plato</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Escribe los detalles e ingredientes del menú..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all resize-none"
                />
              </div>

              {/* Multiselect - Categorías */}
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-gray-700">Categorías Relacionadas * (Mínimo 1)</span>
                <div className="bg-gray-50/50 border border-gray-200 p-4 rounded-2xl flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {flatCategorias.map(cat => {
                    const isSelected = selectedCategoriaIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-100 text-purple-800 border-purple-300' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
                        }`}
                      >
                        {cat.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multiselect - Ingredientes */}
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-gray-700">Ingredientes y Alérgenos Asociados</span>
                <div className="bg-gray-50/50 border border-gray-200 p-4 rounded-2xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {ingredientes.map(ing => {
                    const isSelected = selectedIngredienteIds.includes(ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleIngrediente(ing.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected 
                            ? ing.es_alergeno 
                              ? 'bg-red-100 text-red-800 border-red-300 shadow-xxs' 
                              : 'bg-orange-100 text-orange-800 border-orange-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                        }`}
                      >
                        {ing.nombre}
                        {ing.es_alergeno && '⚠️'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all text-sm cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
