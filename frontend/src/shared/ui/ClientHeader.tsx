import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  MapPin,
  Navigation,
  Briefcase,
  ChevronLeft,
  LogOut,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeedback } from './FeedbackProvider';
import { Logo } from './Logo';

interface ClientHeaderProps {
  eyebrow: string;
  showCart?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
  showBackToMenu?: boolean;
  activeMenu?: 'direcciones' | 'pedidos' | null;
}

export const ClientHeader = ({
  eyebrow,
  showCart = false,
  cartCount = 0,
  onCartClick,
  showBackToMenu = false,
  activeMenu = null,
}: ClientHeaderProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { showConfirm } = useFeedback();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
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

  const isAdminLike = user?.roles?.some((r: string) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r)) ?? false;
  const isCocinaLike = user?.roles?.some((r: string) => ['ADMIN', 'PEDIDOS', 'COCINA'].includes(r)) ?? false;

  const eyebrowClass = 'text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';
  const menuItemBase =
    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150';

  return (
    <header className="glass-header sticky top-0 z-40">
      {/* Acento de color en la base del header */}
      <div className="absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r from-brand-red-500/60 via-brand-yellow-400 to-brand-red-500/60" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <Logo size="md" variant="red" className="group-hover:scale-105 group-active:scale-95" />
          <div className="hidden sm:block">
            <span className="font-display font-black text-ink-900 text-xl leading-tight block">
              Food Store
            </span>
            <span className={`block ${eyebrowClass}`}>{eyebrow}</span>
          </div>
        </Link>

        {/* Brand mobile */}
        <div className="sm:hidden flex-1 ml-1 truncate">
          <span className="font-display font-black text-ink-900 text-base leading-none block truncate">
            Food Store
          </span>
          <span className={`block ${eyebrowClass} truncate`}>{eyebrow}</span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {showBackToMenu && (
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-red-600 font-semibold transition-colors px-3 py-2 rounded-xl hover:bg-white/60"
            >
              <ChevronLeft size={16} />
              <span>Volver al menú</span>
            </Link>
          )}

          {showCart && (
            <button
              onClick={onCartClick}
              className="relative bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-brand hover:shadow-lg transition-all duration-200 active:scale-[0.96] cursor-pointer flex items-center gap-2"
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={16} />
              <span className="text-xs font-bold hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-yellow-400 text-ink-900 border-2 border-white/80 font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-sm animate-fadeIn">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-2xl glass-panel hover:bg-white/80 active:scale-[0.97] transition-all duration-150 cursor-pointer border-brand-yellow-200/60"
                aria-label="Menú de usuario"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-yellow-400 text-ink-900 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase() : 'US'}
                </div>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-xs font-black text-ink-900 truncate max-w-[120px]">
                    {user?.nombre}
                  </span>
                  <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">
                    Mi cuenta
                  </span>
                </div>
                <ChevronDown size={14} className="hidden md:block text-ink-500 shrink-0" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    onClick={() => setIsUserMenuOpen(false)}
                    className="fixed inset-0 z-30"
                  />
                  <div className="absolute right-0 mt-2.5 w-64 glass-modal rounded-2xl p-2 z-40 animate-fadeIn">
                    <div className="px-3 py-2.5 border-b border-white/40 mb-1.5">
                      <span className="block font-black text-ink-900 text-sm truncate">
                        {user?.nombre} {user?.apellido}
                      </span>
                      <span className="block text-[11px] text-ink-500 font-medium truncate">
                        {user?.email}
                      </span>
                    </div>

                    <Link
                      to="/direcciones"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`${menuItemBase} ${
                        activeMenu === 'direcciones'
                          ? 'bg-brand-red-500/10 text-brand-red-700'
                          : 'text-ink-700 hover:bg-white/60 hover:text-ink-900'
                      }`}
                    >
                      <MapPin size={15} />
                      <span>Mis Direcciones</span>
                    </Link>

                    <Link
                      to="/pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`${menuItemBase} ${
                        activeMenu === 'pedidos'
                          ? 'bg-brand-red-500/10 text-brand-red-700'
                          : 'text-ink-700 hover:bg-white/60 hover:text-ink-900'
                      }`}
                    >
                      <Navigation size={15} />
                      <span>Mis Pedidos</span>
                    </Link>

                    {isAdminLike && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`${menuItemBase} text-ink-700 hover:bg-white/60 hover:text-ink-900`}
                      >
                        <Briefcase size={15} />
                        <span>Panel Admin</span>
                      </Link>
                    )}

                    {isCocinaLike && (
                      <Link
                        to="/cocina"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`${menuItemBase} text-ink-700 hover:bg-white/60 hover:text-ink-900`}
                      >
                        <Layers size={15} className="text-orange-500" />
                        <span>Display Cocina</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className={`${menuItemBase} text-danger-600 hover:bg-danger-50/70 hover:text-danger-700 cursor-pointer border-t border-white/40 mt-1.5 pt-3`}
                    >
                      <LogOut size={15} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold px-4 py-2.5 rounded-2xl shadow-yellow hover:shadow-lg transition-all duration-200 active:scale-[0.96] text-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
