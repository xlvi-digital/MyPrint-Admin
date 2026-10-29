import React, { useRef, useState } from 'react';
import { ClipboardPaste, Check, X, Sparkles, AlertTriangle } from 'lucide-react';
import { parsePastedRosterDetailed, ParsedPastedPlayer, ParsedPastedRosterRow } from '../../services/parserService';
import { PlayerDetail } from '../../types/order';

interface PlayerFastPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (players: PlayerDetail[], mode: 'replace' | 'append') => void;
  defaultSleeve?: string;
}

const SAMPLE_PASTE = `Apriana/4/L
Andi/07/XL (lengan panjang)
Jono (tanpa nama & nomor) (lengan panjang) (L)`;

export const PlayerFastPasteModal: React.FC<PlayerFastPasteModalProps> = ({
  isOpen,
  onClose,
  onApply,
  defaultSleeve = 'Pendek',
}) => {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedPastedRosterRow[]>([]);
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [isApplying, setIsApplying] = useState(false);
  const applyLock = useRef(false);

  if (!isOpen) return null;

  const validRows = rows.filter(row => row.status === 'valid');
  const reviewRows = rows.filter(row => row.status === 'review');
  const longSleeveCount = validRows.filter(row => row.player.sleeve === 'Panjang').length;
  const shortSleeveCount = validRows.filter(row => row.player.sleeve === 'Pendek').length;
  const defaultSleeveCount = validRows.length - longSleeveCount - shortSleeveCount;

  const handleTextChange = (value: string) => {
    setText(value);
    setRows(parsePastedRosterDetailed(value).rows);
  };

  const updatePlayer = (lineNumber: number, field: keyof ParsedPastedPlayer, value: string) => {
    setRows(current => current.map(row => {
      if (row.lineNumber !== lineNumber) return row;
      const sleeve: ParsedPastedPlayer['sleeve'] = value === 'Pendek' || value === 'Panjang' ? value : undefined;
      const player = field === 'quantity'
        ? { ...row.player, quantity: Math.max(1, Number.parseInt(value, 10) || 1) }
        : field === 'sleeve'
          ? { ...row.player, sleeve }
          : { ...row.player, [field]: value };
      return { ...row, player, status: 'valid', reason: undefined };
    }));
  };

  const handleConfirm = () => {
    if (applyLock.current || validRows.length === 0 || isApplying) return;
    if (mode === 'replace' && !window.confirm('Gantikan seluruh roster saat ini dengan baris valid yang dipilih?')) return;

    applyLock.current = true;
    setIsApplying(true);
    try {
      const players: PlayerDetail[] = validRows.map(({ player }, index) => ({
        id: `p-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
        ...player,
      }));
      onApply(players, mode);
      if (reviewRows.length > 0) {
        setRows(reviewRows);
        setText(reviewRows.map(row => row.line).join('\n'));
        setMode('append');
      } else {
        setText('');
        setRows([]);
        onClose();
      }
    } finally {
      applyLock.current = false;
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D71920] flex items-center justify-center font-bold"><ClipboardPaste className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">Paste Cepat Data Pemain</h3>
              <p className="text-[11px] text-neutral-500">Tempel format chat, misalnya Apriana/4/L atau Nama 4 ukuran L.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg" aria-label="Tutup"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700">Data roster dari WhatsApp atau Excel</label>
            <button type="button" onClick={() => handleTextChange(SAMPLE_PASTE)} className="text-[11px] font-semibold text-[#D71920] flex items-center gap-1"><Sparkles className="w-3 h-3" />Contoh Teks</button>
          </div>
          <textarea rows={5} value={text} onChange={event => handleTextChange(event.target.value)} placeholder="Apriana/4/L&#10;Budi/07/XL (lengan panjang)&#10;Jono (catatan) (M)" className="w-full p-3 font-mono text-xs rounded-2xl border border-neutral-200 focus:border-[#D71920] outline-none" />

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-600">
            <span>Metode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="pasteMode" checked={mode === 'append'} onChange={() => setMode('append')} className="accent-[#D71920]" />Tambahkan ke tabel</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="pasteMode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-[#D71920]" />Gantikan seluruh tabel</label>
          </div>

          {rows.length > 0 && (
            <div>
              <div className="text-xs font-bold text-neutral-800 mb-1.5">Hasil parsing: {validRows.length} siap diterapkan · {reviewRows.length} perlu diperiksa</div>
              <div className="mb-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
                Lengan panjang: <strong>{longSleeveCount}</strong> · Lengan pendek: <strong>{shortSleeveCount}</strong> · Default order ({defaultSleeve || 'belum dipilih'}): <strong>{defaultSleeveCount}</strong>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-neutral-200">
                <table className="w-full min-w-[790px] text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 font-bold sticky top-0">
                    <tr>{['Status', 'Nama', 'No', 'Ukuran', 'Qty', 'Lengan', 'Catatan'].map(label => <th key={label} className="py-2 px-2">{label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    {rows.map(row => (
                      <tr key={row.lineNumber} className={row.status === 'review' ? 'bg-amber-50/60' : 'hover:bg-neutral-50'}>
                        <td className="py-1 px-2 text-[10px] font-semibold whitespace-nowrap">
                          {row.status === 'valid' ? <span className="text-emerald-700">Valid</span> : <span className="text-amber-800">Baris {row.lineNumber}: Periksa</span>}
                        </td>
                        <td className="py-1 px-1"><input aria-label={`Nama baris ${row.lineNumber}`} value={row.player.name} onChange={event => updatePlayer(row.lineNumber, 'name', event.target.value)} className="w-full min-w-24 rounded border border-neutral-200 px-2 py-1 font-sans" /></td>
                        <td className="py-1 px-1"><input aria-label={`Nomor baris ${row.lineNumber}`} value={row.player.number} onChange={event => updatePlayer(row.lineNumber, 'number', event.target.value)} className="w-20 rounded border border-neutral-200 px-2 py-1 text-center font-mono" /></td>
                        <td className="py-1 px-1"><input aria-label={`Ukuran baris ${row.lineNumber}`} value={row.player.size} onChange={event => { const size = event.target.value.toUpperCase(); updatePlayer(row.lineNumber, 'size', size === 'CUSTOM' ? 'Custom' : size); }} className="w-16 rounded border border-neutral-200 px-2 py-1 text-center font-bold text-[#D71920]" /></td>
                        <td className="py-1 px-1"><input aria-label={`Qty baris ${row.lineNumber}`} type="number" min="1" value={row.player.quantity} onChange={event => updatePlayer(row.lineNumber, 'quantity', event.target.value)} className="w-14 rounded border border-neutral-200 px-2 py-1 text-center" /></td>
                        <td className="py-1 px-1"><select aria-label={`Lengan baris ${row.lineNumber}`} value={row.player.sleeve || ''} onChange={event => updatePlayer(row.lineNumber, 'sleeve', event.target.value)} className="w-28 rounded border border-neutral-200 px-2 py-1"><option value="">Default ({defaultSleeve || '-'})</option><option value="Pendek">Pendek</option><option value="Panjang">Panjang</option></select></td>
                        <td className="py-1 px-1"><input aria-label={`Catatan baris ${row.lineNumber}`} value={row.player.notes || ''} onChange={event => updatePlayer(row.lineNumber, 'notes', event.target.value)} className="w-full min-w-32 rounded border border-neutral-200 px-2 py-1 font-sans" />{row.reason && <span className="block text-[10px] text-amber-800">{row.reason}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reviewRows.length > 0 && <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Baris bermasalah tetap tersedia di sini. Perbaiki kolomnya untuk menandainya valid; baris valid dapat diterapkan tanpa menutup preview ini.</span></div>}
            </div>
          )}
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-neutral-600 rounded-xl">Batal</button>
          <button disabled={validRows.length === 0 || isApplying} onClick={handleConfirm} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-xs">
            <Check className="w-4 h-4" /><span>{isApplying ? 'Menerapkan...' : `Terapkan ${validRows.length} baris valid`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
