import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  Home,
  Briefcase,
  X,
  AlertCircle,
} from 'lucide-react';

import { direccionesApi } from '../shared/api/direcciones';
import { extractErrorMessage } from '../shared/api/axios';
import type { DireccionEntrega, DireccionEntregaCreate } from '../shared/types';
import { useFeedback } from '../shared/ui/FeedbackProvider';
import { ClientHeader } from '../shared/ui/ClientHeader';
import { ClientFooter } from '../shared/ui/ClientFooter';

export const AddressesPage = () => {
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useFeedback();

  const [isModalOpen, setIsModalOpen] = useState(false);
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
    onError: (err: any) => setFormError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DireccionEntregaCreate> }) =>
      direccionesApi.actualizarDireccion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direcciones'] });
      closeModal();
    },
    onError: (err: any) => setFormError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: direccionesApi.eliminarDireccion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direcciones'] }),
    onError: (err: any) =>
      showAlert({
        title: 'No se pudo eliminar',
        message: err.detail || 'Error al eliminar la dirección',
        variant: 'danger',
      }),
  });

  const setPrincipalMutation = useMutation({
    mutationFn: direccionesApi.establecerPrincipal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direcciones'] }),
    onError: (err: any) =>
      showAlert({
        title: 'Error',
        message: err.detail || 'Error al establecer dirección principal',
        variant: 'danger',
      }),
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

  const handleDelete = async (id: number) => {
    const ok = await showConfirm({
      title: 'Eliminar dirección',
      message: '¿Estás seguro de eliminar esta dirección?',
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const eyebrow = 'text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';
  const labelBase = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  const getAliasIcon = (a: string) => {
    const lower = a.toLowerCase();
    if (lower === 'casa') return <Home size={16} />;
    if (lower === 'trabajo' || lower === 'oficina') return <Briefcase size={16} />;
    return <MapPin size={16} />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ClientHeader eyebrow="Mis direcciones" showBackToMenu activeMenu="direcciones" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/"
              className="sm:hidden inline-flex items-center gap-1 text-[11px] text-ink-500 font-bold uppercase tracking-wider mb-1"
            >
              <ChevronLeft size={12} />
              <span>Menú</span>
            </Link>
            <h1 className="font-display text-4xl md:text-5xl font-black text-ink-900 tracking-tight">
              Mis Direcciones
            </h1>
            <p className="text-sm text-ink-500 mt-1.5 font-medium">
              Administrá los lugares donde recibís tu comida.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Agregar dirección</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-ink-500 font-bold text-sm">Cargando ubicaciones…</span>
          </div>
        ) : isError ? (
          <div className="bg-danger-50/80 border border-danger-200/60 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <AlertCircle className="text-danger-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-danger-700">Error al cargar</h3>
              <p className="text-sm text-danger-600 mt-1">No pudimos conectar con el servidor.</p>
            </div>
          </div>
        ) : direcciones.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl p-8 max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white/50 flex items-center justify-center text-brand-yellow-700 mx-auto">
              <MapPin size={36} className="stroke-1" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-extrabold text-ink-900">
                Sin direcciones guardadas
              </h3>
              <p className="text-sm text-ink-500 leading-relaxed">
                Registrá tu casa, oficina o cualquier dirección para hacer pedidos más rápido.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Crear mi primera dirección
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {direcciones.map(dir => (
              <div
                key={dir.id}
                className={`glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-200 ${
                  dir.es_principal
                    ? 'border-2 border-brand-yellow-400/80'
                    : 'hover:shadow-[var(--shadow-glass-hover)] hover:-translate-y-0.5'
                }`}
              >
                {dir.es_principal && (
                  <div className="absolute top-0 right-0 bg-brand-yellow-400 text-ink-900 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                    Predeterminada
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 bg-white/50 rounded-xl text-brand-red-700 shrink-0 flex items-center justify-center border border-white/50">
                      {getAliasIcon(dir.alias)}
                    </span>
                    <h4 className="font-display text-xl font-extrabold text-ink-900 uppercase tracking-wide">
                      {dir.alias}
                    </h4>
                  </div>

                  <div className="text-sm text-ink-700">
                    <p className="font-bold text-ink-900 text-base">
                      {dir.calle} {dir.numero}
                    </p>
                    {dir.piso_depto && (
                      <p className="text-xs text-ink-500 mt-1 font-medium">{dir.piso_depto}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/40 pt-4 mt-4">
                  {dir.es_principal ? (
                    <span className="flex items-center gap-1 text-[11px] text-success-700 font-bold uppercase tracking-wider">
                      <Check size={12} className="stroke-[3]" />
                      <span>Activa para envíos</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPrincipalMutation.mutate(dir.id)}
                      className="text-[11px] text-ink-500 hover:text-brand-red-600 font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Establecer predeterminada
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(dir)}
                      className="px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-white/60 rounded-xl transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(dir.id)}
                      className="w-9 h-9 flex items-center justify-center glass-panel border border-danger-200/60 hover:bg-danger-50/70 text-danger-600 rounded-xl transition-all cursor-pointer"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ClientFooter />

      {/* Modal · Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm animate-fadeIn"
          />

          <form
            onSubmit={handleSubmit}
            className="relative glass-modal rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-glassIn"
          >
            <div className="h-1.5 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

            <div className="px-6 py-5 border-b border-white/40 flex items-center justify-between shrink-0">
              <div>
                <span className={eyebrow}>
                  {editingAddress ? 'Modificación' : 'Nueva ubicación'}
                </span>
                <h3 className="font-display text-xl font-extrabold text-ink-900 leading-tight mt-1">
                  {editingAddress ? 'Editar dirección' : 'Registrar dirección'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/80 text-ink-700 transition-all duration-150 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-danger-50/80 border border-danger-200/60 text-danger-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium animate-shake backdrop-blur-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className={labelBase}>Alias</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Casa', 'Trabajo', 'Otro'] as const).map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAlias(a)}
                      className={`py-2.5 px-3 rounded-2xl text-sm font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                        alias === a
                          ? 'bg-brand-red-500/10 border-brand-red-400/60 text-brand-red-700'
                          : 'bg-white/40 border-white/50 hover:border-brand-yellow-300 text-ink-700 hover:bg-white/60'
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
                    className="glass-input"
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
                    className="glass-input"
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
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className={labelBase}>Depto (opc.)</label>
                  <input
                    type="text"
                    placeholder="B"
                    value={depto}
                    onChange={e => setDepto(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Indicaciones (opc.)</label>
                <textarea
                  placeholder="Ej: Timbre roto, golpear puerta…"
                  rows={2}
                  value={indicaciones}
                  onChange={e => setIndicaciones(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div
                onClick={() => setEsPrincipal(!esPrincipal)}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 border-dashed cursor-pointer select-none transition-all ${
                  esPrincipal
                    ? 'bg-brand-yellow-50/70 border-brand-yellow-300/70 backdrop-blur-sm'
                    : 'border-white/40 hover:bg-white/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={esPrincipal}
                  readOnly
                  className="w-4 h-4 rounded border-2 border-ink-300 accent-brand-red-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-ink-700">
                  Establecer como dirección predeterminada
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/40 bg-white/30 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="glass-panel hover:bg-white/80 text-ink-900 font-semibold px-4 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-sm"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
