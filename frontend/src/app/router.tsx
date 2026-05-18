import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProtectedRoute } from './providers/ProtectedRoute';
import { CategoriasPage } from '../pages/admin/CategoriasPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />, // Requiere autenticación básica
    children: [
      {
        path: '/',
        element: <Navigate to="/admin/categorias" replace />, // Redirige por defecto a categorías
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['ADMIN', 'STOCK']} />,
    children: [
      {
        path: '/admin/categorias',
        element: <CategoriasPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        path: '/admin',
        element: <Navigate to="/admin/categorias" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/admin/categorias" replace />,
  },
]);
