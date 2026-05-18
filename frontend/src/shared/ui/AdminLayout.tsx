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
  Store,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeedback } from './FeedbackProvider';
import { Logo } from './Logo';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  group: 'op' | 'cat' | 'sys';
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

  const navItems: NavItem[] = [
    { name: 'Dashboard',     path: '/admin',                icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'PEDIDOS'],         group: 'op'  },
    { name: 'Pedidos',       path: '/admin/pedidos',        icon: <Receipt size={18} />,         roles: ['ADMIN', 'PEDIDOS'],         group: 'op'  },
    { name: 'Categorías',    path: '/admin/categorias',     icon: <Layers size={18} />,          roles: ['ADMIN', 'STOCK'],           group: 'cat' },
    { name: 'Productos',     path: '/admin/productos',      icon: <ShoppingBag size={18} />,     roles: ['ADMIN', 'STOCK'],           group: 'cat' },
    { name: 'Ingredientes',  path: '/admin/ingredientes',   icon: <Cookie size={18} />,          roles: ['ADMIN', 'STOCK'],           group: 'cat' },
    { name: 'Usuarios',      path: '/admin/usuarios',       icon: <Users size={18} />,           roles: ['ADMIN', 'STOCK', 'PEDIDOS'], group: 'sys' },
    { name: 'Configuración', path: '/admin/configuracion',  icon: <Settings size={18} />,        roles: ['ADMIN'],                    group: 'sys' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!user || !user.roles) return false;
    return user.roles.some((role: string) => item.roles.includes(role));
  });

  const groups: { id: NavItem['group']; label: string }[] = [
    { id: 'op',  label: 'Operación' },
    { id: 'cat', label: 'Catálogo'  },
    { id: 'sys', label: 'Sistema'   },
  ];

  const navLinkBase =
    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 group';
  const navLinkActive =
    'bg-brand-red-500 text-white shadow-brand';
  const navLinkIdle =
    'text-ink-600 hover:bg-white/60 hover:text-ink-900';

  const renderNav = (onNavigate?: () => void) => (
    <nav className="space-y-5">
      {groups.map(group => {
        const items = filteredNavItems.filter(i => i.group === group.id);
        if (items.length === 0) return null;
        return (
          <div key={group.id} className="space-y-1.5">
            <span className="block px-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
              {group.label}
            </span>
            {items.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={onNavigate}
                  className={`${navLinkBase} ${isActive ? navLinkActive : navLinkIdle}`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-white' : 'text-ink-400 group-hover:text-brand-red-500'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="text-white/70" />}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* ──────────────── SIDEBAR DESKTOP ──────────────── */}
      <aside className="hidden md:flex flex-col w-[260px] glass-sidebar p-5 shrink-0">
        <Link to="/admin" className="flex items-center gap-3 px-2 py-2">
          <Logo size="md" variant="red" />
          <div className="leading-tight">
            <span className="font-display font-black text-ink-900 text-lg block">Food Store</span>
            <span className="block text-[10px] text-brand-red-500 tracking-[0.22em] uppercase font-black">
              Admin Panel
            </span>
          </div>
        </Link>

        <div className="mt-7 flex-1 overflow-y-auto pr-1 -mr-1">{renderNav()}</div>

        <div className="border-t border-white/40 pt-4 mt-4 space-y-1.5">
          <Link
            to="/"
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-ink-600 hover:bg-white/60 hover:text-brand-red-600 font-semibold text-sm transition-colors duration-150"
          >
            <Store size={18} />
            <span>Volver a la Tienda</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-ink-600 hover:bg-danger-50/70 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>

          <div className="mt-3 px-3.5 py-3 rounded-xl glass-panel">
            <span className="block text-[10px] font-black uppercase tracking-wider text-brand-yellow-700">
              Sesión activa
            </span>
            <span className="block text-xs font-bold text-ink-900 truncate mt-0.5">
              {user?.nombre} {user?.apellido}
            </span>
          </div>
        </div>
      </aside>

      {/* ──────────────── CONTENIDO ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass-header px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl glass-panel hover:bg-white/80 text-ink-700 transition-all duration-150 cursor-pointer shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:block min-w-0">
              <h1 className="font-display text-xl lg:text-2xl font-extrabold text-ink-900 tracking-tight truncate">
                {title}
              </h1>
              <p className="text-xs text-ink-500 font-medium mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-ink-900 text-sm leading-tight truncate max-w-[160px]">
                {user?.nombre} {user?.apellido}
              </span>
              <span className="inline-flex items-center mt-1 text-[10px] bg-brand-yellow-100/80 text-brand-yellow-800 border border-brand-yellow-200/60 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest backdrop-blur-sm">
                {user?.roles && user.roles[0]}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-yellow-400 border border-brand-yellow-500 flex items-center justify-center text-ink-900 font-black shadow-sm">
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase() : 'US'}
            </div>
          </div>
        </header>

        {/* Drawer mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn">
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"
            />

            <aside className="relative flex flex-col w-72 glass-modal p-5 z-50 animate-slideInRight">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo size="sm" variant="red" />
                  <div className="leading-tight">
                    <span className="font-display font-black text-ink-900 block">Food Store</span>
                    <span className="block text-[10px] text-brand-red-500 tracking-[0.22em] uppercase font-black">
                      Admin
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/60 text-ink-500 transition-colors cursor-pointer"
                  aria-label="Cerrar menú"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-7 flex-1 overflow-y-auto pr-1 -mr-1">
                {renderNav(() => setIsMobileMenuOpen(false))}
              </div>

              <div className="border-t border-white/40 pt-4 mt-4 space-y-1.5">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-ink-600 hover:bg-white/60 hover:text-brand-red-600 font-semibold text-sm transition-colors duration-150"
                >
                  <Store size={18} />
                  <span>Volver a la Tienda</span>
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-ink-600 hover:bg-danger-50/70 hover:text-danger-700 font-semibold text-sm transition-colors duration-150 cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <div className="sm:hidden mb-2">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 tracking-tight">{title}</h1>
            <p className="text-xs text-ink-500 font-medium mt-1">{subtitle}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
