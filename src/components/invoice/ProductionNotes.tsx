import React from 'react';
import { WorkflowSignoff } from '../../types/order';
import { FileText, CheckSquare, Sparkles, Stamp } from 'lucide-react';

interface ProductionNotesProps {
  notes: string;
  onChangeNotes: (notes: string) => void;
  signoff: WorkflowSignoff;
  onChangeSignoff: (signoff: WorkflowSignoff) => void;
}

const COMMON_NOTE_SNIPPETS = [
  'DATA TERPISAH DI HALAMAN BELAKANG',
  'TIDAK PAKAI RIB',
  'ATASAN MILANO',
  'CELANA LOTTO SAKU 1',
  'NOMOR DADA 10CM',
  'LOGO SUBLIME FULL COLOR',
  'TANGAN PAKAI MANSET RIB',
  'KERAH POLO DUA KANCING HIJAU',
];

export const ProductionNotes: React.FC<ProductionNotesProps> = ({
  notes,
  onChangeNotes,
  signoff,
  onChangeSignoff,
}) => {
  const handleInsertSnippet = (snippet: string) => {
    if (!notes.trim()) {
      onChangeNotes(snippet);
    } else if (notes.includes(snippet)) {
      // already contains
      return;
    } else {
      onChangeNotes(`${notes.trim()}\n${snippet}`);
    }
  };

  const updateSignoff = (field: keyof WorkflowSignoff, val: any) => {
    onChangeSignoff({
      ...signoff,
      [field]: val,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D71920]" />
            <span>Keterangan Khusus Produksi & Approval Alur</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Instruksi kerja konveksi yang tertera di dokumen Form Order Sublime & paraf stempel operator.
          </p>
        </div>
      </div>

      {/* Textarea + Preset Snippets */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Instruksi Kerja Bengkel / Keterangan Dokumen
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={e => onChangeNotes(e.target.value)}
            placeholder="DATA TERPISAH DI HALAMAN BELAKANG&#10;TIDAK PAKAI RIB&#10;ATASAN MILANO&#10;CELANA LOTTO SAKU 1"
            className="w-full p-3.5 text-xs font-mono font-bold leading-relaxed tracking-wide text-neutral-900 rounded-xl border border-neutral-200 focus:border-[#D71920] focus:bg-white bg-neutral-50/50 outline-none transition-all uppercase placeholder:font-normal placeholder:text-neutral-400"
          />
        </div>

        {/* Quick Snippet Chips */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D71920]" />
            <span>Klik untuk tambah catatan instan:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_NOTE_SNIPPETS.map(snippet => (
              <button
                key={snippet}
                type="button"
                onClick={() => handleInsertSnippet(snippet)}
                className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-red-50 hover:text-[#D71920] hover:border-red-200 border border-neutral-200/60 rounded-lg transition-all"
              >
                + {snippet}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Workshop Approval Stamps Section (Desainer, Press, Cutting, Jahit) */}
      <div className="mt-5 pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 mb-3 uppercase tracking-wider">
          <Stamp className="w-3.5 h-3.5 text-[#D71920]" />
          <span>Paraf & Stempel Tim Produksi (Sesuai Form Order Sublime)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-neutral-50/70 border border-neutral-200/70">
          {/* Desainer Initial */}
          <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
            <span className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Desainer Layout
            </span>
            <input
              type="text"
              value={signoff.designerInitial || ''}
              onChange={e => updateSignoff('designerInitial', e.target.value.toUpperCase())}
              placeholder="GIAN / INITIAL"
              className="w-full text-xs font-black font-mono tracking-widest text-[#D71920] outline-none uppercase placeholder:text-neutral-300"
            />
          </div>

          {/* Press Status */}
          <label className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition-colors">
            <div>
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Operator Press
              </span>
              <span className={`text-xs font-semibold ${signoff.pressSigned ? 'text-emerald-700' : 'text-neutral-400'}`}>
                {signoff.pressSigned ? 'Sudah Press' : 'Belum Press'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={signoff.pressSigned}
              onChange={e => updateSignoff('pressSigned', e.target.checked)}
              className="w-4 h-4 rounded text-[#D71920] accent-[#D71920] cursor-pointer"
            />
          </label>

          {/* Cutting Status */}
          <label className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition-colors">
            <div>
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Operator Cutting
              </span>
              <span className={`text-xs font-semibold ${signoff.cuttingSigned ? 'text-emerald-700' : 'text-neutral-400'}`}>
                {signoff.cuttingSigned ? 'Pola Dipotong' : 'Belum Cutting'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={signoff.cuttingSigned}
              onChange={e => updateSignoff('cuttingSigned', e.target.checked)}
              className="w-4 h-4 rounded text-[#D71920] accent-[#D71920] cursor-pointer"
            />
          </label>

          {/* Jahit Status */}
          <label className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition-colors">
            <div>
              <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                Operator Jahit
              </span>
              <span className={`text-xs font-semibold ${signoff.jahitSigned ? 'text-emerald-700' : 'text-neutral-400'}`}>
                {signoff.jahitSigned ? 'Selesai Obras' : 'Belum Jahit'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={signoff.jahitSigned}
              onChange={e => updateSignoff('jahitSigned', e.target.checked)}
              className="w-4 h-4 rounded text-[#D71920] accent-[#D71920] cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
