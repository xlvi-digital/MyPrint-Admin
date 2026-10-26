import React, { useState, useMemo } from 'react';
import { Order, ProductionStatus, PRODUCTION_STATUS_STEPS, COMMON_MATERIALS } from '../types/order';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Edit3, 
  Printer, 
  Copy, 
  Trash2, 
  Download, 
  Layers, 
  Calendar, 
  Plus,
  Shirt,
  X
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatRupiah, formatDateId } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';

interface OrderListProps {
  orders: Order[];
  onViewOrder: (id: string) => void;
  onEditOrder: (id: string) => void;
  onPrintOrder: (order: Order) => void;
  onDuplicateOrder: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onCreateNew: () => void;
  initialFilterStatus?: ProductionStatus | 'ALL';
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onViewOrder,
  onEditOrder,
  onPrintOrder,
  onDuplicateOrder,
  onDeleteOrder,
  onCreateNew,
  initialFilterStatus = 'ALL',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'qty'>('newest');

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Search across customer name, order number, phone, team name, and product type
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchNum = order.orderNumber.toLowerCase().includes(q);
          const matchName = order.customer.name.toLowerCase().includes(q);
          const matchPhone = (order.customer.phone || '').toLowerCase().includes(q);
          const matchTeam = (order.customer.teamName || '').toLowerCase().includes(q);
          const matchProd = (order.product.productType || '').toLowerCase().includes(q);
          if (!matchNum && !matchName && !matchPhone && !matchTeam && !matchProd) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'ALL' && order.productionStatus !== statusFilter) {
          return false;
        }

        // Material filter
        if (materialFilter !== 'ALL' && order.product.material !== materialFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        }
        if (sortBy === 'deadline') {
          if (!a.customer.deadlineDate) return 1;
          if (!b.customer.deadlineDate) return -1;
          return new Date(a.customer.deadlineDate).getTime() - new Date(b.customer.deadlineDate).getTime();
        }
        if (sortBy === 'qty') {
          return (b.product.totalQuantity || 0) - (a.product.totalQuantity || 0);
        }
        return 0;
      });
  }, [orders, search, statusFilter, materialFilter, sortBy]);

  const handleExportAllCsv = () => {
    const headers = ['No Order', 'Pemesan', 'Tim', 'Telepon', 'Bahan', 'Produk', 'Total Qty', 'Status', 'Tanggal Order', 'Deadline'];
    const rows = filteredOrders.map(o => [
      `"${o.orderNumber}"`,
      `"${(o.customer.name || '').replace(/"/g, '""')}"`,
      `"${(o.customer.teamName || '').replace(/"/g, '""')}"`,
      `"${(o.customer.phone || '').replace(/"/g, '""')}"`,
      `"${(o.product.material || '').replace(/"/g, '""')}"`,
      `"${(o.product.productType || '').replace(/"/g, '""')}"`,
      o.product.totalQuantity || 0,
      o.productionStatus,
      o.customer.orderDate,
      o.customer.deadlineDate || '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daftar_Order_myprintin_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari order: nama pemesan, no order (#366), WhatsApp, atau nama tim..."
              className="w-full pl-9 pr-9 py-2.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl outline-none font-medium transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportAllCsv}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Invoice</span>
            </button>
          </div>
        </div>

        {/* Filter Chips & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-xs">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-neutral-400 font-medium mr-1 hidden sm:inline">Status:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Semua ({orders.length})
            </button>
            {PRODUCTION_STATUS_STEPS.map(st => {
              const count = orders.filter(o => o.productionStatus === st.status).length;
              return (
                <button
                  key={st.status}
                  onClick={() => setStatusFilter(st.status)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    statusFilter === st.status
                      ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {st.label} {count > 0 && <span className="opacity-75 font-mono">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Material & Sorting Dropdowns */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={materialFilter}
              onChange={e => setMaterialFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Bahan</option>
              {COMMON_MATERIALS.filter(m => m !== 'Custom').map(m => (
                <option key={m} value={m}>
                  Bahan: {m}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 outline-none cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="deadline">Deadline Terdekat</option>
              <option value="qty">Qty Terbanyak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Order Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="Tidak ada order ditemukan"
            description={
              search || statusFilter !== 'ALL' || materialFilter !== 'ALL'
                ? 'Coba sesuaikan kata kunci pencarian atau ubah filter status.'
                : 'Belum ada data pesanan di sistem. Buat invoice baru sekarang.'
            }
            actionText="+ Buat Invoice Baru"
            onAction={onCreateNew}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/90 text-neutral-600 font-bold border-b border-neutral-200">
                  <th className="py-3.5 px-4 w-28">No. Order</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Pemesan & Tim</th>
                  <th className="py-3.5 px-4 w-28">Tanggal</th>
                  <th className="py-3.5 px-4 w-28">Deadline</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Produk & Kain</th>
                  <th className="py-3.5 px-4 w-20 text-center">Qty</th>
                  <th className="py-3.5 px-4 w-32">Status Produksi</th>
                  <th className="py-3.5 px-4 w-28 text-right">Total Biaya</th>
                  <th className="py-3.5 px-4 w-36 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 bg-white">
                {filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                    onClick={() => onViewOrder(order.id)}
                  >
                    {/* Order Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      <span className="text-[#D71920]">#{order.orderNumber}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 group-hover:text-[#D71920] transition-colors">
                        {order.customer.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-medium">
                        {order.customer.teamName || order.customer.phone}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="py-3.5 px-4 font-mono text-neutral-500">
                      {formatDateId(order.customer.orderDate)}
                    </td>

                    {/* Deadline Date */}
                    <td className="py-3.5 px-4 font-mono">
                      {order.customer.deadlineDate ? (
                        <span className="text-amber-800 font-semibold">
                          {formatDateId(order.customer.deadlineDate)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Product & Material */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{order.product.productType}</div>
                      <div className="text-[11px] font-bold text-[#D71920]">
                        {order.product.material}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-neutral-900">
                      {order.product.totalQuantity} pcs
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={order.productionStatus} size="sm" />
                    </td>

                    {/* Total Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                      {formatRupiah(order.product.totalPrice || 0)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewOrder(order.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditOrder(order.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintOrder(order)}
                          className="p-1.5 text-neutral-400 hover:text-[#D71920] hover:bg-red-50 rounded-lg transition-colors"
                          title="Cetak Form Order Sublime / PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateOrder(order.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Duplikat Order Ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteOrder(order.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Table Count */}
        <div className="p-4 bg-neutral-50/70 border-t border-neutral-200/80 flex items-center justify-between text-xs text-neutral-500 font-medium">
          <span>
            Menampilkan <strong className="text-neutral-900">{filteredOrders.length}</strong> dari{' '}
            <strong className="text-neutral-900">{orders.length}</strong> total order
          </span>
          <span className="font-mono">
            Total Qty Terfilter:{' '}
            <strong className="text-neutral-900 font-bold">
              {filteredOrders.reduce((sum, o) => sum + (o.product.totalQuantity || 0), 0)} pcs
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
