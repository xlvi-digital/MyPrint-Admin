import React from 'react';
import { Order } from '../../types/order';
import { InvoicePreviewA4 } from '../invoice/InvoicePreviewA4';
import { X, Printer, Download, CheckCircle2, AlertTriangle, FileText, Info } from 'lucide-react';
import { getOrderTotalQuantity, resolveOrderInputMode } from '../../utils/orderSizing';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPrintNow: () => void;
  onDownloadPdf?: (order: Order) => Promise<void> | void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onPrintNow,
  onDownloadPdf,
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!isOpen || !order) return null;

  const inputMode = resolveOrderInputMode(order.inputMode, order.players || []);
  const totalPlayerQty = getOrderTotalQuantity(inputMode, order.players || []);
  const totalDisplayQty = (order.players || []).length ? totalPlayerQty : order.product?.totalQuantity || 0;
  const isMatch = (order.players || []).length === 0 || totalPlayerQty === totalDisplayQty;

  const handleDownloadClick = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (onDownloadPdf) {
        await onDownloadPdf(order);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-neutral-200/90 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Topbar */}
        <div className="px-6 py-4 border-b border-neutral-200/80 flex items-center justify-between gap-4 bg-white/95 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D71920] flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-neutral-900 tracking-tight truncate">
                  Preview Form Order Sublime
                </h2>
                <span className="font-mono text-xs font-bold text-[#D71920] px-2 py-0.5 bg-red-50 rounded-lg">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium truncate">
                {order.customer.name} · {order.product.material} ({totalDisplayQty} pcs) · Pagination A4 otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Direct PDF File Download */}
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
              title="Unduh langsung file Form-Order-[NO-ORDER].pdf"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Menghasilkan PDF...' : 'Download PDF'}</span>
            </button>

            {/* Secondary Action: Browser Print Dialog */}
            <button
              type="button"
              onClick={onPrintNow}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors"
              title="Buka dialog cetak browser printer fisik"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Browser</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Banner */}
        <div className="px-6 py-2.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-600 font-medium">
              Setting Browser: Pilih <strong>A4 Portrait</strong> & centang <strong>&quot;Background Graphics&quot;</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isMatch ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Validasi: Data Roster Sesuai ({totalPlayerQty} pcs)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Validasi: Selisih {Math.abs(totalDisplayQty - totalPlayerQty)} pcs</span>
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-100/70">
          <div className="max-w-[780px] min-w-0 mx-auto bg-white shadow-xl rounded-lg overflow-hidden p-2 sm:p-4">
            <InvoicePreviewA4 order={order} mode="preview" />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <div>
            Format Dokumen Cetak Form Order Sublime Standar Workshop Percetakan
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
};
