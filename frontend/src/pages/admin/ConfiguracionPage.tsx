import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Truck, 
  Store, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import type { Configuracion } from '../../shared/api/admin';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { useConfigStore } from '../../shared/stores/configStore';
import { extractErrorMessage } from '../../shared/api/axios';

export const ConfiguracionPage = () => {
  const queryClient = useQueryClient();
  const { setConfigs, costoEnvio, estadoLocal } = useConfigStore();

  // Estados locales para los formularios
  const [localCost, setLocalCost] = useState<string>('0.00');
  const [localStatus, setLocalStatus] = useState<'abierto' | 'cerrado'>('abierto');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Query - Obtener configuraciones del backend
  const { data: configs, isLoading, isError, refetch, isFetching } = useQuery<Configuracion[]>({
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
      alert(extractErrorMessage(err));
    }
  });

  const handleSaveCostoEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const numericCost = parseFloat(localCost);
    if (isNaN(numericCost) || numericCost < 0) {
      alert('Por favor ingresa un costo de envío válido (mayor o igual a 0).');
      return;
    }
    saveMutation.mutate({ key: 'costo_envio', value: numericCost.toFixed(2) });
  };

  const handleSaveEstadoLocal = () => {
    saveMutation.mutate({ key: 'estado_local', value: localStatus });
  };

  return (
    <AdminLayout 
      title="Configuración del Sistema" 
      subtitle="Ajuste de variables globales de negocio, costos logísticos y estado del local"
    >
      {/* Banner de éxito */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-5 py-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <div className="text-xs font-bold leading-normal">{successMsg}</div>
        </div>
      )}

      {/* Grid de Controles */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-500">Recuperando parámetros persistidos...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
          <AlertTriangle className="text-red-500 mx-auto" size={32} />
          <h3 className="text-sm font-extrabold text-red-800">Error de conexión</h3>
          <p className="text-xs text-red-600">No se pudieron recuperar las configuraciones globales. Asegurate de levantar la BD.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONTROL: ESTADO DEL LOCAL */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col space-y-5 justify-between relative overflow-hidden group">
            {/* Header del card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Store size={20} />
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider border uppercase ${
                  localStatus === 'abierto'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {localStatus === 'abierto' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-gray-800">Disponibilidad del Local</h3>
              <p className="text-[10px] text-gray-400 leading-normal font-medium">
                Controla si la tienda virtual acepta transacciones comerciales de clientes o se bloquea a modo consulta.
              </p>
            </div>

            {/* Selector interactivo */}
            <div className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => setLocalStatus('abierto')}
                  className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    localStatus === 'abierto'
                      ? 'bg-white text-gray-800 shadow-xs border border-gray-100/50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Abierto (Venta Activa)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalStatus('cerrado')}
                  className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    localStatus === 'cerrado'
                      ? 'bg-white text-gray-800 shadow-xs border border-gray-100/50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Cerrado (Solo Lectura)
                </button>
              </div>

              {localStatus === 'cerrado' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 text-amber-800 text-[10px] leading-normal font-bold">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    RN-CO02: Al cerrar el local, el carrito se deshabilitará en la web principal para evitar compras offline.
                  </span>
                </div>
              )}
            </div>

            {/* Footer de guardado */}
            <div className="border-t border-gray-50 pt-4 flex justify-between items-center shrink-0">
              <span className="text-[9px] text-gray-400 font-bold">Zustand Sincronizado: {estadoLocal.toUpperCase()}</span>
              <button
                type="button"
                onClick={handleSaveEstadoLocal}
                disabled={saveMutation.isPending || isFetching}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] rounded-xl shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                <Save size={12} />
                <span>{saveMutation.isPending ? 'Guardando...' : 'Aplicar'}</span>
              </button>
            </div>
          </div>

          {/* CONTROL: COSTO DE ENVÍO */}
          <form 
            onSubmit={handleSaveCostoEnvio}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col space-y-5 justify-between relative overflow-hidden group"
          >
            {/* Header del card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Logística
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-gray-800">Tarifa de Envío</h3>
              <p className="text-[10px] text-gray-400 leading-normal font-medium">
                Establece el costo base fijo a aplicar a todas las transacciones realizadas bajo la modalidad DELIVERY.
              </p>
            </div>

            {/* Campo numérico */}
            <div className="space-y-1.5 pt-3">
              <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Importe de entrega ($):</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={localCost}
                  onChange={e => setLocalCost(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs font-bold text-gray-800 leading-normal"
                />
              </div>
            </div>

            {/* Footer de guardado */}
            <div className="border-t border-gray-50 pt-4 flex justify-between items-center shrink-0">
              <span className="text-[9px] text-gray-400 font-bold">Zustand Sincronizado: ${costoEnvio.toFixed(2)}</span>
              <button
                type="submit"
                disabled={saveMutation.isPending || isFetching}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] rounded-xl shadow-md shadow-orange-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                <Save size={12} />
                <span>{saveMutation.isPending ? 'Guardando...' : 'Aplicar'}</span>
              </button>
            </div>
          </form>

        </div>
      )}
    </AdminLayout>
  );
};
