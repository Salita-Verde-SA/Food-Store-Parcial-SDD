import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Shield, 
  UserCheck, 
  UserX, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar
} from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import type { UsuarioAdmin } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { useAuthStore } from '../../shared/stores/authStore';
import { extractErrorMessage } from '../../shared/api/axios';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

const ROLES_LIST = [
  { codigo: 'ADMIN', nombre: 'Administrador' },
  { codigo: 'STOCK', nombre: 'Gestor de Stock' },
  { codigo: 'PEDIDOS', nombre: 'Gestor de Pedidos' },
  { codigo: 'CLIENTE', nombre: 'Cliente' },
];

export const UsuariosPage = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { showAlert, showConfirm } = useFeedback();
  
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState<string>('TODOS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Query - Obtener usuarios paginados y filtrados
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-usuarios', page, searchTerm, selectedRol, selectedEstado],
    queryFn: () => adminApi.getUsuarios({
      page,
      limit,
      search: searchTerm.trim() || undefined,
      rol: selectedRol !== 'TODOS' ? selectedRol : undefined,
      active: selectedEstado === 'ACTIVOS' ? true : selectedEstado === 'INACTIVOS' ? false : undefined,
    }),
  });

  // Mutación - Actualizar rol o estado del usuario
  const updateMutation = useMutation({
    mutationFn: ({ id, rol_codigo, activo }: { id: number; rol_codigo?: string; activo?: boolean }) => 
      adminApi.updateUsuario(id, { rol_codigo, activo }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      // Si el admin se inhabilitó a sí mismo por error (caso extremo), desloguear
      if (updatedUser.id === currentUser?.id && updatedUser.activo === false) {
        useAuthStore.getState().logout();
      }
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: extractErrorMessage(err), variant: 'danger' });
    }
  });

  const handleToggleEstado = async (usuario: UsuarioAdmin) => {
    const nuevoEstado = !usuario.activo;
    const mensaje = nuevoEstado 
      ? `¿Estás seguro de reactivar la cuenta de ${usuario.nombre} ${usuario.apellido}?`
      : `¿Estás seguro de desactivar la cuenta de ${usuario.nombre} ${usuario.apellido}? Se invalidarán de forma atómica todas sus sesiones y refresh tokens activos de inmediato.`;

    const ok = await showConfirm({
      title: nuevoEstado ? 'Reactivar cuenta' : 'Desactivar cuenta',
      message: mensaje,
      variant: nuevoEstado ? 'info' : 'warning',
      confirmText: 'Confirmar'
    });
    if (ok) {
      updateMutation.mutate({ id: usuario.id, activo: nuevoEstado });
    }
  };

  const handleRoleChange = async (usuario: UsuarioAdmin, nuevoRol: string) => {
    if (usuario.roles.includes(nuevoRol)) return;
    const ok = await showConfirm({
      title: 'Reasignar rol',
      message: `¿Estás seguro de reasignar el rol de ${usuario.nombre} a '${nuevoRol}'?`,
      variant: 'warning',
      confirmText: 'Reasignar'
    });
    if (ok) {
      updateMutation.mutate({ id: usuario.id, rol_codigo: nuevoRol });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";

  return (
    <AdminLayout 
      title="Control de Cuentas" 
      subtitle="Gestión del padrón de usuarios, auditoría de roles (RBAC) e inhabilitación inmediata de sesiones"
    >
      {/* BARRA DE FILTROS */}
      <div className={`${cardBase} p-5 flex flex-col md:flex-row gap-4 items-center justify-between mb-6`}>
        {/* Buscador */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-paper-50 border border-paper-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-red-500/20 focus:border-brand-red-500 text-sm text-ink-900 placeholder-ink-400"
          />
        </div>

        {/* selectores de filtrado */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Rol */}
          <div className="flex items-center gap-2 bg-paper-50 border border-paper-200 px-3 py-2 rounded-md">
            <Shield size={14} className="text-ink-400" />
            <select
              value={selectedRol}
              onChange={e => { setSelectedRol(e.target.value); setPage(1); }}
              className="text-sm font-semibold text-ink-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Roles</option>
              {ROLES_LIST.map(r => (
                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector de Estado */}
          <div className="flex items-center gap-2 bg-paper-50 border border-paper-200 px-3 py-2 rounded-md">
            <Filter size={14} className="text-ink-400" />
            <select
              value={selectedEstado}
              onChange={e => { setSelectedEstado(e.target.value); setPage(1); }}
              className="text-sm font-semibold text-ink-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVOS">Cuentas Activas</option>
              <option value="INACTIVOS">Cuentas Inactivas</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-md border border-paper-200 text-ink-500 hover:bg-paper-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Recargar usuarios"
          >
            <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* DETALLE O ERROR */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <div className="w-10 h-10 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-ink-500">Buscando usuarios registrados...</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-100 rounded-md p-6 text-center space-y-3">
          <AlertTriangle className="text-danger-600 mx-auto" size={32} />
          <h3 className="text-sm font-bold text-danger-800">Error al consultar usuarios</h3>
          <p className="text-xs text-danger-700">No se pudo traer el padrón de usuarios. Verificá tu token de administrador.</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className={`${cardBase} p-12 text-center text-ink-400 text-sm font-bold`}>
          No se encontraron usuarios registrados con los criterios solicitados.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TABLA DE USUARIOS (RESPONSIVA CON SCROLL) */}
          <div className={`${cardBase} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-red-50 border-b border-paper-200">
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider">Usuario</th>
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider">Email</th>
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider">F. Registro</th>
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider text-center">Rol Asignado</th>
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider text-center">Estado</th>
                    <th className="p-4 text-[11px] text-brand-red-700 font-black uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {data.items.map((usuario: UsuarioAdmin) => {
                    const isSelf = usuario.id === currentUser?.id;
                    const isCurrentUserAdmin = currentUser?.roles?.includes('ADMIN') || false;
                    const isTargetAdmin = usuario.roles.includes('ADMIN');
                    return (
                      <tr key={usuario.id} className="hover:bg-paper-50 transition-colors">
                        {/* Nombre */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              usuario.activo 
                                ? 'bg-brand-yellow-100 text-brand-yellow-800' 
                                : 'bg-paper-200 text-ink-400'
                            }`}>
                              {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                            </div>
                            <div>
                              <span className="block font-bold text-ink-900 text-sm">
                                {usuario.nombre} {usuario.apellido} {isSelf && <span className="text-[10px] bg-paper-200 text-ink-600 px-1.5 py-0.5 rounded-full font-bold ml-1">Yo</span>}
                              </span>
                              <span className="block text-[10px] text-ink-400 font-medium">ID: #{usuario.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
                            <Mail size={14} className="text-ink-400" />
                            <span>{usuario.email}</span>
                          </div>
                        </td>

                        {/* Fecha registro */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
                            <Calendar size={14} className="text-ink-400" />
                            <span>{formatDate(usuario.created_at)}</span>
                          </div>
                        </td>

                        {/* Rol (Seleccionable en caliente) */}
                        <td className="p-4 text-center">
                          <select
                            value={usuario.roles[0] || 'CLIENTE'}
                            disabled={isSelf || updateMutation.isPending || (isTargetAdmin && !isCurrentUserAdmin)}
                            onChange={(e) => handleRoleChange(usuario, e.target.value)}
                            className={`px-3 py-1.5 bg-paper-50 border border-paper-200 rounded-md text-xs font-bold text-ink-700 focus:outline-none focus:border-brand-red-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {ROLES_LIST.map(r => (
                              <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
                            ))}
                          </select>
                        </td>

                        {/* Estado */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border uppercase ${
                            usuario.activo 
                              ? 'bg-success-50 text-success-700 border-success-200' 
                              : 'bg-danger-50 text-danger-700 border-danger-200'
                          }`}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleEstado(usuario)}
                            disabled={isSelf || updateMutation.isPending || (isTargetAdmin && !isCurrentUserAdmin)}
                            className="p-1.5 rounded-md text-ink-500 hover:text-brand-red-500 hover:bg-brand-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={usuario.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                          >
                            {usuario.activo ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {data.total > limit && (
            <div className="flex items-center justify-between bg-paper-0 px-5 py-4 rounded-md border border-paper-200 shadow-sm">
              <span className="text-xs font-bold text-ink-500">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} de {data.total} usuarios
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-paper-200 rounded-md text-ink-500 hover:bg-paper-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-ink-700 px-3">{page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= data.total}
                  className="p-2 border border-paper-200 rounded-md text-ink-500 hover:bg-paper-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};
