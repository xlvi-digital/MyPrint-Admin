import React from 'react';
import { PrintingMachine } from '../../types/order';
import { Printer, Plus, Trash2 } from 'lucide-react';

interface PrintingTableProps {
  machines: PrintingMachine[];
  onChange: (machines: PrintingMachine[]) => void;
}

const COMMON_SUBLIME_MACHINES = [
  'MESIN EPSON F7270',
  'MESIN EPSON F9470',
  'MESIN EPSON F6370',
  'MESIN MIMAKI TS100-1600',
  'MESIN FEDAR FD1900',
  'MESIN MUTOH DRAFTSTATION',
];

export const PrintingTable: React.FC<PrintingTableProps> = ({
  machines,
  onChange,
}) => {
  const handleUpdate = (id: string, name: string) => {
    onChange(machines.map(m => (m.id === id ? { ...m, name } : m)));
  };

  const handleAdd = () => {
    const newMachine: PrintingMachine = {
      id: `m-${Date.now()}`,
      name: COMMON_SUBLIME_MACHINES[0],
    };
    onChange([...machines, newMachine]);
  };

  const handleDelete = (id: string) => {
    if (machines.length <= 1) {
      onChange([{ id: `m-${Date.now()}`, name: '' }]);
      return;
    }
    onChange(machines.filter(m => m.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#D71920]" />
            <span>Alokasi Mesin Printing Sublime</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Daftar printer sublimasi yang ditugaskan untuk cetak transfer paper pesanan ini.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tambah Mesin</span>
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-neutral-100/90 text-neutral-700 font-bold border-b border-neutral-200">
              <th className="py-2 px-3 w-12 text-center">No</th>
              <th className="py-2 px-3">Nama / Tipe Mesin Printing</th>
              <th className="py-2 px-3 w-16 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 bg-white">
            {machines.map((machine, index) => (
              <tr key={machine.id} className="hover:bg-neutral-50/50">
                <td className="py-2 px-3 text-center font-mono font-bold text-neutral-500">
                  {index + 1}
                </td>
                <td className="py-1 px-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={machine.name}
                      onChange={e => handleUpdate(machine.id, e.target.value)}
                      placeholder="Nama Mesin (Contoh: MESIN EPSON F7270)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] focus:bg-white outline-none font-medium font-mono text-xs text-neutral-900 uppercase"
                    />
                  </div>
                </td>
                <td className="py-1 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(machine.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-neutral-400 mt-2">
        Default 5 baris alokasi mesin untuk pembagian batch cetak workshop.
      </p>
    </div>
  );
};
