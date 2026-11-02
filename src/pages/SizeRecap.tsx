import React, { useState } from 'react';
import { Order, STANDARD_SIZES } from '../types/order';
import { calculateSizeRecap } from '../utils/calculations';
import { Layers, Shirt, Download, Filter, Eye, Printer } from 'lucide-react';
import { useMasterData } from '../hooks/useMasterData';

interface SizeRecapProps {
  orders: Order[];
  onViewOrder: (id: string) => void;
  onPrintOrder: (order: Order) => void;
}

export const SizeRecap: React.FC<SizeRecapProps> = ({
  orders,
  onViewOrder,
  onPrintOrder,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ALL');
  const masterData = useMasterData();
  const configuredSizes = masterData.data.jersey_sizes.map(size => size.code || size.name);
  const sizeOrder = configuredSizes.length > 0 ? configuredSizes : STANDARD_SIZES;

  const filteredOrders = selectedOrderId === 'ALL'
    ? orders
    : orders.filter(o => o.id === selectedOrderId);

  const { recap, totalQty } = calculateSizeRecap(filteredOrders, sizeOrder);

  const handleExportCsv = () => {
    const headers = ['Ukuran', 'Kuantitas (Pcs)'];
    const rows = recap.map(r => [r.size, r.quantity]);
    rows.push(['TOTAL', totalQty]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Ukuran_myprintin_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#D71920] flex items-center justify-center font-bold">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                Rekap Akumulasi Ukuran Jersey (Size Matrix)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hitungan otomatis pola potong untuk operator cutting & penjahit tanpa rekap manual.
              </p>
            </div>
          </div>
        </div>

        {/* Filter per Order */}
        <div className="flex items-center gap-2">
          <select
            value={selectedOrderId}
            onChange={e => setSelectedOrderId(e.target.value)}
            className="px-3.5 py-2 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-800 outline-none cursor-pointer max-w-[260px] truncate"
          >
            <option value="ALL">Semua Order ({orders.length} Order)</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                #{o.orderNumber} - {o.customer.name} ({o.product.totalQuantity} pcs)
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rekap</span>
          </button>
        </div>
      </div>

      {/* Big Visual Size Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {recap.map(item => (
          <div
            key={item.size}
            className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs hover:border-[#D71920] transition-colors flex flex-col items-center justify-center text-center group"
          >
            <span className="text-xs font-black text-neutral-400 uppercase tracking-widest group-hover:text-[#D71920] transition-colors">
              Size {item.size}
            </span>
            <div className="text-3xl font-mono font-black text-neutral-900 my-1 tabular-nums">
              {item.quantity}
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">pcs</span>
          </div>
        ))}

        {/* Total Grand Card */}
        <div className="bg-[#D71920] text-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center col-span-2 sm:col-span-4 lg:col-span-8 lg:flex-row lg:justify-between px-8">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-white/80" />
            <div className="text-left">
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                Total Akumulasi Pcs
              </span>
              <span className="text-xs text-white/70">
                {selectedOrderId === 'ALL' ? 'Total keseluruhan pesanan aktif' : 'Total order terpilih'}
              </span>
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-mono font-black tabular-nums tracking-tight mt-2 lg:mt-0">
            {totalQty} <span className="text-base font-sans font-bold">pcs</span>
          </div>
        </div>
      </div>

      {/* Breakdown per Order Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs">
        <h3 className="text-xs font-bold text-neutral-900 tracking-tight uppercase mb-4">
          Rincian Distribusi Ukuran Tiap Order
        </h3>

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3">No. Order</th>
                <th className="py-2.5 px-3">Pemesan</th>
                <th className="py-2.5 px-3">Bahan</th>
                <th className="py-2.5 px-3 text-center">Total</th>
                <th className="py-2.5 px-3">Rincian Ukuran Terbanyak</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-medium">
              {filteredOrders.map(order => {
                const singleRecap = calculateSizeRecap([order], sizeOrder);
                const sizeSummary = singleRecap.recap
                  .map(r => `${r.size}: ${r.quantity}`)
                  .join(' · ');

                return (
                  <tr key={order.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-[#D71920]">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-900">{order.customer.name}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-800">
                      {order.product.material}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {order.product.totalQuantity} pcs
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                      {sizeSummary || `${order.product.totalQuantity} pcs (Standar)`}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onPrintOrder(order)}
                          className="p-1.5 text-neutral-500 hover:text-[#D71920] hover:bg-red-50 rounded-lg"
                          title="Cetak SPK"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
