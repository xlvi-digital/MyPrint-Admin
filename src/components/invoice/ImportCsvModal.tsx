import React, { useState } from 'react';
import { PlayerDetail } from '../../types/order';
import { parsePlayerCsv, SAMPLE_CSV_TEMPLATE } from '../../utils/csvHelper';
import { displaySpecialNote } from '../../utils/rosterData';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Check, 
  Copy, 
  AlertCircle, 
  HelpCircle 
} from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedPlayers: PlayerDetail[], mode: 'replace' | 'append') => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [copiedSample, setCopiedSample] = useState(false);
  const [parseResult, setParseResult] = useState<ReturnType<typeof parsePlayerCsv> | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) {
      const result = parsePlayerCsv(text);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_TEMPLATE);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleConfirm = () => {
    if (!parseResult || !parseResult.success || parseResult.data.length === 0) return;

    const newPlayers: PlayerDetail[] = parseResult.data.map((item, index) => ({
      id: `p-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
      name: item.name,
      number: item.number,
      size: item.size,
      quantity: item.quantity,
      notes: item.notes,
      sleeve: item.sleeve,
    }));

    onImport(newPlayers, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">
                Import Data Pemain dari Excel / CSV
              </h3>
              <p className="text-xs text-neutral-500">
                Format: Nama, No Punggung, Ukuran, Qty, Catatan, Jenis Lengan (opsional)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* File upload or paste */}
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-neutral-600" />
              <span>Pilih File CSV / Excel (.csv)</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleCopySample}
              className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
            >
              {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSample ? 'Tersalin!' : 'Salin Contoh Format CSV'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Atau Paste Teks CSV Langsung Disini:
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="BUDI,10,M,1&#10;ANDI,7,L,1&#10;RIZKY,9,XL,1,Kiper"
              className="w-full p-3 text-xs font-mono rounded-xl border border-neutral-300 focus:border-[#D71920] outline-none"
            />
          </div>

          {/* Import Mode: Replace vs Append */}
          <div className="flex items-center gap-4 text-xs font-medium text-neutral-700 pt-1">
            <span>Opsi Import:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="accent-[#D71920]"
              />
              <span>Gantikan tabel saat ini</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="accent-[#D71920]"
              />
              <span>Tambahkan ke tabel yang sudah ada</span>
            </label>
          </div>

          {/* Live Preview of parsed rows */}
          {parseResult && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900">
                  Pratinjau Hasil Parsing ({parseResult.data.length} baris terdeteksi)
                </span>
                {parseResult.errors.length > 0 && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    {parseResult.errors.length} peringatan format
                  </span>
                )}
              </div>

              {parseResult.data.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 font-bold text-neutral-700 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">No</th>
                        <th className="py-2 px-3">Nama</th>
                        <th className="py-2 px-3 text-center">No Punggung</th>
                        <th className="py-2 px-3 text-center">Ukuran</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/70">
                      {parseResult.data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 font-mono text-[11px]">
                          <td className="py-1.5 px-3 text-neutral-400">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-semibold text-neutral-900">
                            {item.name}
                          </td>
                          <td className="py-1.5 px-3 text-center">{item.number}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-[#D71920]">
                            {item.size}
                          </td>
                          <td className="py-1.5 px-3 text-center">{item.quantity}</td>
                          <td className="py-1.5 px-3 text-neutral-500 font-sans">{displaySpecialNote(item.notes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Belum ada data valid yang bisa diekstrak dari format ini.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!parseResult?.success || parseResult.data.length === 0}
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
          >
            {parseResult?.data?.length
              ? `Konfirmasi Import ${parseResult.data.length} Data Pemain`
              : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
