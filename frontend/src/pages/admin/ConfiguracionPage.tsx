import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, 
  Truck, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import type { Configuracion } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { useConfigStore } from '../../shared/stores/configStore';
import { extractErrorMessage } from '../../shared/api/axios';
import { useFeedback } from '../../shared/ui/FeedbackProvider';

export const ConfiguracionPage = () => {
  const queryClient = useQueryClient();
  const { setConfigs, costoEnvio, estadoLocal } = useConfigStore();
  const { showAlert } = useFeedback();

  // Estados locales para los formularios
  const [localCost, setLocalCost] = useState<string>('0.00');
  const [localStatus, setLocalStatus] = useState<'abierto' | 'cerrado'>('abierto');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Query - Obtener configuraciones del backend
  const { data: configs, isLoading, isError, isFetching } = useQuery<Configuracion[]>({
    queryKey: ['admin-configuraciones'],
    queryFn: adminApi.getConfiguraciones,
  });

  // Efecto para hidratar el Zustand Store y los estados locales al recibir datos del backend
  useEffect(() => {
    if (configs) {
      const costoEnvioItem = configs.find(c => c.key === 'costo_envio');
      const estadoLocalItem = configs.find(c => c.key === 'estado_local');

      const costoVal = costoEnvioItem ? parseFloat(costoEnvioItem.value) : 150.00;
      const estadoVal = estadoLocalItem && (estadoLocalItem.value === 'abierto' || estadoLocalItem.value === 'cerrado')
        ? estadoLocalItem.value 
        : 'abierto';

      // Sincronizar Zustand Store
      setConfigs(costoVal, estadoVal);

      // Hidratar campos de input
      setLocalCost(costoVal.toFixed(2));
      setLocalStatus(estadoVal);
    }
  }, [configs, setConfigs]);

  // Mutación - Guardar parámetro en backend
  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      adminApi.updateConfiguracion(key, value),
    onSuccess: (updatedConfig) => {
      queryClient.invalidateQueries({ queryKey: ['admin-configuraciones'] });
      
      // Mostrar feedback estético temporal
      setSuccessMsg(`Parámetro "${updatedConfig.key}" actualizado con éxito en la base de datos.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: extractErrorMessage(err), variant: 'danger' });
    }
  });

  const handleSaveCostoEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const numericCost = parseFloat(localCost);
    if (isNaN(numericCost) || numericCost < 0) {
      showAlert({ title: 'Importe inválido', message: 'Por favor ingresa un costo de envío válido (mayor o igual a 0).', variant: 'warning' });
      return;
    }
    saveMutation.mutate({ key: 'costo_envio', value: numericCost.toFixed(2) });
  };

  const handleSaveEstadoLocal = () => {
    saveMutation.mutate({ key: 'estado_local', value: localStatus });
  };

  const cardBase = "bg-paper-0 border border-paper-200 rounded-lg shadow-sm";
  const eyebrow = "text-[11px] font-black uppercase tracking-[0.15em] text-brand-red-500";
  const inputBase = "w-full px-4 py-2.5 bg-paper-0 border border-paper-200 rounded-md text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-red-500 focus:ring-2 focus:ring-brand-red-500/20 transition-colors duration-150";

  return (
    <AdminLayout 
      title="Configuración del Sistema" 
      subtitle="Ajuste de variables globales de negocio, costos logísticos y estado del local"
    >
      {/* Banner de éxito */}
      {successMsg && (
        <div className="bg-success-50 border border-success-100 text-success-700 px-5 py-4 rounded-md flex items-center gap-3 animate-fadeIn mb-6">
          <CheckCircle2 size={20} className="text-success-600 shrink-0" />
          <div className="text-sm font-bold leading-normal">{successMsg}</div>
        </div>
      )}

      {/* Grid de Controles */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <div className="w-10 h-10 border-4 border-brand-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-ink-500">Recuperando parámetros persistidos...</span>
        </div>
      ) : isError ? (
        <div className="bg-danger-50 border border-danger-100 rounded-md p-6 text-center space-y-3">
          <AlertTriangle className="text-danger-600 mx-auto" size={32} />
          <h3 className="text-sm font-bold text-danger-800">Error de conexión</h3>
          <p className="text-xs text-danger-700">No se pudieron recuperar las configuraciones globales. Asegurate de levantar la BD.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONTROL: ESTADO DEL LOCAL */}
          <div className={`${cardBase} p-6 flex flex-col space-y-5 justify-between relative overflow-hidden group`}>
            {/* Header del card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-full bg-brand-yellow-100 text-brand-yellow-800 flex items-center justify-center">
                  <Store size={24} />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  localStatus === 'abierto'
                    ? 'bg-success-50 text-success-700 border border-success-200'
                    : 'bg-danger-50 text-danger-700 border border-danger-200'
                }`}>
                  {localStatus === 'abierto' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              <h3 className="text-lg font-black text-ink-900 pt-2">Disponibilidad del Local</h3>
              <p className="text-sm text-ink-500 leading-normal font-medium">
                Controla si la tienda virtual acepta transacciones comerciales de clientes o se bloquea a modo consulta.
              </p>
            </div>

            {/* Selector interactivo */}
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3 bg-paper-50 p-2 rounded-md border border-paper-200">
                <button
                  type="button"
                  onClick={() => setLocalStatus('abierto')}
                  className={`py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
                    localStatus === 'abierto'
                      ? 'bg-paper-0 text-ink-900 shadow-sm border border-paper-200'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  Abierto (Venta Activa)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalStatus('cerrado')}
                  className={`py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
                    localStatus === 'cerrado'
                      ? 'bg-paper-0 text-ink-900 shadow-sm border border-paper-200'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  Cerrado (Solo Lectura)
                </button>
              </div>

              {localStatus === 'cerrado' && (
                <div className="bg-brand-yellow-50 border border-brand-yellow-200 rounded-md p-3 flex gap-2 text-brand-yellow-800 text-xs leading-normal font-bold">
                  <Info size={16} className="text-brand-yellow-600 shrink-0 mt-0.5" />
                  <span>
                    RN-CO02: Al cerrar el local, el carrito se deshabilitará en la web principal para evitar compras offline.
                  </span>
                </div>
              )}
            </div>

            {/* Footer de guardado */}
            <div className="border-t border-paper-200 pt-5 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Zustand Sincronizado: {estadoLocal}</span>
              <button
                type="button"
                onClick={handleSaveEstadoLocal}
                disabled={saveMutation.isPending || isFetching}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold text-sm rounded-md shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                <Save size={16} />
                <span>{saveMutation.isPending ? 'Guardando...' : 'Aplicar'}</span>
              </button>
            </div>
          </div>

          {/* CONTROL: COSTO DE ENVÍO */}
          <form 
            onSubmit={handleSaveCostoEnvio}
            className={`${cardBase} p-6 flex flex-col space-y-5 justify-between relative overflow-hidden group`}
          >
            {/* Header del card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-full bg-brand-yellow-100 text-brand-yellow-800 flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <span className={eyebrow}>
                  Logística
                </span>
              </div>
              <h3 className="text-lg font-black text-ink-900 pt-2">Tarifa de Envío</h3>
              <p className="text-sm text-ink-500 leading-normal font-medium">
                Establece el costo base fijo a aplicar a todas las transacciones realizadas bajo la modalidad DELIVERY.
              </p>
            </div>

            {/* Campo numérico */}
            <div className="space-y-2 pt-4">
              <label className="text-xs text-ink-600 font-bold uppercase tracking-wider block">Importe de entrega ($):</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={localCost}
                  onChange={e => setLocalCost(e.target.value)}
                  className={`${inputBase} pl-8`}
                />
              </div>
            </div>

            {/* Footer de guardado */}
            <div className="border-t border-paper-200 pt-5 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Zustand Sincronizado: ${costoEnvio.toFixed(2)}</span>
              <button
                type="submit"
                disabled={saveMutation.isPending || isFetching}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold text-sm rounded-md shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                <Save size={16} />
                <span>{saveMutation.isPending ? 'Guardando...' : 'Aplicar'}</span>
              </button>
            </div>
          </form>

        </div>
      )}
    </AdminLayout>
  );
};
