import { AdminLayout } from '../../shared/ui/AdminLayout';
import { ProductosManager } from '../../features/productos/ProductosManager';

export const ProductosPage = () => {
  return (
    <AdminLayout 
      title="Administración de Productos" 
      subtitle="Gestión de catálogo, precios y vinculación de ingredientes"
    >
      <ProductosManager />
    </AdminLayout>
  );
};
