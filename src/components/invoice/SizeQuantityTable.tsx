import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PlayerDetail } from '../../types/order';
import { useMasterData } from '../../hooks/useMasterData';
import { getOrderSizeRecap, getOrderTotalQuantity } from '../../utils/orderSizing';

interface SizeQuantityTableProps {
  rows: PlayerDetail[];
  onChange: (rows: PlayerDetail[]) => void;
  preserveLegacySizes?: boolean;
}

export const SizeQuantityTable: React.FC<SizeQuantityTableProps> = ({
  rows,
  onChange,
  preserveLegacySizes = false,
}) => {
  const masterData = useMasterData();
  const addRow = () => onChange([
    ...rows,
    { id: `size-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', number: '', size: '', quantity: 0 },
  ]);
  const recap = getOrderSizeRecap('size-quantity', rows);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Jumlah PCS per Ukuran</h2>
          <p className="mt-0.5 text-xs text-neutral-400">Masukkan ukuran dan jumlahnya; nama pemain dan nomor punggung tidak diperlukan.</p>
        </div>
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 rounded-xl bg-[#D71920] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#b8141a]">
          <Plus className="h-3.5 w-3.5" /> Tambah Baris Ukuran
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-100 text-neutral-700">
            <tr>
              <th className="px-3 py-2.5">Ukuran</th>
              <th className="w-40 px-3 py-2.5 text-right">Jumlah PCS</th>
              <th className="w-16 px-3 py-2.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <select
                    value={row.size}
                    onChange={event => onChange(rows.map(item => item.id === row.id ? { ...item, size: event.target.value } : item))}
                    aria-label={`Ukuran baris ${index + 1}`}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 font-semibold"
                  >
                    <option value="">Pilih ukuran</option>
                    {masterData.options('jersey_sizes', row.size, preserveLegacySizes).map(size => (
                      <option key={size.id} value={size.code || size.name}>{size.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity || ''}
                    onChange={event => {
                      const quantity = event.target.value === '' ? 0 : Number(event.target.value);
                      onChange(rows.map(item => item.id === row.id ? { ...item, quantity: Number.isFinite(quantity) ? quantity : 0 } : item));
                    }}
                    aria-label={`Jumlah PCS ukuran baris ${index + 1}`}
                    className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-right font-mono font-bold"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button type="button" onClick={() => onChange(rows.filter(item => item.id !== row.id))} aria-label={`Hapus baris ukuran ${index + 1}`} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-400">Belum ada ukuran. Tambahkan baris ukuran.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs">
        <span className="font-semibold text-neutral-700">REKAPITULASI UKURAN</span>
        <span className="text-neutral-600">{recap.length ? recap.map(item => `${item.size}: ${item.quantity}`).join(' · ') : 'Belum ada jumlah ukuran valid'}</span>
        <strong className="font-mono text-[#D71920]">TOTAL {getOrderTotalQuantity('size-quantity', rows)} PCS</strong>
      </div>
    </section>
  );
};
