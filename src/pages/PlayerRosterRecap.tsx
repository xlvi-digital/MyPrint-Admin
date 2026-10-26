import React, { useState, useMemo } from 'react';
import { Order } from '../types/order';
import { Search, Users, Download, Eye, ExternalLink } from 'lucide-react';
import { displaySpecialNote } from '../utils/rosterData';

interface PlayerRosterRecapProps {
  orders: Order[];
  onViewOrder: (id: string) => void;
}

export const PlayerRosterRecap: React.FC<PlayerRosterRecapProps> = ({
  orders,
  onViewOrder,
}) => {
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('ALL');

  // Flatten all player rows with their parent order context
  const allRows = useMemo(() => {
    const list: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      teamName?: string;
      material: string;
      name: string;
      number: string;
      size: string;
      quantity: number;
      notes?: string;
      sleeve: string;
    }[] = [];

    for (const o of orders) {
      if (o.players && o.players.length > 0) {
        for (const p of o.players) {
          list.push({
            orderId: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customer.name,
            teamName: o.customer.teamName,
            material: o.product.material,
            name: p.name || 'TANPA NAMA',
            number: p.number || '-',
            size: p.size || 'L',
            quantity: p.quantity || 1,
            notes: p.notes,
            sleeve: p.sleeve || o.product.sleeve || '-',
          });
        }
      }
    }
    return list;
  }, [orders]);

  const filtered = allRows.filter(r => {
    if (sizeFilter !== 'ALL' && r.size !== sizeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.number.toLowerCase().includes(q) ||
      r.orderNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.teamName || '').toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const headers = ['No Order', 'Pemesan', 'Tim', 'Nama Pemain', 'No Punggung', 'Ukuran', 'Qty', 'Jenis Lengan', 'Catatan'];
    const rows = filtered.map(r => [
      `"${r.orderNumber}"`,
      `"${r.customerName}"`,
      `"${r.teamName || ''}"`,
      `"${r.name}"`,
      `"${r.number}"`,
      `"${r.size}"`,
      r.quantity,
      `"${r.sleeve}"`,
      `"${displaySpecialNote(r.notes)}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nama_Pemain_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
              Rekap Nama, Nomor Punggung & Ukuran Pemain
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cari data pemain atau nomor punggung tertentu di semua pesanan untuk proses sortir dan QC finishing.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Roster CSV</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama pemain (e.g. Budi), nomor punggung (e.g. 10), atau nomor order..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#D71920] outline-none font-medium"
          />
        </div>

        <select
          value={sizeFilter}
          onChange={e => setSizeFilter(e.target.value)}
          className="px-3 py-2 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-800 outline-none cursor-pointer w-full sm:w-auto"
        >
          <option value="ALL">Semua Ukuran ({allRows.length} Baris)</option>
          {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'].map(s => (
            <option key={s} value={s}>
              Ukuran {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50/90 text-neutral-600 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4 w-28">No. Order</th>
                <th className="py-3 px-4">Nama Pemain</th>
                <th className="py-3 px-4 w-24 text-center">No Punggung</th>
                <th className="py-3 px-4 w-24 text-center">Ukuran</th>
                <th className="py-3 px-4 w-16 text-center">Qty</th>
                <th className="py-3 px-4 w-28 text-center">Jenis Lengan</th>
                <th className="py-3 px-4">Pemesan / Tim</th>
                <th className="py-3 px-4">Bahan Kain</th>
                <th className="py-3 px-4">Catatan Khusus</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-medium bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    Tidak ada data pemain yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70 font-mono text-[11px]">
                    <td className="py-2.5 px-4 font-bold text-[#D71920]">
                      #{row.orderNumber}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-900 uppercase">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-neutral-900 text-xs">
                      {row.number}
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-[#D71920] text-xs">
                      {row.size}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold">
                      {row.quantity}
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans text-neutral-700">
                      {row.sleeve}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-neutral-700">
                      {row.customerName} {row.teamName ? `(${row.teamName})` : ''}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-neutral-600">
                      {row.material}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-neutral-500">
                      {displaySpecialNote(row.notes)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <button
                        onClick={() => onViewOrder(row.orderId)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-2 py-1 rounded-lg"
                      >
                        <span>Buka Order</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
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
