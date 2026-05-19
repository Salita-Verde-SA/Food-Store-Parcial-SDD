import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  FolderPlus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Search,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

import { categoriasApi } from '../../shared/api/categorias';
import type { Categoria, CategoriaTree } from '../../shared/types';
import { useAuthStore } from '../../shared/stores/authStore';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

export const CategoriasManager = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const isAdmin = user?.roles.some((r: string) => r === 'ADMIN') ?? false;
  const { showAlert, showConfirm } = useFeedback();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: tree = [], isLoading, isError, error } = useQuery<CategoriaTree[]>({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getTree,
  });

  const createMutation = useMutation({
    mutationFn: categoriasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.detail || 'Error al crear la categoría'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Categoria, 'id'>> }) =>
      categoriasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.detail || 'Error al actualizar la categoría'),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriasApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categorias'] }),
    onError: (err: any) =>
      showAlert({
        title: 'Error',
        message: err.detail || 'No se puede eliminar la categoría',
        variant: 'danger',
      }),
  });

  const toggleExpand = (id: number) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = (defaultParentId: number | null = null) => {
    setEditingCategoria(null);
    setNombre('');
    setDescripcion('');
    setParentId(defaultParentId);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoriaTree) => {
    setEditingCategoria({
      id: cat.id,
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      parent_id: cat.parent_id,
    });
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
    setParentId(cat.parent_id || null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategoria(null);
    setNombre('');
    setDescripcion('');
    setParentId(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nombre.trim()) return setFormError('El nombre de la categoría es obligatorio.');

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      parent_id: parentId,
    };

    if (editingCategoria) {
      updateMutation.mutate({ id: editingCategoria.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const msg = isAdmin
      ? `¿Estás seguro de que deseas eliminar la categoría "${nombre}"?\nLas subcategorías hijas se moverán de forma segura a la raíz.`
      : `¿Estás seguro de que deseas eliminar la categoría "${nombre}"?`;

    const ok = await showConfirm({
      title: 'Eliminar Categoría',
      message: msg,
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const getFlattenedList = (nodesList: CategoriaTree[]): Categoria[] => {
    let flat: Categoria[] = [];
    nodesList.forEach(node => {
      flat.push({
        id: node.id,
        nombre: node.nombre,
        descripcion: node.descripcion,
        parent_id: node.parent_id,
      });
      if (node.children && node.children.length > 0) {
        flat.push(...getFlattenedList(node.children));
      }
    });
    return flat;
  };

  const getDescendantIds = (node: CategoriaTree): number[] => {
    let ids: number[] = [];
    if (node.children) {
      node.children.forEach(child => {
        ids.push(child.id);
        ids.push(...getDescendantIds(child));
      });
    }
    return ids;
  };

  const allFlatCategories = getFlattenedList(tree);

  const getEligibleParents = (): Categoria[] => {
    if (!editingCategoria) return allFlatCategories;

    const findNodeInTree = (nodesList: CategoriaTree[], id: number): CategoriaTree | null => {
      for (const node of nodesList) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeInTree(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const currentNodeInTree = findNodeInTree(tree, editingCategoria.id);
    if (!currentNodeInTree) return allFlatCategories;

    const excludedIds = [editingCategoria.id, ...getDescendantIds(currentNodeInTree)];
    return allFlatCategories.filter(cat => !excludedIds.includes(cat.id));
  };

  const eligibleParents = getEligibleParents();

  const renderCategoryNode = (node: CategoriaTree) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] ?? true;

    const matchesSearch =
      node.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.descripcion && node.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

    const childrenMatchSearch =
      node.children &&
      getFlattenedList(node.children).some(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (searchTerm && !matchesSearch && !childrenMatchSearch) {
      return null;
    }

    const levelColors = [
      'bg-brand-yellow-100/80 text-brand-yellow-800 border-brand-yellow-300/70',
      'bg-info-50/80 text-info-700 border-info-200/70',
      'bg-success-50/80 text-success-700 border-success-200/70',
      'bg-white/60 text-ink-700 border-white/50',
    ];
    const badgeStyle = levelColors[node.nivel % levelColors.length];

    return (
      <div key={node.id} className="ml-1 pl-3 border-l-2 border-white/40 mt-2">
        <div className="flex items-center justify-between p-3.5 glass-panel rounded-2xl hover:shadow-[var(--shadow-glass-hover)] hover:-translate-y-0.5 transition-all group duration-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded-xl hover:bg-white/60 text-ink-500 transition-colors shrink-0"
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-ink-300 shrink-0">•</div>
            )}

            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                hasChildren
                  ? 'bg-brand-yellow-100/80 text-brand-yellow-800'
                  : 'bg-white/50 text-ink-500'
              }`}
            >
              <Folder size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-ink-900 text-sm sm:text-base truncate">
                  {node.nombre}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${badgeStyle}`}
                >
                  Nivel {node.nivel}
                </span>
              </div>
              {node.descripcion && (
                <p className="text-xs text-ink-500 mt-0.5 line-clamp-1 font-medium">
                  {node.descripcion}
                </p>
              )}
            </div>
          </div>

          {isManager && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 shrink-0">
              <button
                onClick={() => openCreateModal(node.id)}
                title="Agregar subcategoría"
                className="p-2 rounded-xl text-ink-500 hover:bg-brand-yellow-100/80 hover:text-brand-yellow-800 transition-all cursor-pointer"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => openEditModal(node)}
                title="Editar categoría"
                className="p-2 rounded-xl text-ink-500 hover:bg-info-50/80 hover:text-info-700 transition-all cursor-pointer"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(node.id, node.nombre)}
                disabled={node.nivel === 0 && !isAdmin}
                title={
                  node.nivel === 0 && !isAdmin
                    ? 'Solo los administradores pueden borrar categorías raíz'
                    : 'Eliminar categoría'
                }
                className={`p-2 rounded-xl text-ink-500 hover:bg-danger-50/70 hover:text-danger-600 transition-all cursor-pointer ${
                  node.nivel === 0 && !isAdmin ? 'cursor-not-allowed opacity-30' : ''
                }`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map(child => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  const labelBase = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  return (
    <div className="w-full space-y-6">
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar categorías por nombre…"
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
            onClick={() => openCreateModal(null)}
            className="flex items-center justify-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-brand active:scale-[0.98] transition-all text-sm cursor-pointer"
          >
            <FolderPlus size={16} />
            <span>Nueva categoría raíz</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-ink-500 font-bold text-sm">Cargando árbol de categorías…</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto backdrop-blur-sm">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800">Error al cargar categorías</h3>
            <p className="text-sm text-danger-700 mt-1">
              {(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}
            </p>
          </div>
        </div>
      ) : tree.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
          <Folder className="mx-auto text-ink-300 stroke-1" size={56} />
          <h3 className="font-display text-xl font-bold text-ink-900">No hay categorías</h3>
          <p className="text-sm text-ink-500 font-medium">
            Comenzá creando tu primera categoría raíz para estructurar el catálogo gastronómico.
          </p>
          {isManager && (
            <button
              onClick={() => openCreateModal(null)}
              className="inline-flex items-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand transition-all text-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Crear Categoría</span>
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-4 space-y-2">{tree.map(node => renderCategoryNode(node))}</div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-modal rounded-2xl max-w-md w-full overflow-hidden flex flex-col animate-glassIn max-h-[90vh]">
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 border-b border-white/40 shrink-0">
              <h3 className="font-display text-xl font-extrabold text-ink-900 flex items-center gap-2">
                <FolderPlus className="text-brand-yellow-600" size={20} />
                {editingCategoria ? 'Editar categoría' : 'Nueva categoría'}
              </h3>
              <button
                onClick={closeModal}
                className="w-9 h-9 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/80 text-ink-700 transition-all cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 p-4 rounded-2xl flex items-start gap-2 text-sm animate-shake font-medium backdrop-blur-sm">
                  <AlertCircle className="text-danger-500 shrink-0 mt-0.5" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className={labelBase}>Nombre de la categoría *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Hamburguesas, Bebidas con alcohol"
                  className="glass-input"
                />
              </div>

              <div>
                <label className={labelBase}>Descripción (opcional)</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describe brevemente los productos de esta categoría…"
                  rows={3}
                  className="glass-input"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <label className={labelBase}>Categoría padre</label>
                  <div className="group relative">
                    <HelpCircle size={14} className="text-ink-400 cursor-help -mt-1.5" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-ink-900 text-white text-[10px] rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-10 font-medium">
                      Si seleccionás "Ninguna", será una categoría principal en la raíz.
                    </div>
                  </div>
                </div>
                <select
                  value={parentId === null ? '' : parentId}
                  onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
                  className="glass-input"
                >
                  <option value="">Ninguna (Categoría Raíz)</option>
                  {eligibleParents.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
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
