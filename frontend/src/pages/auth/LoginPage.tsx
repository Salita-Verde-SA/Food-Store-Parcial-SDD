import { useForm } from '@tanstack/react-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../shared/stores/authStore';
import { api } from '../../shared/api/axios';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, ChefHat, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '../../shared/ui/Logo';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post('/auth/login', value);
        const { user, access_token, refresh_token } = response.data;

        setAuth(user, access_token, refresh_token);
        navigate(from, { replace: true });
      } catch (err: any) {
        setError(err.detail || 'Error al iniciar sesión');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const inputClass =
    'w-full px-4 py-3 bg-paper-0 border border-paper-200 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/15 transition-colors duration-150';
  const labelClass = 'block text-xs font-bold uppercase tracking-[0.16em] text-ink-600 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream-50">
      {/* ───────── COLUMNA IZQUIERDA · Brand storytelling (oculta en mobile) ───────── */}
      <aside className="hidden lg:flex relative flex-1 bg-brand-red-500 text-paper-0 p-12 xl:p-16 flex-col justify-between overflow-hidden">
        {/* Decorativos */}
        <svg
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-[28rem] h-[28rem] opacity-15 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute -bottom-32 -right-24 w-[32rem] h-[32rem] opacity-15 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round" />
        </svg>

        {/* Top */}
        <div className="relative z-10 flex items-center gap-4">
          <Logo size="lg" variant="yellow" />
          <div className="leading-tight">
            <span className="font-display font-black text-2xl block">Food Store</span>
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-yellow-300">
              Cocina · Pasión · Frescura
            </span>
          </div>
        </div>

        {/* Mid · Headline */}
        <div className="relative z-10 space-y-6 max-w-xl">
          <span className="inline-flex items-center gap-2 bg-brand-yellow-400 text-ink-900 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm">
            <Sparkles size={13} />
            <span>Sabores que enamoran</span>
          </span>
          <h1 className="font-display text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight">
            Bienvenido a tu cocina favorita.
          </h1>
          <p className="text-brand-yellow-100 text-base xl:text-lg leading-relaxed font-medium max-w-md">
            Ingresá con tu cuenta para administrar pedidos, controlar el stock,
            seguir tu historial culinario y disfrutar de cada plato sin preocupaciones.
          </p>
        </div>

        {/* Bottom · Promesas */}
        <div className="relative z-10 grid grid-cols-2 gap-4 max-w-md">
          <Promise icon={<ChefHat size={18} />} title="Chef del año" sub="2025" />
          <Promise icon={<ShieldCheck size={18} />} title="Filtros alérgenos" sub="100% seguros" />
        </div>
      </aside>

      {/* ───────── COLUMNA DERECHA · Form ───────── */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 lg:py-12 relative">
        <Link
          to="/"
          className="absolute top-5 left-5 sm:top-7 sm:left-7 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 hover:text-brand-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-paper-100"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Volver a la tienda</span>
          <span className="sm:hidden">Tienda</span>
        </Link>

        <div className="w-full max-w-md animate-scaleUp">
          {/* Header del formulario */}
          <div className="flex flex-col items-center text-center mb-8 lg:hidden">
            <Logo size="lg" variant="red" className="shadow-brand" />
            <h2 className="mt-5 font-display text-3xl font-black text-ink-900 tracking-tight">
              Iniciar sesión
            </h2>
            <p className="mt-1.5 text-xs text-ink-500 font-bold uppercase tracking-widest">
              Food Store · Panel
            </p>
          </div>

          <div className="hidden lg:block text-left mb-8">
            <h2 className="font-display text-4xl font-black text-ink-900 tracking-tight">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-sm text-ink-500 leading-relaxed">
              Accedé con tus credenciales para continuar con tu sesión personalizada.
            </p>
          </div>

          {/* Card del formulario */}
          <div className="bg-paper-0 rounded-2xl shadow-xl border border-paper-200 p-7 lg:p-8 space-y-5">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              {error && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 font-medium animate-shake">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form.Field
                name="email"
                children={(field) => (
                  <div>
                    <label htmlFor={field.name} className={labelClass}>
                      Email
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                      placeholder="tu@email.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />

              <form.Field
                name="password"
                children={(field) => (
                  <div>
                    <label htmlFor={field.name} className={labelClass}>
                      Contraseña
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="password"
                      required
                      autoComplete="current-password"
                      className={inputClass}
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-3.5 rounded-xl shadow-brand hover:shadow-lg transition-all duration-200 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Cargando…</span>
                  </>
                ) : (
                  <span>Entrar a Food Store</span>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-paper-200 text-center">
              <p className="text-[11px] text-ink-400 font-bold uppercase tracking-wider">
                Acceso restringido · Solo personal autorizado
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-ink-400">
            ¿Sin cuenta?{' '}
            <Link to="/" className="font-bold text-brand-red-600 hover:underline">
              Volvé al menú público
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

const Promise = ({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) => (
  <div className="flex items-center gap-3 bg-paper-0/10 backdrop-blur-sm border border-paper-0/15 rounded-xl px-3 py-2.5">
    <div className="w-9 h-9 rounded-lg bg-brand-yellow-400 text-ink-900 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="leading-tight">
      <span className="text-sm font-black block">{title}</span>
      <span className="text-[11px] text-brand-yellow-100 font-medium block">{sub}</span>
    </div>
  </div>
);
