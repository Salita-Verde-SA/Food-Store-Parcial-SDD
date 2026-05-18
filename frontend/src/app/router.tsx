import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProtectedRoute } from './providers/ProtectedRoute';
import { CategoriasPage } from '../pages/admin/CategoriasPage';
import { ProductosPage } from '../pages/admin/ProductosPage';
import { IngredientesPage } from '../pages/admin/IngredientesPage';
import { PedidosPage as AdminPedidosPage } from '../pages/admin/PedidosPage';
import { CatalogPage } from '../pages/CatalogPage';
import { AddressesPage } from '../pages/AddressesPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';

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
  // Rutas protegidas para clientes y cualquier usuario logueado
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/direcciones',
        element: <AddressesPage />,
      },
      {
        path: '/checkout',
        element: <CheckoutPage />,
      },
      {
        path: '/pedidos',
        element: <OrdersPage />,
      },
    ],
  },
  // Rutas protegidas para admin y gestores de stock
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
  // Rutas protegidas para admin y gestores de pedidos
  {
    element: <ProtectedRoute allowedRoles={['ADMIN', 'PEDIDOS']} />,
    children: [
      {
        path: '/admin/pedidos',
        element: <AdminPedidosPage />,
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

