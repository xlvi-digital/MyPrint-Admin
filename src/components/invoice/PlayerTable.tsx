import React, { useRef } from 'react';
import { PlayerDetail, STANDARD_SIZES } from '../../types/order';
import { 
  Users, 
  Plus, 
  Trash2, 
  Copy, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { exportPlayersToCsv } from '../../utils/csvHelper';

interface PlayerTableProps {
  players: PlayerDetail[];
  onChange: (players: PlayerDetail[]) => void;
  targetTotalQty: number;
  onSyncTotalQty: (computedQty: number) => void;
  defaultSleeve: string;
  onOpenImportCsv: () => void;
  orderNumber: string;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  onChange,
  targetTotalQty,
  onSyncTotalQty,
  defaultSleeve,
  onOpenImportCsv,
  orderNumber,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  // Compute total Qty across rows
  const computedTotalQty = players.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const isQtyMatch = computedTotalQty === targetTotalQty;

  const handleAddRow = (initialData?: Partial<PlayerDetail>) => {
    const newPlayer: PlayerDetail = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: initialData?.name || '',
      number: initialData?.number || '',
      size: initialData?.size || 'L',
      quantity: initialData?.quantity ?? 1,
      notes: initialData?.notes || '',
      sleeve: initialData?.sleeve,
    };
    onChange([...players, newPlayer]);

    // Focus newly added name field after state settles
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll<HTMLInputElement>('input[data-field="name"]');
      if (inputs && inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  };

  const handleUpdateRow = (id: string, field: keyof PlayerDetail, value: any) => {
    const updated = players.map(p => {
      if (p.id === id) {
        return {
          ...p,
          [field]: field === 'quantity' ? Math.max(1, parseInt(value) || 1) : value,
        };
      }
      return p;
    });
    onChange(updated);
  };

  const handleDeleteRow = (id: string) => {
    if (players.length <= 1) {
      // Clear instead of removing last row
      onChange([{ id: `p-${Date.now()}`, name: '', number: '', size: 'L', quantity: 1, notes: '' }]);
      return;
    }
    onChange(players.filter(p => p.id !== id));
  };

  const handleDuplicateRow = (id: string) => {
    const target = players.find(p => p.id === id);
    if (!target) return;
    const duplicated: PlayerDetail = {
      ...target,
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    const index = players.findIndex(p => p.id === id);
    const updated = [...players];
    updated.splice(index + 1, 0, duplicated);
    onChange(updated);
  };

  // Smart keyboard flow:
  // Name [Enter] -> Number [Enter] -> Size [Enter] -> New Row created and focused!
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowId: string,
    field: 'name' | 'number' | 'size' | 'quantity'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentRow = (e.target as HTMLElement).closest('tr');
      if (!currentRow) return;

      if (field === 'name') {
        const nextInput = currentRow.querySelector<HTMLInputElement>('input[data-field="number"]');
        nextInput?.focus();
        nextInput?.select();
      } else if (field === 'number') {
        const nextInput = currentRow.querySelector<HTMLInputElement | HTMLSelectElement>('[data-field="size"]');
        nextInput?.focus();
      } else if (field === 'size') {
        const nextInput = currentRow.querySelector<HTMLInputElement>('input[data-field="quantity"]');
        nextInput?.focus();
        nextInput?.select();
      } else if (field === 'quantity') {
        // Create new row!
        handleAddRow();
      }
    }
  };

  const handleExportCsv = () => {
    exportPlayersToCsv(players, orderNumber || 'Order');
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-neutral-100 gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D71920]" />
            <span>Data Pemain, Nomor Punggung & Detail Ukuran</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Daftar personalisasi nama, nomor dada/punggung, ukuran baju, dan catatan perorangan.
          </p>
        </div>

        {/* Action buttons: Add, Import, Export */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenImportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Import dari Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={players.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddRow()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#D71920] hover:bg-[#b8141a] rounded-xl transition-all shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Baris</span>
          </button>
        </div>
      </div>

      {/* Helper & Keyboard Guide Banner */}
      <div className="p-3 mb-4 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D71920] shrink-0" />
          <span>
            <strong>Smart Input Aktif:</strong> Ketik Nama → <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px] font-mono">Enter</kbd> → No Punggung → <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px] font-mono">Enter</kbd> → Ukuran → <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px] font-mono">Enter</kbd> otomatis buat baris baru.
          </span>
        </div>

        <p className="text-[11px] text-neutral-500">
          Halaman detail dan jumlah pemain per halaman ditata otomatis saat PDF dibuat.
        </p>
      </div>

      {/* Interactive Table Container */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200/80 shadow-xs">
        <table ref={tableRef} className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100/80 text-neutral-700 font-bold border-b border-neutral-200">
              <th className="py-2.5 px-3 w-12 text-center">No</th>
              <th className="py-2.5 px-3 min-w-[160px]">Nama Pemain / Punggung</th>
              <th className="py-2.5 px-3 w-28 text-center">No Punggung</th>
              <th className="py-2.5 px-3 w-28 text-center">Ukuran</th>
              <th className="py-2.5 px-3 w-20 text-center">Qty</th>
              <th className="py-2.5 px-3 w-32 text-center">Jenis Lengan</th>
              <th className="py-2.5 px-3 min-w-[140px]">Catatan Khusus</th>
              <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 bg-white">
            {players.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-neutral-400 text-xs">
                  Belum ada data pemain. Klik <strong>+ Tambah Baris</strong> atau <strong>Import CSV</strong> untuk menambahkan.
                </td>
              </tr>
            ) : (
              players.map((player, index) => (
                <tr 
                  key={player.id} 
                  className="hover:bg-neutral-50/70 transition-colors group"
                >
                  {/* Row Number */}
                  <td className="py-2 px-3 text-center text-neutral-400 font-mono text-[11px] font-semibold">
                    {index + 1}
                  </td>

                  {/* Name Input */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      data-field="name"
                      value={player.name}
                      onChange={e => handleUpdateRow(player.id, 'name', e.target.value.toUpperCase())}
                      onKeyDown={e => handleKeyDown(e, player.id, 'name')}
                      placeholder="CONTOH: BUDI SANTOSO"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-semibold text-neutral-900 transition-all uppercase placeholder:font-normal placeholder:text-neutral-300"
                    />
                  </td>

                  {/* Number Input */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      data-field="number"
                      value={player.number}
                      onChange={e => handleUpdateRow(player.id, 'number', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, player.id, 'number')}
                      placeholder="10 / -"
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-mono font-bold text-neutral-900 transition-all placeholder:text-neutral-300"
                    />
                  </td>

                  {/* Size Input / Autocomplete */}
                  <td className="py-1.5 px-3">
                    <div className="relative">
                      <select
                        data-field="size"
                        value={player.size}
                        onChange={e => handleUpdateRow(player.id, 'size', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, player.id, 'size')}
                        className="w-full text-center px-2 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-bold text-neutral-900 transition-all cursor-pointer"
                      >
                        {STANDARD_SIZES.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Qty Input */}
                  <td className="py-1.5 px-3">
                    <input
                      type="number"
                      min="1"
                      data-field="quantity"
                      value={player.quantity}
                      onChange={e => handleUpdateRow(player.id, 'quantity', e.target.value)}
                      onKeyDown={e => handleKeyDown(e, player.id, 'quantity')}
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-mono font-bold text-neutral-900 transition-all"
                    />
                  </td>

                  <td className="py-1.5 px-3">
                    <select
                      value={player.sleeve || ''}
                      onChange={e => handleUpdateRow(player.id, 'sleeve', e.target.value || undefined)}
                      aria-label={`Jenis lengan untuk ${player.name || `pemain ${index + 1}`}`}
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-semibold text-neutral-800 cursor-pointer"
                    >
                      <option value="">Default ({defaultSleeve || 'Pendek'})</option>
                      <option value="Pendek">Pendek</option>
                      <option value="Panjang">Panjang</option>
                    </select>
                  </td>

                  {/* Player-specific production note */}
                  <td className="py-1.5 px-3">
                    <textarea
                      ref={textarea => {
                        if (textarea) {
                          textarea.style.height = 'auto';
                          textarea.style.height = `${textarea.scrollHeight}px`;
                        }
                      }}
                      rows={1}
                      value={player.notes || ''}
                      onChange={e => handleUpdateRow(player.id, 'notes', e.target.value)}
                      onInput={e => {
                        const textarea = e.currentTarget;
                        textarea.style.height = 'auto';
                        textarea.style.height = `${textarea.scrollHeight}px`;
                      }}
                      aria-label={`Catatan khusus untuk ${player.name || `pemain ${index + 1}`}`}
                      placeholder="Catatan khusus per pemain (opsional)"
                      className="w-full min-w-[140px] px-2.5 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:bg-white outline-none text-neutral-600 transition-all text-xs placeholder:text-neutral-300 resize-y"
                    />
                  </td>

                  {/* Actions: Duplicate, Delete */}
                  <td className="py-1.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleDuplicateRow(player.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                        title="Duplikat Baris"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(player.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Table Verification & Synchronizer */}
      <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/70">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-neutral-500">Total Baris:</span>{' '}
            <strong className="font-mono text-neutral-900">{players.length} item</strong>
          </div>
          <div>
            <span className="text-neutral-500">Total Qty Tabel:</span>{' '}
            <strong className="font-mono text-neutral-900 font-bold">{computedTotalQty} pcs</strong>
          </div>
        </div>

        {/* Validation indicator */}
        <div className="flex items-center gap-3">
          {isQtyMatch ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Jumlah data sudah sesuai ({computedTotalQty} pcs)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Total order ({targetTotalQty} pcs) belum sesuai tabel ({computedTotalQty} pcs)
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSyncTotalQty(computedTotalQty)}
                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
                title="Update Total Order menjadi jumlah tabel"
              >
                Sinkronkan ke Total
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
