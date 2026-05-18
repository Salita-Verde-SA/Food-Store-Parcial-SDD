import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
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

const ROLES_LIST = [
  { codigo: 'ADMIN', nombre: 'Administrador' },
  { codigo: 'STOCK', nombre: 'Gestor de Stock' },
  { codigo: 'PEDIDOS', nombre: 'Gestor de Pedidos' },
  { codigo: 'CLIENTE', nombre: 'Cliente' },
];

export const UsuariosPage = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState<string>('TODOS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [page, setPage] = useState(1);
  const limit = 8; // 8 usuarios por página queda espectacular

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
      alert(extractErrorMessage(err));
    }
  });

  const handleToggleEstado = (usuario: UsuarioAdmin) => {
    const nuevoEstado = !usuario.activo;
    const mensaje = nuevoEstado 
      ? `¿Estás seguro de reactivar la cuenta de ${usuario.nombre} ${usuario.apellido}?`
      : `¿Estás seguro de desactivar la cuenta de ${usuario.nombre} ${usuario.apellido}? Se invalidarán de forma atómica todas sus sesiones y refresh tokens activos de inmediato.`;

    if (window.confirm(mensaje)) {
      updateMutation.mutate({ id: usuario.id, activo: nuevoEstado });
    }
  };

  const handleRoleChange = (usuario: UsuarioAdmin, nuevoRol: string) => {
    if (usuario.roles.includes(nuevoRol)) return;
    if (window.confirm(`¿Estás seguro de reasignar el rol de ${usuario.nombre} a '${nuevoRol}'?`)) {
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

  return (
    <AdminLayout 
      title="Control de Cuentas" 
      subtitle="Gestión del padrón de usuarios, auditoría de roles (RBAC) e inhabilitación inmediata de sesiones"
    >
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Buscador */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-gray-800 placeholder-gray-400 font-medium"
          />
        </div>

        {/* selectores de filtrado */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Rol */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-2xl">
            <Shield size={14} className="text-gray-400" />
            <select
              value={selectedRol}
              onChange={e => { setSelectedRol(e.target.value); setPage(1); }}
              className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Roles</option>
              {ROLES_LIST.map(r => (
                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector de Estado */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-2xl">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedEstado}
              onChange={e => { setSelectedEstado(e.target.value); setPage(1); }}
              className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVOS">Cuentas Activas</option>
              <option value="INACTIVOS">Cuentas Inactivas</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-2xl border border-gray-100 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Recargar usuarios"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* DETALLE O ERROR */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-500">Buscando usuarios registrados...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
          <AlertTriangle className="text-red-500 mx-auto" size={32} />
          <h3 className="text-sm font-extrabold text-red-800">Error al consultar usuarios</h3>
          <p className="text-xs text-red-600">No se pudo traer el padrón de usuarios. Verificá tu token de administrador.</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-12 text-center text-gray-400 text-xs font-bold">
          No se encontraron usuarios registrados con los criterios solicitados.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TABLA DE USUARIOS (RESPONSIVA CON SCROLL) */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Usuario</th>
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Email</th>
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">F. Registro</th>
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider text-center">Rol Asignado</th>
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider text-center">Estado</th>
                    <th className="p-4 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((usuario: UsuarioAdmin) => {
                    const isSelf = usuario.id === currentUser?.id;
                    return (
                      <tr key={usuario.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Nombre */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              usuario.activo 
                                ? 'bg-orange-50 text-orange-600' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                            </div>
                            <div>
                              <span className="block font-bold text-gray-800 text-xs">
                                {usuario.nombre} {usuario.apellido} {isSelf && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold ml-1">Yo</span>}
                              </span>
                              <span className="block text-[9px] text-gray-400">ID: #{usuario.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <Mail size={12} className="text-gray-400" />
                            <span>{usuario.email}</span>
                          </div>
                        </td>

                        {/* Fecha registro */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{formatDate(usuario.created_at)}</span>
                          </div>
                        </td>

                        {/* Rol (Seleccionable en caliente) */}
                        <td className="p-4 text-center">
                          <select
                            value={usuario.roles[0] || 'CLIENTE'}
                            disabled={isSelf || updateMutation.isPending}
                            onChange={(e) => handleRoleChange(usuario, e.target.value)}
                            className={`px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {ROLES_LIST.map(r => (
                              <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
                            ))}
                          </select>
                        </td>

                        {/* Estado */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider border uppercase ${
                            usuario.activo 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleEstado(usuario)}
                            disabled={isSelf || updateMutation.isPending}
                            className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              usuario.activo 
                                ? 'border-red-100 text-red-500 hover:bg-red-50' 
                                : 'border-green-100 text-green-500 hover:bg-green-50'
                            }`}
                            title={usuario.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                          >
                            {usuario.activo ? <UserX size={16} /> : <UserCheck size={16} />}
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
            <div className="flex items-center justify-between bg-white px-5 py-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} de {data.total} usuarios
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-100 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-gray-700 px-3">{page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= data.total}
                  className="p-2 border border-gray-100 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
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
