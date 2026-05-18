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

export const IngredientesManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = user?.roles.some((r: string) => ['ADMIN', 'STOCK'].includes(r)) ?? false;
  const isAdmin = user?.roles.some((r: string) => r === 'ADMIN') ?? false;

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
      alert(`⚠️ ERROR DE INTEGRIDAD:\n${detail}`);
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

  const handleDelete = (id: number, nombre: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el ingrediente "${nombre}"?\nSe aplicará una baja lógica. No debe estar en uso por ningún producto.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrado por buscador
  const filteredIngredientes = ingredientes.filter(ing => 
    ing.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Cabecera / Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar ingredientes por nombre..."
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
            <span>Nuevo Ingrediente</span>
          </button>
        )}
      </div>

      {/* Listado Principal */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 font-medium text-sm">Cargando ingredientes...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto animate-fadeIn">
          <AlertCircle className="text-red-600 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-red-800">Error al cargar ingredientes</h3>
            <p className="text-sm text-red-700 mt-1">{(error as any)?.message || 'Ha ocurrido un error inesperado al conectar con el servidor.'}</p>
          </div>
        </div>
      ) : filteredIngredientes.length === 0 ? (
        <div className="text-center py-16 bg-white/50 border border-gray-100 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
          <Cookie className="mx-auto text-gray-300" size={56} />
          <h3 className="mt-4 font-bold text-gray-700">No hay ingredientes</h3>
          <p className="text-sm text-gray-500 mt-2">Introduce ingredientes para enriquecer las recetas de tus pizzas, hamburguesas y bebidas.</p>
          {isManager && (
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm cursor-pointer"
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
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-orange-200 transition-all group duration-200 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Badge Alérgeno */}
              {ing.es_alergeno && (
                <div className="absolute top-0 right-0 bg-red-50 text-red-600 border-l border-b border-red-100 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-bl-xl flex items-center gap-1">
                  <ShieldAlert size={12} />
                  <span>Alérgeno</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-xl w-fit">
                  <Cookie size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-base sm:text-lg break-words pr-12">{ing.nombre}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {ing.es_alergeno 
                      ? '⚠️ Requiere advertencia obligatoria de alérgenos en el menú.' 
                      : '✅ Ingrediente seguro libre de alérgenos estándar.'}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              {isManager && (
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openEditModal(ing)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                    title="Editar ingrediente"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id, ing.nombre)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col transform transition-all duration-300 scale-100">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Cookie className="text-orange-500" size={20} />
                {editingIngrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
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

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Nombre del Ingrediente *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Harina de Trigo, Mozzarella, Panceta"
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900 transition-all font-semibold"
                  style={{ color: '#1f2937' }} // Garantiza alta visibilidad del texto ingresado
                />
              </div>

              {/* Checkbox de Alérgenos */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="es_alergeno"
                  checked={esAlergeno}
                  onChange={(e) => setEsAlergeno(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 cursor-pointer mt-0.5 accent-orange-500"
                />
                <div className="space-y-0.5">
                  <label htmlFor="es_alergeno" className="block text-sm font-bold text-gray-800 cursor-pointer select-none">
                    ¿Es un alérgeno crítico?
                  </label>
                  <p className="text-xs text-gray-500">
                    Marca esta opción si contiene trigo/gluten, lácteos, frutos secos u otros alérgenos de advertencia legal obligatoria.
                  </p>
                </div>
              </div>

              {/* Acciones del Formulario */}
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
