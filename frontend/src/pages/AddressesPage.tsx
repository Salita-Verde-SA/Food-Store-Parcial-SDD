import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  ChevronLeft, 
  Home, 
  Briefcase, 
  Navigation,
  X,
  AlertCircle,
  Sparkles,
  Menu,
  ShoppingCart
} from 'lucide-react';

import { direccionesApi } from '../shared/api/direcciones';
import { useAuthStore } from '../shared/stores/authStore';
import { useCartStore } from '../shared/stores/cartStore';
import { extractErrorMessage } from '../shared/api/axios';
import type { DireccionEntrega, DireccionEntregaCreate } from '../shared/types';

export const AddressesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const getTotalItems = useCartStore((s) => s.getTotalItems);

  // Estados locales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DireccionEntrega | null>(null);

  // Campos de formulario
  const [alias, setAlias] = useState('Casa');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [piso, setPiso] = useState('');
  const [depto, setDepto] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Query - Obtener direcciones
  const { data: direcciones = [], isLoading, isError } = useQuery<DireccionEntrega[]>({
    queryKey: ['direcciones'],
    queryFn: direccionesApi.getDirecciones,
  });

  // Mutación - Crear
  const createMutation = useMutation({
    mutationFn: direccionesApi.crearDireccion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(extractErrorMessage(err));
    }
  });

  // Mutación - Editar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DireccionEntregaCreate> }) => 
      direccionesApi.actualizarDireccion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(extractErrorMessage(err));
    }
  });

  // Mutación - Eliminar
  const deleteMutation = useMutation({
    mutationFn: direccionesApi.eliminarDireccion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
    onError: (err: any) => {
      alert(err.detail || 'Error al eliminar la dirección');
    }
  });

  // Mutación - Marcar principal
  const setPrincipalMutation = useMutation({
    mutationFn: direccionesApi.establecerPrincipal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
    onError: (err: any) => {
      alert(err.detail || 'Error al establecer dirección principal');
    }
  });

  const openCreateModal = () => {
    setEditingAddress(null);
    setAlias('Casa');
    setCalle('');
    setNumero('');
    setPiso('');
    setDepto('');
    setIndicaciones('');
    setEsPrincipal(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dir: DireccionEntrega) => {
    setEditingAddress(dir);
    setAlias(dir.alias);
    setCalle(dir.calle);
    setNumero(dir.numero);
    setPiso(dir.piso_depto || '');
    setDepto('');
    setIndicaciones('');
    setEsPrincipal(dir.es_principal);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!calle.trim()) return setFormError('La calle es obligatoria');
    if (!numero.trim()) return setFormError('El número es obligatorio');

    const payload: DireccionEntregaCreate = {
      alias: alias.trim() || 'Mi Dirección',
      calle: calle.trim(),
      numero: numero.trim(),
      piso_depto: [piso.trim(), depto.trim()].filter(Boolean).join(' ') || null,
      ciudad: 'CABA',
      codigo_postal: '1000',
      es_principal: esPrincipal,
    };

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión en Food Store?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 flex flex-col font-sans">
      
      {/* HEADER DE CLIENTE */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all">
            FS
          </Link>
          <div>
            <span className="font-extrabold text-gray-800 text-lg">Food Store</span>
            <span className="block text-[10px] text-orange-600 tracking-widest uppercase font-black">Mis Direcciones</span>
          </div>
        </div>

        {/* Controles de usuario & carrito */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-500 font-bold transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Volver al Menú</span>
          </Link>

          {/* Menú de Usuario Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shadow-sm cursor-pointer hover:bg-orange-200 active:scale-95 transition-all"
            >
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </button>

            {isUserMenuOpen && (
              <>
                <div 
                  onClick={() => setIsUserMenuOpen(false)}
                  className="fixed inset-0 z-45"
                ></div>
                <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-scaleUp">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <span className="block font-bold text-gray-800 text-xs">{user?.nombre} {user?.apellido}</span>
                    <span className="block text-[9px] text-gray-400 font-medium truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/direcciones"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-700 bg-orange-50/50 text-orange-700 font-bold text-xs transition-all"
                  >
                    <MapPin size={14} />
                    <span>Mis Direcciones</span>
                  </Link>
                  <Link
                    to="/pedidos"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-bold text-xs transition-all"
                  >
                    <Navigation size={14} />
                    <span>Mis Pedidos</span>
                  </Link>
                  {user?.roles.some((r: string) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r)) && (
                    <Link
                      to="/admin/categorias"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-bold text-xs transition-all"
                    >
                      <Briefcase size={14} />
                      <span>Panel Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs transition-all cursor-pointer border-t border-gray-50 mt-1"
                  >
                    <X size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* CUERPO DE LA PAGINA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        
        {/* Breadcrumb / Título móvil */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="sm:hidden flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
              <ChevronLeft size={12} />
              <span>Menú</span>
            </Link>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Mis Direcciones de Entrega</h2>
            <p className="text-xs text-gray-500">Administrá los lugares donde recibís tu comida favorita</p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-4 py-2.5 rounded-2xl shadow-md shadow-orange-500/10 active:scale-95 transition-all text-xs cursor-pointer"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar Dirección</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 font-bold text-xs">Cargando ubicaciones...</span>
          </div>
        ) : isError ? (
          <div className="bg-red-50/50 backdrop-blur-md border border-red-200 rounded-3xl p-6 flex items-start gap-4">
            <AlertCircle className="text-red-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Error al cargar</h3>
              <p className="text-xs text-red-700 mt-1">No pudimos conectar con el servidor para traer tus direcciones.</p>
            </div>
          </div>
        ) : direcciones.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8 max-w-md mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
              <MapPin size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-700 text-sm">Sin direcciones guardadas</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Aún no agregaste ninguna dirección. Registrá tu casa, oficina o dirección principal para hacer pedidos más rápido.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-extrabold cursor-pointer hover:underline"
            >
              <span>Crear mi primera dirección</span>
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {direcciones.map(dir => (
              <div 
                key={dir.id}
                className={`bg-white border p-5 rounded-3xl flex flex-col justify-between gap-4 shadow-xxs transition-all relative overflow-hidden group ${
                  dir.es_principal 
                    ? 'border-orange-500/60 ring-2 ring-orange-500/5' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {dir.es_principal && (
                  <div className="absolute top-0 right-0 bg-gradient-to-bl from-orange-500 to-amber-500 text-white text-[8px] font-black uppercase px-3.5 py-1 rounded-bl-xl tracking-wider">
                    Principal
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-orange-50 border border-orange-100/50 rounded-lg text-orange-600 text-xs shrink-0">
                      {dir.alias.toLowerCase() === 'casa' ? <Home size={14} /> : 
                       dir.alias.toLowerCase() === 'trabajo' || dir.alias.toLowerCase() === 'oficina' ? <Briefcase size={14} /> : 
                       <MapPin size={14} />}
                    </span>
                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-wider">{dir.alias}</h4>
                  </div>

                  <div className="text-xs text-gray-600 font-medium leading-relaxed">
                    <p className="font-bold text-gray-800">{dir.calle} {dir.numero}</p>
                    {dir.piso_depto && (
                      <p className="text-[11px] text-gray-400">
                        {dir.piso_depto}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-3.5 mt-1 select-none">
                  {dir.es_principal ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-extrabold">
                      <Check size={12} className="stroke-[3]" />
                      <span>Activa para envíos</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPrincipalMutation.mutate(dir.id)}
                      className="text-[10px] text-gray-400 hover:text-orange-600 font-extrabold cursor-pointer transition-colors"
                    >
                      Establecer principal
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(dir)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all cursor-pointer text-[10px] font-bold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de eliminar esta dirección?')) {
                          deleteMutation.mutate(dir.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50/50 transition-all cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div 
            onClick={closeModal}
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs"
          ></div>

          {/* Container */}
          <form 
            onSubmit={handleSubmit}
            className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 z-10 space-y-5 animate-scaleUp border border-gray-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-orange-600 tracking-widest uppercase font-black block">
                  {editingAddress ? 'Modificación' : 'Nueva Ubicación'}
                </span>
                <h3 className="font-extrabold text-gray-800 text-lg leading-tight mt-0.5">
                  {editingAddress ? 'Editar Dirección' : 'Registrar Dirección'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Alias / Icon selector */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Alias:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Casa', 'Trabajo', 'Otro'].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAlias(a)}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        alias === a 
                          ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-xs' 
                          : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {a === 'Casa' ? <Home size={12} /> : a === 'Trabajo' ? <Briefcase size={12} /> : <MapPin size={12} />}
                      <span>{a}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calle y número */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Calle:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Av. Rivadavia"
                    value={calle}
                    onChange={e => setCalle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Número:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1420"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
              </div>

              {/* Piso y Depto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Piso (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej: 3"
                    value={piso}
                    onChange={e => setPiso(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Depto (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej: B"
                    value={depto}
                    onChange={e => setDepto(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
                  />
                </div>
              </div>

              {/* Indicaciones */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Indicaciones de Envío (Opcional):</label>
                <textarea
                  placeholder="Ej: Timbre roto, golpear la puerta de reja negra..."
                  rows={2}
                  value={indicaciones}
                  onChange={e => setIndicaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 leading-normal font-medium resize-none"
                />
              </div>

              {/* Marcar principal */}
              <div 
                onClick={() => setEsPrincipal(!esPrincipal)}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-dashed border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={esPrincipal}
                  readOnly
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-600">Establecer como dirección principal</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
