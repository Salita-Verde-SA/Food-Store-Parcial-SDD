import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cookie,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

import { ingredientesApi } from '../../shared/api/ingredientes';
import type { Ingrediente } from '../../shared/types';
import { useAuthStore } from '../../shared/stores/authStore';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

export const IngredientesManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const { showAlert, showConfirm } = useFeedback();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngrediente, setEditingIngrediente] = useState<Ingrediente | null>(null);

  const [nombre, setNombre] = useState('');
  const [esAlergeno, setEsAlergeno] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: ingredientes = [], isLoading, isError, error } = useQuery<Ingrediente[]>({
    queryKey: ['ingredientes'],
    queryFn: () => ingredientesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: ingredientesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al crear el ingrediente';
      setFormError(detail);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Ingrediente, 'id'>> }) =>
      ingredientesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al actualizar el ingrediente';
      setFormError(detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ingredientesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredientes'] }),
    onError: (err: any) => {
      const detail =
        err.detail ||
        'No se puede eliminar el ingrediente porque está asociado a un producto activo.';
      showAlert({ title: 'Error de integridad', message: detail, variant: 'danger' });
    },
  });

  const openCreateModal = () => {
    setEditingIngrediente(null);
    setNombre('');
    setEsAlergeno(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ing: Ingrediente) => {
    setEditingIngrediente(ing);
    setNombre(ing.nombre);
    setEsAlergeno(ing.es_alergeno);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIngrediente(null);
    setNombre('');
    setEsAlergeno(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nombre.trim()) return setFormError('El nombre del ingrediente es obligatorio.');

    const payload = { nombre: nombre.trim(), es_alergeno: esAlergeno };

    if (editingIngrediente) {
      updateMutation.mutate({ id: editingIngrediente.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const ok = await showConfirm({
      title: 'Eliminar ingrediente',
      message: `¿Estás seguro de que deseas eliminar el ingrediente "${nombre}"?\nSe aplicará una baja lógica. No debe estar en uso por ningún producto.`,
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const filteredIngredientes = ingredientes.filter(ing =>
    ing.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const labelBase = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  return (
    <div className="w-full space-y-6">
      {/* Buscador */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar ingredientes por nombre…"
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
            <span>Nuevo ingrediente</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-ink-500 font-bold text-sm">Cargando ingredientes…</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn backdrop-blur-sm">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800">Error al cargar ingredientes</h3>
            <p className="text-sm text-danger-700 mt-1">
              {(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}
            </p>
          </div>
        </div>
      ) : filteredIngredientes.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
          <Cookie className="mx-auto text-ink-300 stroke-1" size={56} />
          <h3 className="font-display text-xl font-bold text-ink-900">No hay ingredientes</h3>
          <p className="text-sm text-ink-500 font-medium">
            Introducí ingredientes para enriquecer las recetas de tus pizzas, hamburguesas y bebidas.
          </p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand transition-all text-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Crear ingrediente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredIngredientes.map(ing => (
            <div
              key={ing.id}
              className="glass-panel rounded-2xl p-5 hover:shadow-[var(--shadow-glass-hover)] hover:-translate-y-0.5 transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              {ing.es_alergeno && (
                <div className="absolute top-0 right-0 bg-brand-red-500 text-white text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <ShieldAlert size={11} />
                  <span>Alérgeno</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="p-3 glass-panel text-brand-yellow-800 rounded-xl w-fit">
                  <Cookie size={22} />
                </div>
                <div>
                  <h4 className="font-display text-lg font-extrabold text-ink-900 break-words pr-12 leading-tight">
                    {ing.nombre}
                  </h4>
                  <p className="text-xs text-ink-500 mt-1.5 font-medium leading-relaxed flex items-start gap-1.5">
                    {ing.es_alergeno ? (
                      <>
                        <ShieldAlert size={12} className="text-danger-500 shrink-0 mt-0.5" />
                        <span>Requiere advertencia obligatoria de alérgenos.</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} className="text-success-600 shrink-0 mt-0.5" />
                        <span>Ingrediente seguro libre de alérgenos estándar.</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {isManager && (
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-white/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openEditModal(ing)}
                    className="p-2 bg-info-50/80 text-info-700 rounded-xl hover:bg-info-100/80 transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id, ing.nombre)}
                    className="p-2 bg-danger-50/80 text-danger-600 rounded-xl hover:bg-danger-100/80 transition-all cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-modal rounded-2xl max-w-md w-full overflow-hidden flex flex-col animate-glassIn max-h-[90vh]">
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="flex items-center justify-between p-6 border-b border-white/40 shrink-0">
              <h3 className="font-display text-xl font-extrabold text-ink-900 flex items-center gap-2">
                <Cookie className="text-brand-yellow-600" size={20} />
                {editingIngrediente ? 'Editar ingrediente' : 'Nuevo ingrediente'}
              </h3>
              <button
                onClick={closeModal}
                className="w-9 h-9 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {formError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 p-4 rounded-xl flex items-start gap-2 text-sm animate-shake font-medium backdrop-blur-sm">
                  <AlertCircle className="text-danger-500 shrink-0 mt-0.5" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className={labelBase}>Nombre del ingrediente *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Harina de Trigo, Mozzarella, Panceta"
                  className="glass-input"
                />
              </div>

              <div
                onClick={() => setEsAlergeno(!esAlergeno)}
                className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer select-none transition-colors ${
                  esAlergeno
                    ? 'bg-danger-50/80 border-danger-200/70'
                    : 'bg-white/40 border-white/50 hover:border-brand-yellow-300'
                }`}
              >
                <input
                  type="checkbox"
                  id="es_alergeno"
                  checked={esAlergeno}
                  readOnly
                  className="w-5 h-5 rounded border-2 border-ink-300 accent-brand-red-500 cursor-pointer mt-0.5"
                />
                <div className="space-y-0.5">
                  <label htmlFor="es_alergeno" className="block text-sm font-bold text-ink-900 cursor-pointer">
                    ¿Es un alérgeno crítico?
                  </label>
                  <p className="text-xs text-ink-600 font-medium leading-relaxed">
                    Marcá si contiene trigo/gluten, lácteos, frutos secos u otros alérgenos de
                    advertencia legal obligatoria.
                  </p>
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
