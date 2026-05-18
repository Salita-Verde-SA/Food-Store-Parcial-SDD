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

interface VariantStyle {
  iconBg: string;
  iconFg: string;
  ring: string;
  badge: string;
  icon: React.ReactNode;
  accent: string;
}

const variantStyles: Record<AlertVariant, VariantStyle> = {
  info: {
    iconBg: 'bg-info-50',
    iconFg: 'text-info-600',
    ring: 'ring-info-100',
    badge: 'bg-info-100 text-info-700',
    icon: <Info size={28} className="stroke-[2.2]" />,
    accent: 'from-info-500/0 via-info-500 to-info-500/0',
  },
  success: {
    iconBg: 'bg-success-50',
    iconFg: 'text-success-600',
    ring: 'ring-success-100',
    badge: 'bg-success-100 text-success-700',
    icon: <CheckCircle size={28} className="stroke-[2.2]" />,
    accent: 'from-success-500/0 via-success-500 to-success-500/0',
  },
  warning: {
    iconBg: 'bg-brand-yellow-50',
    iconFg: 'text-brand-yellow-700',
    ring: 'ring-brand-yellow-100',
    badge: 'bg-brand-yellow-100 text-brand-yellow-800',
    icon: <AlertTriangle size={28} className="stroke-[2.2]" />,
    accent: 'from-brand-yellow-400/0 via-brand-yellow-400 to-brand-yellow-400/0',
  },
  danger: {
    iconBg: 'bg-danger-50',
    iconFg: 'text-danger-600',
    ring: 'ring-danger-100',
    badge: 'bg-danger-100 text-danger-700',
    icon: <XCircle size={28} className="stroke-[2.2]" />,
    accent: 'from-danger-500/0 via-danger-500 to-danger-500/0',
  },
};

const defaultTitle: Record<AlertVariant, string> = {
  danger: 'Atención',
  warning: 'Aviso',
  success: 'Listo',
  info: 'Información',
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
  const confirmStyle = variantStyles[confirmVariant];

  const confirmBtnClass =
    confirmVariant === 'danger'
      ? 'bg-danger-500 hover:bg-danger-600 active:bg-danger-700 text-white shadow-sm hover:shadow-md'
      : confirmVariant === 'warning'
      ? 'bg-brand-yellow-400 hover:bg-brand-yellow-500 active:bg-brand-yellow-600 text-ink-900 shadow-yellow hover:shadow-lg'
      : 'bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white shadow-brand hover:shadow-lg';

  return (
    <FeedbackContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {alertState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={closeAlert}
            className="fixed inset-0 bg-ink-900/55 backdrop-blur-sm animate-fadeIn"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative bg-paper-0 rounded-2xl shadow-xl w-full max-w-md animate-scaleUp border border-paper-200 overflow-hidden"
          >
            <div className={`h-1.5 bg-gradient-to-r ${alertStyle.accent}`} />

            <div className="flex items-start gap-4 px-6 py-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-4 ${alertStyle.ring} ${alertStyle.iconBg} ${alertStyle.iconFg}`}
              >
                {alertStyle.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                <h3 className="font-display text-xl font-extrabold text-ink-900 leading-tight">
                  {alertState.title || defaultTitle[alertVariant]}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">{alertState.message}</p>
              </div>
              <button
                onClick={closeAlert}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 flex justify-end">
              <button
                onClick={closeAlert}
                className="bg-brand-red-500 hover:bg-brand-red-600 active:bg-brand-red-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-brand hover:shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer"
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
            className="fixed inset-0 bg-ink-900/55 backdrop-blur-sm animate-fadeIn"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative bg-paper-0 rounded-2xl shadow-xl w-full max-w-md animate-scaleUp border border-paper-200 overflow-hidden"
          >
            <div className={`h-1.5 bg-gradient-to-r ${confirmStyle.accent}`} />

            <div className="flex items-start gap-4 px-6 py-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-4 ${confirmStyle.ring} ${confirmStyle.iconBg} ${confirmStyle.iconFg}`}
              >
                {confirmStyle.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                <h3 className="font-display text-xl font-extrabold text-ink-900 leading-tight">
                  {confirmState.title || 'Confirmar acción'}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                  {confirmState.message}
                </p>
              </div>
              <button
                onClick={() => closeConfirm(false)}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 border-t border-paper-200 bg-paper-50 flex justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="bg-paper-0 border-2 border-paper-200 hover:border-ink-700 hover:bg-paper-100 text-ink-900 font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
              >
                {confirmState.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`${confirmBtnClass} font-bold px-5 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer`}
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
