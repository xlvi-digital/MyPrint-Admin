import React, { useState } from 'react';
import { ClipboardPaste, Check, X, Sparkles, AlertTriangle } from 'lucide-react';
import { parsePastedRosterDetailed } from '../../services/parserService';
import { PlayerDetail } from '../../types/order';
import { displaySpecialNote } from '../../utils/rosterData';

interface PlayerFastPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (players: PlayerDetail[], mode: 'replace' | 'append') => void;
  defaultSleeve?: string;
}

const SAMPLE_PASTE = `BUDI 10 M
ANDI 7 L
RIZKY 9 XL
FAHMI 12 XXL
ILHAM 4 L
DENI 8 M
AGUS 11 L
YUSUF 5 XL`;

export const PlayerFastPasteModal: React.FC<PlayerFastPasteModalProps> = ({
  isOpen,
  onClose,
  onApply,
  defaultSleeve = 'Pendek',
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('append');

  if (!isOpen) return null;

  const parseResult = parsePastedRosterDetailed(text);
  const parsed = parseResult.players;
  const longSleeveCount = parsed.filter(player => player.sleeve === 'Panjang').length;
  const shortSleeveCount = parsed.filter(player => player.sleeve === 'Pendek').length;
  const defaultSleeveCount = parsed.length - longSleeveCount - shortSleeveCount;

  const handleConfirm = () => {
    if (parsed.length === 0) return;
    const playerDetails: PlayerDetail[] = parsed.map((p, idx) => ({
      id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: p.name,
      number: p.number,
      size: p.size,
      quantity: p.quantity,
      notes: p.notes,
      sleeve: p.sleeve,
    }));
    onApply(playerDetails, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D71920] flex items-center justify-center font-bold">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">
                Paste Cepat Data Pemain
              </h3>
              <p className="text-[11px] text-neutral-400">
                Tempel daftar nama, nomor, dan ukuran (dari WhatsApp atau Excel)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700">
              Format: No. Nama No Punggung ukuran Ukuran [lengan] [catatan]
            </label>
            <button
              type="button"
              onClick={() => setText(SAMPLE_PASTE)}
              className="text-[11px] font-semibold text-[#D71920] flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Contoh Teks</span>
            </button>
          </div>

          <textarea
            rows={5}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="1. Andi 10 ukuran M&#10;2. Bayu 4 ukuran XL panjang bahan berbeda"
            className="w-full p-3 font-mono text-xs rounded-2xl border border-neutral-200 focus:border-[#D71920] outline-none"
          />

          {/* Mode Selector */}
          <div className="flex items-center gap-4 text-xs font-medium text-neutral-600">
            <span>Metode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pasteMode"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="accent-[#D71920]"
              />
              <span>Tambahkan ke tabel</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pasteMode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="accent-[#D71920]"
              />
              <span>Gantikan seluruh tabel</span>
            </label>
          </div>

          {/* Preview */}
          {(parsed.length > 0 || parseResult.issues.length > 0) && (
            <div>
              <div className="text-xs font-bold text-neutral-800 mb-1.5">
                Hasil parsing: {parsed.length} berhasil dibaca · {parseResult.issues.length} perlu diperiksa
              </div>
              <div className="mb-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
                Lengan panjang: <strong>{longSleeveCount}</strong> · Lengan pendek: <strong>{shortSleeveCount}</strong> ·
                Default order ({defaultSleeve || 'belum dipilih'}): <strong>{defaultSleeveCount}</strong>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-200">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-1 px-2 text-center w-8">#</th>
                      <th className="py-1 px-2">Nama</th>
                      <th className="py-1 px-2 text-center w-16">No</th>
                      <th className="py-1 px-2 text-center w-16">Ukuran</th>
                      <th className="py-1 px-2 text-center">Lengan</th>
                      <th className="py-1 px-2">Catatan Khusus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60 font-semibold">
                    {parsed.map((p, i) => (
                      <tr key={i} className="hover:bg-neutral-50 text-[11px]">
                        <td className="py-1 px-2 text-center text-neutral-400">{i + 1}</td>
                        <td className="py-1 px-2 font-sans font-bold">{p.name}</td>
                        <td className="py-1 px-2 text-center">{p.number}</td>
                        <td className="py-1 px-2 text-center text-[#D71920]">{p.size}</td>
                        <td className="py-1 px-2 text-center">{p.sleeve || `Default (${defaultSleeve || '-'})`}</td>
                        <td className="py-1 px-2 font-sans font-normal">{displaySpecialNote(p.notes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.issues.length > 0 && (
                <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  {parseResult.issues.map(issue => (
                    <div key={`${issue.lineNumber}-${issue.line}`} className="flex gap-2 text-[11px] text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <strong>Baris {issue.lineNumber} perlu diperiksa:</strong> {issue.reason}
                        <span className="block font-mono">{issue.line}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-neutral-600 rounded-xl">
            Batal
          </button>
          <button
            disabled={parsed.length === 0 || parseResult.issues.length > 0}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan ({parsed.length} Pemain)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
