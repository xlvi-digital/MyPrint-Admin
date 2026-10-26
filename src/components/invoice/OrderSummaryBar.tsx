import React from 'react';
import { Order } from '../../types/order';
import { 
  Save, 
  Printer, 
  Eye, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  FileDown 
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

interface OrderSummaryBarProps {
  order: Order;
  onSave: () => void;
  onSaveAndPrint: () => void;
  onOpenPreview: () => void;
  onPrintPdf: () => void;
  onClearDraft: () => void;
  isSaving?: boolean;
}

export const OrderSummaryBar: React.FC<OrderSummaryBarProps> = ({
  order,
  onSave,
  onSaveAndPrint,
  onOpenPreview,
  onPrintPdf,
  onClearDraft,
  isSaving = false,
}) => {
  const { customer, product, players } = order;
  const computedTableQty = players.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const isQtyMatch = (product.totalQuantity || 0) === computedTableQty;

  return (
    <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-lg p-3 sm:p-4 no-print">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Live Summary Metrics */}
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div>
            <span className="text-neutral-400 block text-[10px] font-semibold uppercase">
              Pemesan / Tim
            </span>
            <span className="font-bold text-neutral-900 truncate max-w-[140px] block">
              {customer.name || 'Belum diisi'} {customer.teamName ? `(${customer.teamName})` : ''}
            </span>
          </div>

          <div className="hidden sm:block border-l border-neutral-200 pl-3">
            <span className="text-neutral-400 block text-[10px] font-semibold uppercase">
              Produk & Bahan
            </span>
            <span className="font-semibold text-neutral-800">
              {product.productType} · <span className="text-[#D71920] font-bold">{product.material || 'Milano'}</span>
            </span>
          </div>

          <div className="border-l border-neutral-200 pl-3">
            <span className="text-neutral-400 block text-[10px] font-semibold uppercase">
              Total Produksi
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-neutral-900">
                {product.totalQuantity || 0} pcs
              </span>
              {isQtyMatch ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                  Tabel: {computedTableQty} pcs ✓
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Tabel: {computedTableQty} pcs
                </span>
              )}
            </div>
          </div>

          <div className="hidden md:block border-l border-neutral-200 pl-3">
            <span className="text-neutral-400 block text-[10px] font-semibold uppercase">
              Total Tagihan
            </span>
            <span className="font-mono font-bold text-neutral-900">
              {formatRupiah(product.totalPrice || 0)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={onClearDraft}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Hapus Draft / Reset Form"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview A4</span>
          </button>

          <button
            type="button"
            onClick={onPrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>

          <button
            type="button"
            onClick={onSaveAndPrint}
            disabled={isSaving}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-900 bg-neutral-200/80 hover:bg-neutral-300 rounded-xl transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Simpan & Cetak</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#D71920] hover:bg-[#b8141a] rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
