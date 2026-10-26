import React, { useState } from 'react';
import { Order, ProductionStatus, PRODUCTION_STATUS_STEPS } from '../types/order';
import { 
  Flame, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Shirt, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatDateId } from '../utils/formatters';

interface ProductionProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: ProductionStatus) => void;
  onViewOrder: (orderId: string) => void;
  onPrintOrder: (order: Order) => void;
}

export const Production: React.FC<ProductionProps> = ({
  orders,
  onUpdateStatus,
  onViewOrder,
  onPrintOrder,
}) => {
  const [filterMaterial, setFilterMaterial] = useState<string>('ALL');

  const filteredOrders = orders.filter(o => {
    if (filterMaterial !== 'ALL' && o.product.material !== filterMaterial) return false;
    return true;
  });

  const getNextStatus = (current: ProductionStatus): ProductionStatus | null => {
    const idx = PRODUCTION_STATUS_STEPS.findIndex(s => s.status === current);
    if (idx !== -1 && idx < PRODUCTION_STATUS_STEPS.length - 1) {
      return PRODUCTION_STATUS_STEPS[idx + 1].status;
    }
    return null;
  };

  const getPrevStatus = (current: ProductionStatus): ProductionStatus | null => {
    const idx = PRODUCTION_STATUS_STEPS.findIndex(s => s.status === current);
    if (idx > 0) {
      return PRODUCTION_STATUS_STEPS[idx - 1].status;
    }
    return null;
  };

  // Distinct materials for filter
  const materials = Array.from(new Set(orders.map(o => o.product.material).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
              Papan Alur Produksi Konveksi (Kanban Workshop)
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#D71920]">
              {orders.filter(o => o.productionStatus !== 'SELESAI').length} Order Aktif
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Geser order dari Desain ke Printing, Press, Cutting, hingga Jahit tanpa input ulang data.
          </p>
        </div>

        {/* Filter Material */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-semibold">Filter Kain:</span>
          <select
            value={filterMaterial}
            onChange={e => setFilterMaterial(e.target.value)}
            className="px-3 py-1.5 bg-neutral-100 rounded-xl font-bold text-neutral-800 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kain ({orders.length})</option>
            {materials.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Horizontal Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-3.5 items-start overflow-x-auto pb-4">
        {PRODUCTION_STATUS_STEPS.map((stage, stageIdx) => {
          const stageOrders = filteredOrders.filter(o => o.productionStatus === stage.status);
          const stageTotalPcs = stageOrders.reduce((sum, o) => sum + (o.product.totalQuantity || 0), 0);

          return (
            <div
              key={stage.status}
              className="bg-neutral-100/70 rounded-3xl p-3 border border-neutral-200/70 flex flex-col min-w-[200px]"
            >
              {/* Column Header */}
              <div className="pb-2.5 mb-2.5 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black text-neutral-400">
                      0{stageIdx + 1}
                    </span>
                    <span className="text-xs font-black text-neutral-900 uppercase tracking-tight">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {stageTotalPcs} pcs
                  </span>
                </div>
                <span className="w-5 h-5 rounded-full bg-white text-neutral-800 text-[11px] font-bold font-mono flex items-center justify-center shadow-2xs">
                  {stageOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 min-h-[300px]">
                {stageOrders.length === 0 ? (
                  <div className="h-28 rounded-2xl border border-dashed border-neutral-300 flex items-center justify-center text-center p-3 text-[11px] text-neutral-400">
                    Kosong
                  </div>
                ) : (
                  stageOrders.map(order => {
                    const nextSt = getNextStatus(order.productionStatus);
                    const prevSt = getPrevStatus(order.productionStatus);

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all group"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            onClick={() => onViewOrder(order.id)}
                            className="font-mono font-black text-xs text-[#D71920] hover:underline cursor-pointer"
                          >
                            #{order.orderNumber}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">
                            {order.product.totalQuantity} pcs
                          </span>
                        </div>

                        {/* Customer / Team */}
                        <div
                          onClick={() => onViewOrder(order.id)}
                          className="font-bold text-xs text-neutral-900 truncate cursor-pointer"
                        >
                          {order.customer.name}
                        </div>
                        {order.customer.teamName && (
                          <div className="text-[10px] text-neutral-400 truncate">
                            {order.customer.teamName}
                          </div>
                        )}

                        {/* Fabric & Design indicator */}
                        <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-neutral-100">
                          <span className="font-bold text-[#D71920] uppercase truncate">
                            {order.product.material}
                          </span>
                          {order.designs.length > 0 ? (
                            <span className="text-emerald-700 font-semibold text-[9px] bg-emerald-50 px-1 rounded">
                              Artwork ✓
                            </span>
                          ) : (
                            <span className="text-amber-700 text-[9px] bg-amber-50 px-1 rounded">
                              No Art
                            </span>
                          )}
                        </div>

                        {/* Deadline */}
                        {order.customer.deadlineDate && (
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono mt-1">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            <span>DL: {formatDateId(order.customer.deadlineDate)}</span>
                          </div>
                        )}

                        {/* Quick Status Shift Controls */}
                        <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between gap-1">
                          {prevSt ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, prevSt)}
                              className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 rounded transition-colors text-[10px] font-bold flex items-center gap-0.5"
                              title={`Kembalikan ke ${prevSt}`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          ) : <div />}

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onViewOrder(order.id)}
                              className="p-1 text-neutral-400 hover:text-neutral-800 rounded"
                              title="Buka Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintOrder(order)}
                              className="p-1 text-neutral-400 hover:text-[#D71920] rounded"
                              title="Cetak SPK / Form Sublime"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {nextSt ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, nextSt)}
                              className="px-2 py-1 bg-neutral-900 hover:bg-[#D71920] text-white rounded-lg transition-colors text-[10px] font-bold flex items-center gap-0.5"
                              title={`Lanjut ke ${nextSt}`}
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Selesai ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
