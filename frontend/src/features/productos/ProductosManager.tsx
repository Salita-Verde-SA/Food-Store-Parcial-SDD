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
  Image as ImageIcon,
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

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<string>('0.00');
  const [stock, setStock] = useState<number>(0);
  const [disponible, setDisponible] = useState(true);
  const [imagenUrl, setImagenUrl] = useState('');
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<number[]>([]);
  const [selectedIngredienteIds, setSelectedIngredienteIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: productos = [], isLoading, isError, error } = useQuery<Producto[]>({
    queryKey: ['productosAdmin'],
    queryFn: () => productosApi.listAdmin(),
  });

  const { data: categoriasTree = [] } = useQuery<CategoriaTree[]>({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getTree,
  });

  const { data: ingredientes = [] } = useQuery<Ingrediente[]>({
    queryKey: ['ingredientes'],
    queryFn: () => ingredientesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: productosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al crear el producto';
      setFormError(detail);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productosAdmin'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al actualizar el producto';
      setFormError(detail);
    },
  });

  const patchStockMutation = useMutation({
    mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) =>
      productosApi.patchStock(id, cantidad),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productosAdmin'] }),
    onError: (err: any) =>
      showAlert({
        title: 'Error',
        message: err.response?.data?.detail || 'Error al ajustar el inventario.',
        variant: 'danger',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: productosApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productosAdmin'] }),
    onError: (err: any) =>
      showAlert({
        title: 'Error',
        message: err.response?.data?.detail || 'Error al dar de baja el producto.',
        variant: 'danger',
      }),
  });

  const getFlattenedCategories = (nodesList: CategoriaTree[]): Categoria[] => {
    let flat: Categoria[] = [];
    nodesList.forEach(node => {
      flat.push({
        id: node.id,
        nombre: node.nombre,
        descripcion: node.descripcion,
        parent_id: node.parent_id,
      });
      if (node.children && node.children.length > 0) {
        flat.push(...getFlattenedCategories(node.children));
      }
    });
    return flat;
  };
  const flatCategorias = getFlattenedCategories(categoriasTree);

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

  const handleStockAdjust = (id: number, currentStock: number, delta: number) => {
    if (!isManager) return;
    if (currentStock + delta < 0) {
      showAlert({
        title: 'Operación rechazada',
        message: 'El stock físico no puede ser menor a cero.',
        variant: 'warning',
      });
      return;
    }
    patchStockMutation.mutate({ id, cantidad: delta });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nombre.trim()) return setFormError('El nombre del producto es obligatorio.');
    const priceNum = Number(precio);
    if (isNaN(priceNum) || priceNum <= 0) return setFormError('El precio debe ser un número mayor a 0.');
    if (stock < 0) return setFormError('El stock inicial no puede ser negativo.');
    if (selectedCategoriaIds.length !== 1)
      return setFormError('Debe asociar el producto a exactamente una categoría.');

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
      title: 'Baja de producto',
      message: `¿Estás seguro de que deseas dar de baja el producto "${nombre}"?\nSe aplicará una baja lógica (soft delete).`,
      variant: 'danger',
      confirmText: 'Dar de baja',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoriaIds(prev => (prev.includes(id) ? [] : [id]));
  };

  const toggleIngrediente = (id: number) => {
    setSelectedIngredienteIds(prev =>
      prev.includes(id) ? prev.filter(iId => iId !== id) : [...prev, id]
    );
  };

  const filteredProductos = productos.filter(
    p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const labelBase = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  return (
    <div className="w-full space-y-6">
      {/* Buscador / acción */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar productos en stock…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="glass-input pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isManager && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-brand active:scale-[0.98] transition-all text-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Nuevo producto</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-ink-500 font-bold text-sm">Cargando catálogo…</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn backdrop-blur-sm">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800">Error al cargar productos</h3>
            <p className="text-sm text-danger-700 mt-1">
              {(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}
            </p>
          </div>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
          <ShoppingBag className="mx-auto text-ink-300 stroke-1" size={56} />
          <h3 className="font-display text-xl font-bold text-ink-900">No hay productos cargados</h3>
          <p className="text-sm text-ink-500 font-medium">
            Introducí productos gastronómicos para habilitar la facturación y ventas.
          </p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand transition-all text-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Crear producto</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProductos.map(prod => {
            const hasAllergen = prod.ingredientes.some(i => i.es_alergeno);
            return (
              <article
                key={prod.id}
                className="glass-panel rounded-2xl hover:shadow-[var(--shadow-glass-hover)] hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between overflow-hidden relative"
              >
                {/* Imagen */}
                <div className="h-44 bg-white/30 relative overflow-hidden flex items-center justify-center border-b border-white/40 shrink-0">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-brand-yellow-700/60">
                      <ImageIcon size={48} className="stroke-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">
                        Sin imagen
                      </span>
                    </div>
                  )}

                  {hasAllergen && (
                    <div className="absolute top-3 right-3 bg-brand-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1 shadow-sm">
                      <ShieldAlert size={11} />
                      <span>Alérgeno</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 bg-ink-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl text-sm font-display font-black shadow-md border border-white/10 tabular-nums">
                    ${Number(prod.precio).toFixed(2)}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display text-lg font-extrabold text-ink-900 line-clamp-1 leading-tight">
                        {prod.nombre}
                      </h4>
                      <span
                        className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full shrink-0 border tracking-widest ${
                          prod.disponible
                            ? 'bg-success-50/80 text-success-700 border-success-200/70'
                            : 'bg-danger-50/80 text-danger-700 border-danger-200/70'
                        }`}
                      >
                        {prod.disponible ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    {prod.descripcion && (
                      <p className="text-xs text-ink-600 line-clamp-2 font-medium leading-relaxed">
                        {prod.descripcion}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {prod.categorias.map(cat => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 text-[10px] bg-brand-yellow-100/80 text-brand-yellow-800 border border-brand-yellow-200/60 font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                        >
                          <Layers size={10} />
                          {cat.nombre}
                        </span>
                      ))}
                    </div>

                    {prod.ingredientes.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-ink-500 font-black uppercase tracking-[0.15em] block">
                          Ingredientes
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {prod.ingredientes.map(ing => (
                            <span
                              key={ing.id}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                ing.es_alergeno
                                  ? 'bg-danger-50/80 text-danger-700 border-danger-200/60'
                                  : 'bg-white/60 text-ink-700 border-white/50'
                              }`}
                            >
                              {ing.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inventario */}
                  <div className="glass-panel rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-ink-500 font-black uppercase tracking-wider block">
                        Existencias
                      </span>
                      <span
                        className={`font-display text-base font-black tabular-nums ${
                          (prod.stock ?? 0) <= 0
                            ? 'text-danger-600'
                            : (prod.stock ?? 0) < 5
                            ? 'text-brand-yellow-700'
                            : 'text-ink-900'
                        }`}
                      >
                        {(prod.stock ?? 0) <= 0 ? 'Sin stock' : `${prod.stock} u.`}
                      </span>
                    </div>

                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStockAdjust(prod.id, prod.stock ?? 0, -1)}
                          disabled={patchStockMutation.isPending}
                          className="w-8 h-8 flex items-center justify-center glass-panel text-ink-700 font-bold rounded-xl hover:bg-danger-50/70 hover:text-brand-red-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Restar 1"
                        >
                          −
                        </button>
                        <button
                          onClick={() => handleStockAdjust(prod.id, prod.stock ?? 0, 1)}
                          disabled={patchStockMutation.isPending}
                          className="w-8 h-8 flex items-center justify-center glass-panel text-ink-700 font-bold rounded-xl hover:bg-success-50/70 hover:text-success-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isManager && (
                  <div className="flex items-center justify-end gap-2 px-5 pb-5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-2 bg-info-50/80 text-info-700 rounded-xl hover:bg-info-100/80 transition-all cursor-pointer"
                      title="Editar"
                    >
                      <Edit size={15} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(prod.id, prod.nombre)}
                        className="p-2 bg-danger-50/80 text-danger-600 rounded-xl hover:bg-danger-100/80 transition-all cursor-pointer"
                        title="Baja del producto"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-modal rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-glassIn">
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 border-b border-white/40 shrink-0">
              <h3 className="font-display text-xl font-extrabold text-ink-900 flex items-center gap-2">
                <ShoppingBag className="text-brand-yellow-600" size={20} />
                {editingProducto ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button
                onClick={closeModal}
                className="w-9 h-9 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/80 text-ink-700 transition-all cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {formError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 p-4 rounded-2xl flex items-start gap-2 text-sm animate-shake font-medium backdrop-blur-sm">
                  <AlertCircle className="text-danger-500 shrink-0 mt-0.5" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className={labelBase}>Nombre del producto *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Pizza Margherita"
                    className="glass-input font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelBase}>Precio ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={precio}
                    onChange={e => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className="glass-input font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={labelBase}>Stock inicial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={!!editingProducto}
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="glass-input font-bold tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelBase}>URL de imagen (opc.)</label>
                  <input
                    type="url"
                    value={imagenUrl}
                    onChange={e => setImagenUrl(e.target.value)}
                    placeholder="https://…/comida.jpg"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div
                    onClick={() => setDisponible(!disponible)}
                    className={`px-4 py-2.5 rounded-2xl border-2 flex items-center gap-2 h-[42px] cursor-pointer transition-all ${
                      disponible
                        ? 'bg-success-50/80 border-success-200/70'
                        : 'bg-white/40 border-white/50 hover:border-brand-yellow-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="disponible"
                      checked={disponible}
                      readOnly
                      className="w-4 h-4 rounded border-white/40 accent-brand-red-500 cursor-pointer"
                    />
                    <label htmlFor="disponible" className="text-sm font-bold text-ink-900 cursor-pointer select-none">
                      Disponible
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelBase}>Descripción del plato</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Escribí los detalles del plato…"
                  rows={2}
                  className="glass-input"
                />
              </div>

              <div className="space-y-2">
                <span className={labelBase}>Categoría * (seleccioná una)</span>
                <div className="bg-white/40 border border-white/40 p-4 rounded-2xl flex flex-wrap gap-2 max-h-32 overflow-y-auto backdrop-blur-sm">
                  {flatCategorias.map(cat => {
                    const isSelected = selectedCategoriaIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-yellow-100/80 text-brand-yellow-800 border-brand-yellow-300/70'
                            : 'bg-white/50 text-ink-700 border-white/50 hover:border-brand-yellow-200 hover:bg-brand-yellow-50/60'
                        }`}
                      >
                        {cat.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className={labelBase}>Ingredientes y alérgenos</span>
                <div className="bg-white/40 border border-white/40 p-4 rounded-2xl flex flex-wrap gap-2 max-h-40 overflow-y-auto backdrop-blur-sm">
                  {ingredientes.map(ing => {
                    const isSelected = selectedIngredienteIds.includes(ing.id);
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleIngrediente(ing.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? ing.es_alergeno
                              ? 'bg-danger-100/80 text-danger-800 border-danger-300/70 shadow-sm'
                              : 'bg-brand-red-500/10 text-brand-red-700 border-brand-red-200/60'
                            : 'bg-white/50 text-ink-700 border-white/50 hover:border-brand-red-200 hover:bg-brand-red-50/50'
                        }`}
                      >
                        {ing.nombre}
                        {ing.es_alergeno && <ShieldAlert size={11} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/40">
                <button
                  type="button"
                  onClick={closeModal}
                  className="glass-panel hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 rounded-2xl transition-all cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand active:scale-[0.98] disabled:opacity-50 transition-all text-sm cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
