import React, { useState } from 'react';
import { Order, ProductionStatus } from '../types/order';
import { Printer, CheckCircle2, Eye, Filter, ArrowRight, Play, Check } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateId } from '../utils/formatters';

interface PrintingQueueProps {
  orders: Order[];
  onViewOrder: (id: string) => void;
  onPrintOrder: (order: Order) => void;
  onUpdateStatus: (id: string, status: ProductionStatus) => void;
}

export const PrintingQueue: React.FC<PrintingQueueProps> = ({
  orders,
  onViewOrder,
  onPrintOrder,
  onUpdateStatus,
}) => {
  const [machineFilter, setMachineFilter] = useState<string>('ALL');
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  // Filter printing orders
  const printingOrders = orders.filter(o => {
    if (onlyActive && (o.productionStatus === 'SELESAI' || o.productionStatus === 'DRAFT')) {
      return false;
    }
    if (machineFilter !== 'ALL') {
      const hasMachine = o.printingMachines.some(m => m.name.toLowerCase().includes(machineFilter.toLowerCase()));
      if (!hasMachine) return false;
    }
    return true;
  });

  const totalPrintingPcs = printingOrders.reduce((sum, o) => sum + (o.product.totalQuantity || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                Antrian Mesin Printing Sublim (Print Queue)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Monitoring operator cetak: Order mana yang siap naik ke mesin Epson SureColor atau Mimaki.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={e => setOnlyActive(e.target.checked)}
              className="accent-[#D71920]"
            />
            <span>Hanya Order Aktif</span>
          </label>

          <select
            value={machineFilter}
            onChange={e => setMachineFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-800 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Mesin</option>
            <option value="EPSON F7270">EPSON F7270</option>
            <option value="EPSON F9470">EPSON F9470</option>
            <option value="MIMAKI">MIMAKI</option>
          </select>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-xs font-bold text-neutral-400 uppercase">Order Dalam Antrian</span>
          <div className="text-2xl font-mono font-black text-neutral-900 mt-1">
            {printingOrders.length} <span className="text-xs font-sans text-neutral-400">order</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-xs font-bold text-neutral-400 uppercase">Total Meter Kain / Pcs</span>
          <div className="text-2xl font-mono font-black text-[#D71920] mt-1">
            {totalPrintingPcs} <span className="text-xs font-sans text-neutral-400">pcs total</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-xs font-bold text-neutral-400 uppercase">Status Cetak Aktif</span>
          <div className="text-2xl font-mono font-black text-blue-600 mt-1">
            {orders.filter(o => o.productionStatus === 'PRINTING').length} <span className="text-xs font-sans text-neutral-400">sedang print</span>
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50/90 text-neutral-600 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">No. Order</th>
                <th className="py-3 px-4">Pemesan</th>
                <th className="py-3 px-4">Kain & Produk</th>
                <th className="py-3 px-4 text-center">Qty (Pcs)</th>
                <th className="py-3 px-4">Alokasi Mesin Printing</th>
                <th className="py-3 px-4">Artwork Desain</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-medium bg-white">
              {printingOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Tidak ada order yang sedang antri di divisi printing.
                  </td>
                </tr>
              ) : (
                printingOrders.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/70">
                    {/* Order # */}
                    <td className="py-3 px-4 font-mono font-black text-[#D71920]">
                      #{order.orderNumber}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{order.customer.name}</div>
                      {order.customer.teamName && (
                        <div className="text-[10px] text-neutral-400">{order.customer.teamName}</div>
                      )}
                    </td>

                    {/* Material */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-neutral-800">{order.product.material}</span>
                      <div className="text-[10px] text-neutral-400">{order.product.productType}</div>
                    </td>

                    {/* Qty */}
                    <td className="py-3 px-4 text-center font-mono font-black text-neutral-900 text-sm">
                      {order.product.totalQuantity}
                    </td>

                    {/* Machines */}
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-700">
                      {order.printingMachines.map((m, i) => (
                        <span key={i} className="inline-block bg-neutral-100 px-1.5 py-0.5 rounded mr-1 mb-0.5">
                          {m.name}
                        </span>
                      ))}
                    </td>

                    {/* Design thumbnail */}
                    <td className="py-3 px-4">
                      {order.designs.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={order.designs[0].dataUrl}
                            alt="thumb"
                            className="w-8 h-8 rounded border border-neutral-200 object-contain bg-neutral-50"
                          />
                          <span className="text-[10px] font-bold text-emerald-700">Siap Cetak</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Belum Ada File
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={order.productionStatus} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.productionStatus !== 'PRINTING' ? (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(order.id, 'PRINTING')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            title="Tandai Sedang Print"
                          >
                            <Play className="w-3 h-3" />
                            <span>Mulai Print</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(order.id, 'PRESS')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            title="Tandai Selesai Print & Lanjut Press"
                          >
                            <Check className="w-3 h-3" />
                            <span>Kirim ke Press</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onViewOrder(order.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
                          title="Buka Dokumen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintOrder(order)}
                          className="p-1.5 text-neutral-400 hover:text-[#D71920] hover:bg-red-50 rounded-lg"
                          title="Cetak SPK Form Sublime"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
