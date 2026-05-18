import { AdminLayout } from '../../shared/ui/AdminLayout';
import { CategoriasManager } from '../../features/categorias/CategoriasManager';

export const CategoriasPage = () => {
  return (
    <AdminLayout 
      title="Administración de Categorías" 
      subtitle="Estructura y jerarquía del catálogo de comida"
    >
      <CategoriasManager />
    </AdminLayout>
  );
};
