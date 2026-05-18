import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertOptions {
  title?: string;
  message: string;
  variant?: AlertVariant;
  confirmText?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface FeedbackContextValue {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

interface AlertState extends AlertOptions {
  resolve: () => void;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode; ring: string }> = {
  info:    { bg: 'bg-info-50',    border: 'border-info-100',    text: 'text-info-700',    ring: 'bg-info-100 text-info-700',       icon: <Info size={28} /> },
  success: { bg: 'bg-success-50', border: 'border-success-100', text: 'text-success-700', ring: 'bg-success-100 text-success-700', icon: <CheckCircle size={28} /> },
  warning: { bg: 'bg-brand-yellow-50', border: 'border-brand-yellow-200', text: 'text-brand-yellow-800', ring: 'bg-brand-yellow-100 text-brand-yellow-800', icon: <AlertTriangle size={28} /> },
  danger:  { bg: 'bg-danger-50',  border: 'border-danger-100',  text: 'text-danger-700',  ring: 'bg-danger-100 text-danger-700',   icon: <XCircle size={28} /> },
};

export const FeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...options, resolve });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeAlert = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const closeConfirm = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const alertVariant = alertState?.variant ?? 'info';
  const alertStyle = variantStyles[alertVariant];

  const confirmVariant = confirmState?.variant ?? 'danger';
  const confirmStyle = variantStyles[confirmVariant === 'danger' ? 'danger' : confirmVariant === 'warning' ? 'warning' : 'info'];
  const confirmBtnClass =
    confirmVariant === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 active:bg-danger-700 text-white'
      : confirmVariant === 'warning'
      ? 'bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900'
      : 'bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white';

  return (
    <FeedbackContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {alertState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={closeAlert}
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm animate-fadeIn"
          />
          <div className="relative bg-paper-0 rounded-xl shadow-lg w-full max-w-md animate-scaleUp border border-paper-200">
            <div className="flex items-start gap-4 px-6 py-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${alertStyle.ring}`}>
                {alertStyle.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg font-bold text-ink-900 leading-tight">
                  {alertState.title || (alertVariant === 'danger' ? 'Atención' : alertVariant === 'warning' ? 'Aviso' : alertVariant === 'success' ? 'Listo' : 'Información')}
                </h3>
                <p className="text-sm text-ink-700 leading-relaxed">{alertState.message}</p>
              </div>
              <button
                onClick={closeAlert}
                className="p-1.5 rounded-md text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 rounded-b-xl flex justify-end">
              <button
                onClick={closeAlert}
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                {alertState.confirmText || 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => closeConfirm(false)}
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm animate-fadeIn"
          />
          <div className="relative bg-paper-0 rounded-xl shadow-lg w-full max-w-md animate-scaleUp border border-paper-200">
            <div className="flex items-start gap-4 px-6 py-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${confirmStyle.ring}`}>
                {confirmStyle.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg font-bold text-ink-900 leading-tight">
                  {confirmState.title || 'Confirmar acción'}
                </h3>
                <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">{confirmState.message}</p>
              </div>
              <button
                onClick={() => closeConfirm(false)}
                className="p-1.5 rounded-md text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="bg-paper-0 border-2 border-paper-200 hover:border-ink-900 hover:bg-paper-50 text-ink-900 font-semibold px-4 py-2 rounded-md transition-all duration-150 cursor-pointer"
              >
                {confirmState.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`${confirmBtnClass} font-bold px-5 py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer`}
              >
                {confirmState.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback debe usarse dentro de FeedbackProvider');
  }
  return ctx;
};
