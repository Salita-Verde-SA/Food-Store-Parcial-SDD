import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../shared/stores/authStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirigir a login pero guardando la ubicación actual
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const hasRole = user.roles.some((role: string) => allowedRoles.includes(role));
    if (!hasRole) {
      // Redirigir a unauthorized o home si no tiene el rol
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
