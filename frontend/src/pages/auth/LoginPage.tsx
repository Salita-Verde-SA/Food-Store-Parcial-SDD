import { useForm } from '@tanstack/react-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../shared/stores/authStore';
import { api } from '../../shared/api/axios';
import { useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-brand-red-500 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorativo: arcos amarillos sutiles */}
      <svg
        aria-hidden="true"
        className="absolute -top-24 -left-24 w-96 h-96 opacity-10 pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round"/>
      </svg>
      <svg
        aria-hidden="true"
        className="absolute -bottom-24 -right-24 w-96 h-96 opacity-10 pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path d="M20 180 Q20 20 100 20 Q180 20 180 180" stroke="#FFC72C" strokeWidth="40" strokeLinecap="round"/>
      </svg>

      <div className="relative bg-paper-0 rounded-2xl shadow-lg w-full max-w-md p-8 md:p-10 animate-scaleUp">
        <div className="flex flex-col items-center text-center">
          <Logo size="xl" variant="yellow" className="shadow-md" />
          <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-ink-900 tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="mt-2 text-xs text-ink-500 font-medium uppercase tracking-widest">
            Food Store · Panel de Gestión
          </p>
        </div>

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          {error && (
            <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3 rounded-md text-sm flex items-center gap-2 font-medium animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form.Field
            name="email"
            children={(field) => (
              <div>
                <label htmlFor={field.name} className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5">
                  Email
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150"
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
                <label htmlFor={field.name} className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5">
                  Contraseña
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150"
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
            className="w-full bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold py-3 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            <span>{isLoading ? 'Cargando...' : 'Entrar'}</span>
          </button>

          <p className="text-center text-[11px] text-ink-400 font-medium pt-2">
            Acceso restringido — solo personal autorizado
          </p>
        </form>
      </div>
    </div>
  );
};
