import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, LoaderCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  type?: 'default' | 'danger' | 'warning' | 'review';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  isProcessing?: boolean;
  processingText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  subtitle,
  type = 'default',
  confirmText = 'Konfirmasi',
  cancelText = 'Kembali',
  onConfirm,
  onCancel,
  children,
  isProcessing = false,
  processingText = 'Memproses...',
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    default: {
      btnClass: 'bg-[#D71920] hover:bg-[#b8141a] text-white',
      icon: <Info className="w-5 h-5 text-neutral-700" />,
      headerBg: 'bg-neutral-50',
    },
    review: {
      btnClass: 'bg-[#D71920] hover:bg-[#b8141a] text-white shadow-sm',
      icon: <CheckCircle className="w-5 h-5 text-[#D71920]" />,
      headerBg: 'bg-red-50/50',
    },
    warning: {
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      headerBg: 'bg-amber-50',
    },
    danger: {
      btnClass: 'bg-red-600 hover:bg-red-700 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      headerBg: 'bg-red-50',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 no-print">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className={`p-5 flex items-start justify-between border-b border-neutral-200/60 ${typeConfig.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-neutral-200/40">
              {typeConfig.icon}
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">{title}</h3>
              {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-neutral-700 text-sm max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        <div className="p-4 bg-neutral-50/70 border-t border-neutral-200/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-60 ${typeConfig.btnClass}`}
          >
            {isProcessing && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {isProcessing ? processingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
