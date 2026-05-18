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
  AlertCircle
} from 'lucide-react';

import { direccionesApi } from '../shared/api/direcciones';
import { useAuthStore } from '../shared/stores/authStore';
import { extractErrorMessage } from '../shared/api/axios';
import type { DireccionEntrega, DireccionEntregaCreate } from '../shared/types';
import { useFeedback } from '../shared/ui/FeedbackProvider';
import { Logo } from '../shared/ui/Logo';

export const AddressesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { showAlert, showConfirm } = useFeedback();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DireccionEntrega | null>(null);

  const [alias, setAlias] = useState('Casa');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [piso, setPiso] = useState('');
  const [depto, setDepto] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: direcciones = [], isLoading, isError } = useQuery<DireccionEntrega[]>({
    queryKey: ['direcciones'],
    queryFn: direccionesApi.getDirecciones,
  });

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

  const deleteMutation = useMutation({
    mutationFn: direccionesApi.eliminarDireccion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
    onError: (err: any) => {
      showAlert({ title: 'No se pudo eliminar', message: err.detail || 'Error al eliminar la dirección', variant: 'danger' });
    }
  });

  const setPrincipalMutation = useMutation({
    mutationFn: direccionesApi.establecerPrincipal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: err.detail || 'Error al establecer dirección principal', variant: 'danger' });
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

  const handleLogout = async () => {
    const ok = await showConfirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar sesión en Food Store?',
      variant: 'warning',
      confirmText: 'Cerrar sesión',
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showConfirm({
      title: 'Eliminar dirección',
      message: '¿Estás seguro de eliminar esta dirección?',
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.15em] text-brand-red-500';
  const cardBase = 'bg-paper-0 border border-paper-200 rounded-lg shadow-sm';
  const inputBase = 'w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150';
  const labelBase = 'block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5';

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
            <span className={`block ${eyebrow}`}>Mis direcciones</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-red-500 font-semibold transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Volver al menú</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-md bg-brand-yellow-100 border border-brand-yellow-300 flex items-center justify-center text-ink-900 font-bold cursor-pointer hover:bg-brand-yellow-200 active:scale-95 transition-all duration-150"
            >
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </button>

            {isUserMenuOpen && (
              <>
                <div onClick={() => setIsUserMenuOpen(false)} className="fixed inset-0 z-45"></div>
                <div className="absolute right-0 mt-2 w-56 bg-paper-0 rounded-lg shadow-md border border-paper-200 p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-paper-200 mb-1">
                    <span className="block font-bold text-ink-900 text-sm">{user?.nombre} {user?.apellido}</span>
                    <span className="block text-[11px] text-ink-400 font-medium truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/direcciones"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md bg-brand-red-50 text-brand-red-700 font-semibold text-sm"
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
                    onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-danger-600 hover:bg-danger-50 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer border-t border-paper-200 mt-1"
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

      {/* CUERPO */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/" className="sm:hidden flex items-center gap-1 text-[11px] text-ink-500 font-bold uppercase tracking-wider mb-1">
              <ChevronLeft size={12} />
              <span>Menú</span>
            </Link>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 tracking-tight">Mis Direcciones</h2>
            <p className="text-sm text-ink-500 mt-1">Administrá los lugares donde recibís tu comida</p>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar dirección</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-ink-500 font-medium text-sm">Cargando ubicaciones...</span>
          </div>
        ) : isError ? (
          <div className="bg-danger-50 border border-danger-100 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="text-danger-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-danger-700">Error al cargar</h3>
              <p className="text-sm text-danger-600 mt-1">No pudimos conectar con el servidor.</p>
            </div>
          </div>
        ) : direcciones.length === 0 ? (
          <div className={`text-center py-16 ${cardBase} p-8 max-w-md mx-auto space-y-4`}>
            <div className="w-16 h-16 bg-brand-yellow-100 rounded-lg flex items-center justify-center text-brand-yellow-700 mx-auto">
              <MapPin size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink-900">Sin direcciones guardadas</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Registrá tu casa, oficina o cualquier dirección para hacer pedidos más rápido.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Crear mi primera dirección
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {direcciones.map(dir => (
              <div
                key={dir.id}
                className={`p-5 rounded-lg shadow-sm relative overflow-hidden ${
                  dir.es_principal
                    ? 'bg-paper-0 border-2 border-brand-yellow-400'
                    : 'bg-paper-0 border border-paper-200 hover:border-paper-300 transition-colors duration-150'
                }`}
              >
                {dir.es_principal && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-brand-yellow-100 text-brand-yellow-800 border border-brand-yellow-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Predeterminada
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-brand-red-50 rounded-md text-brand-red-700 shrink-0">
                      {dir.alias.toLowerCase() === 'casa' ? <Home size={16} /> :
                       dir.alias.toLowerCase() === 'trabajo' || dir.alias.toLowerCase() === 'oficina' ? <Briefcase size={16} /> :
                       <MapPin size={16} />}
                    </span>
                    <h4 className="font-black text-ink-900 text-base uppercase tracking-wider">{dir.alias}</h4>
                  </div>

                  <div className="text-sm text-ink-700">
                    <p className="font-bold text-ink-900">{dir.calle} {dir.numero}</p>
                    {dir.piso_depto && (
                      <p className="text-xs text-ink-500 mt-0.5">{dir.piso_depto}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-paper-200 pt-4 mt-4">
                  {dir.es_principal ? (
                    <span className="flex items-center gap-1 text-[11px] text-success-600 font-bold">
                      <Check size={12} className="stroke-[3]" />
                      <span>Activa para envíos</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPrincipalMutation.mutate(dir.id)}
                      className="text-[11px] text-ink-500 hover:text-brand-red-600 font-bold cursor-pointer transition-colors"
                    >
                      Establecer predeterminada
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(dir)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-paper-100 rounded-md transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(dir.id)}
                      className="w-8 h-8 flex items-center justify-center bg-paper-0 border border-danger-100 hover:bg-danger-50 text-danger-600 rounded-md transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm animate-fadeIn"
          ></div>

          <form
            onSubmit={handleSubmit}
            className="relative bg-paper-0 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-scaleUp border border-paper-200"
          >
            <div className="px-6 py-5 border-b border-paper-200 flex items-center justify-between">
              <div>
                <span className={eyebrow}>
                  {editingAddress ? 'Modificación' : 'Nueva ubicación'}
                </span>
                <h3 className="text-lg font-bold text-ink-900 leading-tight mt-1">
                  {editingAddress ? 'Editar dirección' : 'Registrar dirección'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3 rounded-md text-sm flex items-center gap-2 font-medium animate-shake">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className={labelBase}>Alias</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Casa', 'Trabajo', 'Otro'].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAlias(a)}
                      className={`py-2 px-3 rounded-md text-sm font-bold transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                        alias === a
                          ? 'bg-brand-red-50 border-2 border-brand-red-500 text-brand-red-700'
                          : 'bg-paper-0 border-2 border-paper-200 hover:border-paper-300 text-ink-700'
                      }`}
                    >
                      {a === 'Casa' ? <Home size={14} /> : a === 'Trabajo' ? <Briefcase size={14} /> : <MapPin size={14} />}
                      <span>{a}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelBase}>Calle</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Av. Rivadavia"
                    value={calle}
                    onChange={e => setCalle(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Número</label>
                  <input
                    type="text"
                    required
                    placeholder="1420"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Piso (opc.)</label>
                  <input
                    type="text"
                    placeholder="3"
                    value={piso}
                    onChange={e => setPiso(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Depto (opc.)</label>
                  <input
                    type="text"
                    placeholder="B"
                    value={depto}
                    onChange={e => setDepto(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Indicaciones (opc.)</label>
                <textarea
                  placeholder="Ej: Timbre roto, golpear puerta..."
                  rows={2}
                  value={indicaciones}
                  onChange={e => setIndicaciones(e.target.value)}
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div
                onClick={() => setEsPrincipal(!esPrincipal)}
                className="flex items-center gap-2.5 p-3 rounded-md border border-dashed border-paper-300 cursor-pointer select-none hover:bg-paper-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={esPrincipal}
                  readOnly
                  className="w-4 h-4 rounded border-2 border-ink-300 checked:bg-brand-red-500 checked:border-brand-red-500 accent-brand-red-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-ink-700">Establecer como dirección predeterminada</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 rounded-b-xl flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="bg-paper-0 border-2 border-paper-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
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
