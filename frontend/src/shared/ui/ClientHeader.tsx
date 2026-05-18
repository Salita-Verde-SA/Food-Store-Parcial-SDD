import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  MapPin,
  Navigation,
  Briefcase,
  ChevronLeft,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeedback } from './FeedbackProvider';
import { Logo } from './Logo';

interface ClientHeaderProps {
  /** Texto pequeño en mayúsculas que acompaña al brand. Ej: "Nuestro Menú", "Checkout Seguro" */
  eyebrow: string;
  /** Muestra botón de carrito (sólo Catalog) */
  showCart?: boolean;
  /** Conteo de items en carrito (badge) */
  cartCount?: number;
  /** Handler del botón de carrito */
  onCartClick?: () => void;
  /** Muestra link “Volver al menú” */
  showBackToMenu?: boolean;
  /** Marca el item activo del dropdown de usuario */
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

  const eyebrowClass = 'text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-brand-red-600';
  const menuItemBase =
    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-150';

  return (
    <header className="sticky top-0 z-40 bg-paper-0/95 backdrop-blur-md border-b border-paper-200 shadow-xs">
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

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

        {/* Brand mobile (eyebrow oculto, mostramos solo el título en mobile) */}
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
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-red-600 font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-paper-100"
            >
              <ChevronLeft size={16} />
              <span>Volver al menú</span>
            </Link>
          )}

          {showCart && (
            <button
              onClick={onCartClick}
              className="relative bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-brand hover:shadow-lg transition-all duration-200 active:scale-[0.96] cursor-pointer flex items-center gap-2"
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={16} />
              <span className="text-xs font-bold hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-yellow-400 text-ink-900 border-2 border-paper-0 font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-sm animate-fadeIn">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-xl bg-cream-100 border border-brand-yellow-200 hover:border-brand-yellow-400 hover:bg-cream-50 active:scale-[0.97] transition-all duration-150 cursor-pointer"
                aria-label="Menú de usuario"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-yellow-400 text-ink-900 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
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
                  <div className="absolute right-0 mt-2 w-64 bg-paper-0 rounded-xl shadow-lg border border-paper-200 p-2 z-40 animate-fadeIn">
                    <div className="px-3 py-2.5 border-b border-paper-200 mb-1.5">
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
                          ? 'bg-brand-red-50 text-brand-red-700'
                          : 'text-ink-700 hover:bg-paper-100 hover:text-ink-900'
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
                          ? 'bg-brand-red-50 text-brand-red-700'
                          : 'text-ink-700 hover:bg-paper-100 hover:text-ink-900'
                      }`}
                    >
                      <Navigation size={15} />
                      <span>Mis Pedidos</span>
                    </Link>

                    {isAdminLike && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`${menuItemBase} text-ink-700 hover:bg-paper-100 hover:text-ink-900`}
                      >
                        <Briefcase size={15} />
                        <span>Panel Admin</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className={`${menuItemBase} text-danger-600 hover:bg-danger-50 hover:text-danger-700 cursor-pointer border-t border-paper-200 mt-1.5 pt-3`}
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
              className="bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 font-bold px-4 py-2.5 rounded-xl shadow-yellow hover:shadow-lg transition-all duration-200 active:scale-[0.96] text-xs cursor-pointer flex items-center gap-1.5"
            >
              <X size={14} className="rotate-45" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
