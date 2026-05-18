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
  Image as ImageIcon
} from 'lucide-react';

import { productosApi } from '../../shared/api/productos';
import { categoriasApi } from '../../shared/api/categorias';
import { ingredientesApi } from '../../shared/api/ingredientes';
import type { Producto, Categoria, Ingrediente, CategoriaTree } from '../../shared/types';
import { useAuthStore } from '../../shared/stores/authStore';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

export const ProductosManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const isAdmin = user?.roles.some((r: string) => r === 'ADMIN') ?? false;
  const { showAlert, showConfirm } = useFeedback();

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
      showAlert({ title: 'Error', message: err.response?.data?.detail || 'Error al ajustar el inventario.', variant: 'danger' });
    }
  });

  // Mutación - Eliminar
  const deleteMutation = useMutation({
    mutationFn: productosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: err.response?.data?.detail || 'Error al dar de baja el producto.', variant: 'danger' });
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
      showAlert({ title: 'Operación Rechazada', message: 'El stock físico no puede ser menor a cero.', variant: 'warning' });
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

    if (selectedCategoriaIds.length !== 1) {
      setFormError('Debe asociar el producto a exactamente una categoría.');
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

  const handleDelete = async (id: number, nombre: string) => {
    const ok = await showConfirm({
      title: 'Baja de Producto',
      message: `¿Estás seguro de que deseas dar de baja el producto "${nombre}"?\nSe aplicará una baja lógica (soft delete).`,
      variant: 'danger',
      confirmText: 'Dar de baja'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoriaIds(prev => 
      prev.includes(id) ? [] : [id]
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

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";
  const inputBase = "w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150";

  return (
    <div className="w-full space-y-6">
      {/* Cabecera / Buscador */}
      <div className={`${cardBase} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar productos en stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputBase} pl-10 py-2`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isManager && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-4 py-2.5 rounded-md shadow-sm active:scale-[0.98] transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Grid de Productos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-ink-500 font-bold text-sm">Cargando catálogo...</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-100 rounded-md p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800">Error al cargar productos</h3>
            <p className="text-sm text-danger-700 mt-1">{(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}</p>
          </div>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className={`${cardBase} p-8 text-center max-w-md mx-auto`}>
          <ShoppingBag className="mx-auto text-ink-300" size={56} />
          <h3 className="mt-4 font-bold text-ink-700">No hay productos cargados</h3>
          <p className="text-sm text-ink-500 mt-2 font-medium">Introduce productos gastronómicos en tu base de datos para habilitar la facturación y ventas.</p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-4 py-2 rounded-md transition-all text-sm cursor-pointer"
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
                className={`${cardBase} hover:shadow-md hover:border-brand-yellow-400 transition-all duration-300 group flex flex-col justify-between overflow-hidden relative`}
              >
                {/* Imagen del Producto */}
                <div className="h-44 bg-paper-50 relative overflow-hidden flex items-center justify-center border-b border-paper-200 shrink-0">
                  {prod.imagen_url ? (
                    <img 
                      src={prod.imagen_url} 
                      alt={prod.nombre} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-ink-300 group-hover:text-brand-yellow-500 transition-colors duration-300">
                      <ImageIcon size={48} className="stroke-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</span>
                    </div>
                  )}

                  {/* Badge de Alérgeno */}
                  {hasAllergen && (
                    <div className="absolute top-3 right-3 bg-brand-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm border border-brand-red-600">
                      <ShieldAlert size={12} />
                      <span>Alérgeno</span>
                    </div>
                  )}

                  {/* Badge de Precio */}
                  <div className="absolute bottom-3 left-3 bg-ink-900/90 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm font-black shadow-sm border border-white/10">
                    ${Number(prod.precio).toFixed(2)}
                  </div>
                </div>

                {/* Contenido / Detalle */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-ink-900 text-lg line-clamp-1">{prod.nombre}</h4>
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full shrink-0 border tracking-wider ${
                        prod.disponible 
                          ? 'bg-success-50 text-success-700 border-success-200' 
                          : 'bg-danger-50 text-danger-700 border-danger-200'
                      }`}>
                        {prod.disponible ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    {prod.descripcion && (
                      <p className="text-xs text-ink-500 line-clamp-2 font-medium">{prod.descripcion}</p>
                    )}

                    {/* Categorías */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {prod.categorias.map(cat => (
                        <span 
                          key={cat.id} 
                          className="inline-flex items-center gap-1 text-[10px] bg-brand-yellow-100 text-brand-yellow-800 border border-brand-yellow-200 font-bold px-2 py-0.5 rounded-md"
                        >
                          <Layers size={10} />
                          {cat.nombre}
                        </span>
                      ))}
                    </div>

                    {/* Ingredientes */}
                    {prod.ingredientes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider block">Ingredientes / Receta:</span>
                        <div className="flex flex-wrap gap-1">
                          {prod.ingredientes.map(ing => (
                            <span 
                              key={ing.id} 
                              className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                ing.es_alergeno 
                                  ? 'bg-brand-red-50 text-brand-red-700 border-brand-red-200' 
                                  : 'bg-paper-100 text-ink-600 border-paper-200'
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
                  <div className="bg-paper-50 p-3 rounded-md border border-paper-200 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-ink-500 font-bold uppercase tracking-wider block">Existencias:</span>
                      <span className={`text-sm font-black ${
                        (prod.stock ?? 0) <= 0 
                          ? 'text-danger-600' 
                          : (prod.stock ?? 0) < 5 
                            ? 'text-brand-yellow-600' 
                            : 'text-ink-900'
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
                          className="w-8 h-8 flex items-center justify-center bg-paper-0 border border-paper-200 text-ink-700 font-bold rounded-md hover:bg-brand-red-50 hover:text-brand-red-600 transition-colors shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Restar 1 unidad"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleStockAdjust(prod.id, prod.stock ?? 0, 1)}
                          disabled={patchStockMutation.isPending}
                          className="w-8 h-8 flex items-center justify-center bg-paper-0 border border-paper-200 text-ink-700 font-bold rounded-md hover:bg-success-50 hover:text-success-600 transition-colors shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
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
                      className="p-1.5 bg-info-50 text-info-600 rounded-md hover:bg-info-100 transition-all cursor-pointer"
                      title="Editar producto"
                    >
                      <Edit size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(prod.id, prod.nombre)}
                        className="p-1.5 bg-danger-50 text-danger-600 rounded-md hover:bg-danger-100 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`${cardBase} max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col transform transition-all duration-300 scale-100 p-0`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-paper-200 bg-paper-50 sticky top-0 z-10">
              <h3 className="font-black text-ink-900 text-lg flex items-center gap-2">
                <ShoppingBag className="text-brand-yellow-600" size={20} />
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button 
                onClick={closeModal}
                className="p-1.5 rounded-md text-ink-400 hover:text-brand-red-500 hover:bg-paper-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-danger-50 border border-danger-100 text-danger-700 p-4 rounded-md flex items-start gap-2 text-sm animate-shake">
                  <AlertCircle className="text-danger-500 shrink-0 mt-0.5" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fila Nombre y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Pizza Margherita, Gaseosa Cola"
                    className={`${inputBase} font-bold`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Precio ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className={`${inputBase} font-bold`}
                  />
                </div>
              </div>

              {/* Fila Stock, Disponible e Imagen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={!!editingProducto} 
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className={`${inputBase} disabled:bg-paper-100 disabled:text-ink-400 font-bold`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">URL Imagen (Opcional)</label>
                  <input
                    type="url"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                    placeholder="https://ejemplo.com/comida.jpg"
                    className={inputBase}
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="bg-paper-50 px-4 py-3 rounded-md border border-paper-200 flex items-center gap-2 h-[42px]">
                    <input
                      type="checkbox"
                      id="disponible"
                      checked={disponible}
                      onChange={(e) => setDisponible(e.target.checked)}
                      className="w-5 h-5 rounded border-paper-300 text-brand-red-500 focus:ring-brand-red-500/20 cursor-pointer accent-brand-red-500"
                    />
                    <label htmlFor="disponible" className="text-sm font-bold text-ink-900 cursor-pointer select-none">
                      Disponible
                    </label>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Descripción del Plato</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Escribe los detalles e ingredientes del menú..."
                  rows={2}
                  className={`${inputBase} resize-none`}
                />
              </div>

              {/* Selección - Categoría Única */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-ink-600">Categoría del Producto * (Selecciona una)</span>
                <div className="bg-paper-50 border border-paper-200 p-4 rounded-md flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {flatCategorias.map(cat => {
                    const isSelected = selectedCategoriaIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-yellow-100 text-brand-yellow-800 border-brand-yellow-300' 
                            : 'bg-paper-0 text-ink-600 border-paper-200 hover:border-brand-yellow-200 hover:bg-brand-yellow-50'
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
                <span className="block text-xs font-bold uppercase tracking-wider text-ink-600">Ingredientes y Alérgenos Asociados</span>
                <div className="bg-paper-50 border border-paper-200 p-4 rounded-md flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {ingredientes.map(ing => {
                    const isSelected = selectedIngredienteIds.includes(ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleIngrediente(ing.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected 
                            ? ing.es_alergeno 
                              ? 'bg-danger-100 text-danger-800 border-danger-300 shadow-sm' 
                              : 'bg-brand-red-50 text-brand-red-700 border-brand-red-200'
                            : 'bg-paper-0 text-ink-600 border-paper-200 hover:border-brand-red-200 hover:bg-brand-red-50'
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
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-ink-200 text-ink-700 rounded-md hover:bg-paper-50 font-semibold text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold rounded-md shadow-sm active:scale-[0.98] disabled:opacity-50 transition-all text-sm cursor-pointer"
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
