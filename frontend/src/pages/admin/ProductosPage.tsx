import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  ShoppingBag, 
  Receipt, 
  LogOut, 
  Menu, 
  X,
  Cookie
} from 'lucide-react';
import { useAuthStore } from '../../shared/stores/authStore';
import { ProductosManager } from '../../features/productos/ProductosManager';

export const ProductosPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar tu sesión de Food Store?')) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Categorías', path: '/admin/categorias', icon: <Layers size={20} />, active: false },
    { name: 'Productos', path: '/admin/productos', icon: <ShoppingBag size={20} />, active: true },
    { name: 'Ingredientes', path: '/admin/ingredientes', icon: <Cookie size={20} />, active: false },
    { name: 'Pedidos', path: '#', icon: <Receipt size={20} />, active: false, disabled: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/70 via-gray-50 to-amber-50/50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-md border-r border-gray-100 p-5 shadow-sm shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            FS
          </div>
          <div>
            <span className="font-extrabold text-gray-800 text-lg">Food Store</span>
            <span className="block text-[10px] text-gray-500 tracking-wider uppercase font-semibold">Admin Panel</span>
          </div>
        </div>

        {/* Navegación */}
        <nav className="mt-8 space-y-1.5 flex-1">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.disabled ? '#' : item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                item.active 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/10'
                  : item.disabled
                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="border-t border-gray-100 pt-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold text-sm transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área del Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/50 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          {/* Botón menú mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-xl font-extrabold text-gray-800">Administración de Productos</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gestión de catálogo, precios y vinculación de ingredientes</p>
          </div>

          {/* Perfil del Usuario */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block font-bold text-gray-800 text-sm">{user?.nombre} {user?.apellido}</span>
              <span className="block text-[10px] bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full mt-0.5 uppercase font-bold tracking-wider">
                {user?.roles[0]}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shadow-sm">
              {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'US'}
            </div>
          </div>
        </header>

        {/* Drawer de Menú Mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-45 flex md:hidden animate-fadeIn">
            {/* Backdrop */}
            <div 
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs"
            ></div>
            
            {/* Drawer */}
            <aside className="relative flex flex-col w-64 bg-white p-5 shadow-2xl z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow">
                    FS
                  </div>
                  <span className="font-extrabold text-gray-800">Food Store</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-50 text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-8 space-y-1.5 flex-1">
                {navItems.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.disabled ? '#' : item.path}
                    onClick={() => !item.disabled && setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      item.active 
                        ? 'bg-orange-500 text-white shadow'
                        : item.disabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="border-t border-gray-100 pt-4 mt-auto">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold text-sm transition-all cursor-pointer"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Contenido Principal de la Página */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {/* Título móvil */}
          <div className="sm:hidden mb-2">
            <h1 className="text-2xl font-black text-gray-800">Productos</h1>
            <p className="text-xs text-gray-500">Gestión de catálogo y precios</p>
          </div>

          <ProductosManager />
        </main>
      </div>
    </div>
  );
};
