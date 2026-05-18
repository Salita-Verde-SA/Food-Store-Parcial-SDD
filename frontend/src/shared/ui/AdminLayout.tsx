import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  Receipt,
  LogOut,
  Menu,
  X,
  Cookie,
  Users,
  Settings,
  Store
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeedback } from './FeedbackProvider';
import { Logo } from './Logo';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { showConfirm } = useFeedback();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const ok = await showConfirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar tu sesión de Food Store?',
      variant: 'warning',
      confirmText: 'Cerrar sesión',
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard',    path: '/admin',                icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'PEDIDOS'] },
    { name: 'Categorías',   path: '/admin/categorias',     icon: <Layers size={20} />,         roles: ['ADMIN', 'STOCK'] },
    { name: 'Productos',    path: '/admin/productos',      icon: <ShoppingBag size={20} />,    roles: ['ADMIN', 'STOCK'] },
    { name: 'Ingredientes', path: '/admin/ingredientes',   icon: <Cookie size={20} />,         roles: ['ADMIN', 'STOCK'] },
    { name: 'Pedidos',      path: '/admin/pedidos',        icon: <Receipt size={20} />,        roles: ['ADMIN', 'PEDIDOS'] },
    { name: 'Usuarios',     path: '/admin/usuarios',       icon: <Users size={20} />,          roles: ['ADMIN', 'STOCK', 'PEDIDOS'] },
    { name: 'Configuración',path: '/admin/configuracion',  icon: <Settings size={20} />,       roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!user || !user.roles) return false;
    return user.roles.some((role: string) => item.roles.includes(role));
  });

  const navLinkBase = 'flex items-center gap-3 px-4 py-3 rounded-md font-semibold text-sm transition-colors duration-150';
  const navLinkActive = 'bg-brand-red-500 text-white shadow-sm';
  const navLinkIdle = 'text-ink-600 hover:bg-paper-100 hover:text-ink-900';

  return (
    <div className="min-h-screen bg-paper-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-paper-0 border-r border-paper-200 p-5 shrink-0">
        <div className="flex items-center gap-3 px-2 py-4">
          <Logo size="md" variant="red" />
          <div>
            <span className="font-black text-ink-900 text-lg leading-tight block">Food Store</span>
            <span className="block text-[10px] text-brand-red-500 tracking-widest uppercase font-black">Admin Panel</span>
          </div>
        </div>

        <nav className="mt-8 space-y-1.5 flex-1">
          {filteredNavItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                className={`${navLinkBase} ${isActive ? navLinkActive : navLinkIdle}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-paper-200 pt-4 mt-auto space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-ink-600 hover:bg-brand-red-50 hover:text-brand-red-600 font-semibold text-sm transition-colors duration-150"
          >
            <Store size={20} />
            <span>Volver a la Tienda</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-ink-600 hover:bg-danger-50 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área del Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-paper-0 border-b border-paper-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-md bg-paper-0 border border-paper-200 hover:bg-paper-100 text-ink-700 transition-colors duration-150 cursor-pointer"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-xl font-extrabold text-ink-900 tracking-tight">{title}</h1>
            <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-ink-900 text-sm">{user?.nombre} {user?.apellido}</span>
              <span className="inline-flex items-center mt-0.5 text-[10px] bg-brand-yellow-100 text-brand-yellow-800 border border-brand-yellow-200 px-2.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                {user?.roles && user.roles[0]}
              </span>
            </div>
            <div className="w-10 h-10 rounded-md bg-brand-yellow-100 border border-brand-yellow-300 flex items-center justify-center text-ink-900 font-bold">
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </div>
          </div>
        </header>

        {/* Drawer de Menú Mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-45 flex md:hidden animate-fadeIn">
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"
            ></div>

            <aside className="relative flex flex-col w-64 bg-paper-0 p-5 shadow-lg z-50 animate-slideInRight">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo size="sm" variant="red" />
                  <span className="font-black text-ink-900">Food Store</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-md hover:bg-paper-100 text-ink-500 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-8 space-y-1.5 flex-1">
                {filteredNavItems.map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={idx}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`${navLinkBase} ${isActive ? navLinkActive : navLinkIdle}`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-paper-200 pt-4 mt-auto space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-ink-600 hover:bg-brand-red-50 hover:text-brand-red-600 font-semibold text-sm transition-colors duration-150"
                >
                  <Store size={20} />
                  <span>Volver a la Tienda</span>
                </Link>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-ink-600 hover:bg-danger-50 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <div className="sm:hidden mb-2">
            <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{title}</h1>
            <p className="text-xs text-ink-500">{subtitle}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
