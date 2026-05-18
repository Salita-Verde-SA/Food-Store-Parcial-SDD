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
  ShieldAlert
} from 'lucide-react';

import { ingredientesApi } from '../../shared/api/ingredientes';
import type { Ingrediente } from '../../shared/types';
import { useAuthStore } from '../../shared/stores/authStore';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

export const IngredientesManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const isAdmin = user?.roles.some((r: string) => r === 'ADMIN') ?? false;
  const { showAlert, showConfirm } = useFeedback();

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngrediente, setEditingIngrediente] = useState<Ingrediente | null>(null);
  
  // Campos del Formulario
  const [nombre, setNombre] = useState('');
  const [esAlergeno, setEsAlergeno] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Query - Obtener ingredientes
  const { data: ingredientes = [], isLoading, isError, error } = useQuery<Ingrediente[]>({
    queryKey: ['ingredientes'],
    queryFn: () => ingredientesApi.getAll(),
  });

  // Mutación - Crear
  const createMutation = useMutation({
    mutationFn: ingredientesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      closeModal();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || 'Error al crear el ingrediente';
      setFormError(detail);
    }
  });

  // Mutación - Editar
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
    }
  });

  // Mutación - Eliminar
  const deleteMutation = useMutation({
    mutationFn: ingredientesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || 'No se puede eliminar el ingrediente porque está asociado a un producto activo.';
      showAlert({ title: 'Error de Integridad', message: detail, variant: 'danger' });
    }
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

    if (!nombre.trim()) {
      setFormError('El nombre del ingrediente es obligatorio.');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      es_alergeno: esAlergeno,
    };

    if (editingIngrediente) {
      updateMutation.mutate({ id: editingIngrediente.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const ok = await showConfirm({
      title: 'Eliminar Ingrediente',
      message: `¿Estás seguro de que deseas eliminar el ingrediente "${nombre}"?\nSe aplicará una baja lógica. No debe estar en uso por ningún producto.`,
      variant: 'danger',
      confirmText: 'Eliminar'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrado por buscador
  const filteredIngredientes = ingredientes.filter(ing => 
    ing.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";
  const inputBase = "w-full px-4 py-2 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150";

  return (
    <div className="w-full space-y-6">
      {/* Cabecera / Buscador */}
      <div className={`${cardBase} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar ingredientes por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputBase} pl-10`}
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
            <span>Nuevo Ingrediente</span>
          </button>
        )}
      </div>

      {/* Listado Principal */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-ink-500 font-bold text-sm">Cargando ingredientes...</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-100 rounded-md p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn">
          <AlertCircle className="text-danger-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-danger-800">Error al cargar ingredientes</h3>
            <p className="text-sm text-danger-700 mt-1">{(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}</p>
          </div>
        </div>
      ) : filteredIngredientes.length === 0 ? (
        <div className={`${cardBase} p-8 text-center max-w-md mx-auto`}>
          <Cookie className="mx-auto text-ink-300" size={56} />
          <h3 className="mt-4 font-bold text-ink-700">No hay ingredientes</h3>
          <p className="text-sm text-ink-500 mt-2">Introduce ingredientes para enriquecer las recetas de tus pizzas, hamburguesas y bebidas.</p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold px-4 py-2 rounded-md transition-all text-sm cursor-pointer"
            >
              <Plus size={18} />
              <span>Crear Ingrediente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredIngredientes.map(ing => (
            <div 
              key={ing.id} 
              className={`${cardBase} p-5 hover:border-brand-yellow-400 transition-all group relative overflow-hidden flex flex-col justify-between`}
            >
              {/* Badge Alérgeno */}
              {ing.es_alergeno && (
                <div className="absolute top-0 right-0 bg-brand-red-500 text-white border-b border-l border-brand-red-600 text-[9px] font-black tracking-wider uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm">
                  <ShieldAlert size={12} />
                  <span>Alérgeno</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="p-3 bg-brand-yellow-100 text-brand-yellow-800 rounded-md w-fit">
                  <Cookie size={24} />
                </div>
                <div>
                  <h4 className="font-black text-ink-900 text-base sm:text-lg break-words pr-12">{ing.nombre}</h4>
                  <p className="text-xs text-ink-500 mt-1 font-medium">
                    {ing.es_alergeno 
                      ? '⚠️ Requiere advertencia obligatoria de alérgenos en el menú.' 
                      : '✅ Ingrediente seguro libre de alérgenos estándar.'}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              {isManager && (
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-paper-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openEditModal(ing)}
                    className="p-1.5 bg-info-50 text-info-600 rounded-md hover:bg-info-100 transition-all cursor-pointer"
                    title="Editar ingrediente"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id, ing.nombre)}
                    className="p-1.5 bg-danger-50 text-danger-600 rounded-md hover:bg-danger-100 transition-all cursor-pointer"
                    title="Eliminar ingrediente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`${cardBase} max-w-md w-full overflow-hidden flex flex-col transform transition-all duration-300 scale-100 p-0`}>
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-paper-200 bg-paper-50">
              <h3 className="font-black text-ink-900 text-lg flex items-center gap-2">
                <Cookie className="text-brand-yellow-600" size={20} />
                {editingIngrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
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

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Nombre del Ingrediente *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Harina de Trigo, Mozzarella, Panceta"
                  className={inputBase}
                />
              </div>

              {/* Checkbox de Alérgenos */}
              <div className="bg-paper-50 p-4 rounded-md border border-paper-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="es_alergeno"
                  checked={esAlergeno}
                  onChange={(e) => setEsAlergeno(e.target.checked)}
                  className="w-5 h-5 rounded border-paper-300 text-brand-red-500 focus:ring-brand-red-500/20 cursor-pointer mt-0.5 accent-brand-red-500"
                />
                <div className="space-y-0.5">
                  <label htmlFor="es_alergeno" className="block text-sm font-bold text-ink-900 cursor-pointer select-none">
                    ¿Es un alérgeno crítico?
                  </label>
                  <p className="text-xs text-ink-500 font-medium">
                    Marca esta opción si contiene trigo/gluten, lácteos, frutos secos u otros alérgenos de advertencia legal obligatoria.
                  </p>
                </div>
              </div>

              {/* Acciones del Formulario */}
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
