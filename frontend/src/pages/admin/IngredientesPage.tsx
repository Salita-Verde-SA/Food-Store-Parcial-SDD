import { AdminLayout } from '../../shared/ui/AdminLayout';
import { IngredientesManager } from '../../features/ingredientes/IngredientesManager';

export const IngredientesPage = () => {
  return (
    <AdminLayout 
      title="Administración de Ingredientes" 
      subtitle="Gestión de insumos y alérgenos de seguridad alimentaria"
    >
      <IngredientesManager />
    </AdminLayout>
  );
};
