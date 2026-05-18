import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProtectedRoute } from './providers/ProtectedRoute';
import { CategoriasPage } from '../pages/admin/CategoriasPage';
import { ProductosPage } from '../pages/admin/ProductosPage';
import { IngredientesPage } from '../pages/admin/IngredientesPage';
import { CatalogPage } from '../pages/CatalogPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <CatalogPage />,
  },
  {
    path: '/catalog',
    element: <CatalogPage />,
  },
  {
    element: <ProtectedRoute allowedRoles={['ADMIN', 'STOCK']} />,
    children: [
      {
        path: '/admin/categorias',
        element: <CategoriasPage />,
      },
      {
        path: '/admin/productos',
        element: <ProductosPage />,
      },
      {
        path: '/admin/ingredientes',
        element: <IngredientesPage />,
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
