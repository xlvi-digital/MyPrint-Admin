import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none no-print">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
          warning: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
        };

        const bgStyles = {
          success: 'bg-white border-emerald-200 text-neutral-900 shadow-lg shadow-emerald-500/5',
          error: 'bg-white border-red-200 text-neutral-900 shadow-lg shadow-red-500/5',
          warning: 'bg-white border-amber-200 text-neutral-900 shadow-lg shadow-amber-500/5',
          info: 'bg-white border-blue-200 text-neutral-900 shadow-lg shadow-blue-500/5',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${bgStyles}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              {toast.title && <p className="font-semibold text-sm mb-0.5">{toast.title}</p>}
              <p className="text-xs text-neutral-600 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-neutral-700 p-1 -mr-1 -mt-1 rounded-md transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
