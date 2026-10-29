import React, { useRef, useState } from 'react';
import { PlayerDetail } from '../../types/order';
import { formatSpreadsheetCell, parsePlayerCsv, parsePlayerRows, SAMPLE_CSV_TEMPLATE } from '../../utils/csvHelper';
import { X, FileSpreadsheet, Upload, Check, Copy, AlertCircle, Download } from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedPlayers: PlayerDetail[], mode: 'replace' | 'append') => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose, onImport }) => {
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [copiedSample, setCopiedSample] = useState(false);
  const [parseResult, setParseResult] = useState<ReturnType<typeof parsePlayerCsv> | null>(null);
  const [fileError, setFileError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importLock = useRef(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isLoading || isImporting) return;
    setCsvText('');
    setParseResult(null);
    setFileError('');
    setImportMode('append');
    onClose();
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    setFileError('');
    setParseResult(text.trim() ? parsePlayerCsv(text) : null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsLoading(true);
    setFileError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'csv') {
        handleTextChange(await file.text());
      } else if (extension === 'xlsx') {
        const { default: ExcelJS } = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          setParseResult(null);
          setFileError('Workbook tidak memiliki sheet yang bisa dibaca.');
          return;
        }
        const rows: unknown[][] = [];
        worksheet.eachRow({ includeEmpty: false }, row => {
          const values: unknown[] = [];
          row.eachCell({ includeEmpty: true }, cell => values.push(formatSpreadsheetCell(cell.value, cell.numFmt, cell.text)));
          rows.push(values);
        });
        setCsvText('');
        setParseResult(parsePlayerRows(rows));
      } else {
        setFileError('Format file tidak didukung. Pilih file .xlsx atau .csv.');
      }
    } catch (error) {
      setParseResult(null);
      setFileError(error instanceof Error ? `File tidak dapat dibaca: ${error.message}` : 'File tidak dapat dibaca.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_CSV_TEMPLATE);
      setCopiedSample(true);
      window.setTimeout(() => setCopiedSample(false), 2000);
    } catch (error) {
      setFileError(error instanceof Error ? `Contoh CSV tidak dapat disalin: ${error.message}` : 'Contoh CSV tidak dapat disalin.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Roster');
      worksheet.addRows([
        ['Nama', 'No Punggung', 'Ukuran', 'Qty', 'Catatan', 'Jenis Lengan'],
        ['BUDI', '03', 'M', 1, '', 'Pendek'],
        ['ANDI', '7', 'L', 1, '', 'Pendek'],
      ]);
      worksheet.columns = [{ width: 20 }, { width: 16 }, { width: 12 }, { width: 8 }, { width: 24 }, { width: 16 }];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-roster-myprintin.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFileError(error instanceof Error ? `Template Excel tidak dapat dibuat: ${error.message}` : 'Template Excel tidak dapat dibuat.');
    }
  };

  const updatePlayer = (index: number, field: keyof Omit<PlayerDetail, 'id'>, value: string) => {
    setParseResult(current => {
      if (!current) return current;
      const data = current.data.map((player, playerIndex) => {
        if (playerIndex !== index) return player;
        if (field === 'quantity') return { ...player, quantity: Math.max(1, Number.parseInt(value, 10) || 1) };
        if (field === 'sleeve') {
          const sleeve: PlayerDetail['sleeve'] = value === 'Panjang' || value === 'Pendek' ? value : undefined;
          return { ...player, sleeve };
        }
        return { ...player, [field]: value };
      });
      if (field !== 'quantity') return { ...current, data };
      const invalidQuantityRows = current.invalidQuantityRows.filter(rowIndex => rowIndex !== index);
      return {
        ...current,
        data,
        invalidQuantityRows,
        errors: invalidQuantityRows.length
          ? current.errors
          : current.errors.filter(error => !error.includes('Qty tidak valid')),
      };
    });
  };

  const handleConfirm = () => {
    if (importLock.current || !parseResult?.success || parseResult.data.length === 0 || isLoading) return;
    const invalidRows = new Set(parseResult.invalidQuantityRows);
    const validPlayers = parseResult.data.filter((_player, index) => !invalidRows.has(index));
    if (validPlayers.length === 0) return;
    if (importMode === 'replace' && !window.confirm('Gantikan seluruh roster saat ini dengan data import?')) return;
    importLock.current = true;
    setIsImporting(true);
    try {
      const newPlayers: PlayerDetail[] = validPlayers.map((item, index) => ({
        id: `p-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
        ...item,
      }));
      onImport(newPlayers, importMode);
      const remainingRows = parseResult.data
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => invalidRows.has(index));
      if (remainingRows.length > 0) {
        setParseResult({
          ...parseResult,
          data: remainingRows.map(({ item }) => item),
          invalidQuantityRows: remainingRows.map((_row, index) => index),
        });
        setImportMode('append');
      } else {
        setCsvText('');
        setParseResult(null);
        setFileError('');
        onClose();
      }
    } finally {
      importLock.current = false;
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">Import Data Pemain dari Excel / CSV</h3>
              <p className="text-xs text-neutral-500">Kolom wajib: Nama, No Punggung, Ukuran. Kolom Qty, Catatan, dan Jenis Lengan opsional.</p>
            </div>
          </div>
          <button onClick={resetAndClose} disabled={isLoading || isImporting} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg disabled:opacity-50" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-neutral-600" />
              <span>{isLoading ? 'Membaca file...' : 'Pilih File CSV / Excel'}</span>
              <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileUpload} disabled={isLoading || isImporting} className="hidden" />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900">
                <Download className="w-3.5 h-3.5" /> Unduh Template Excel
              </button>
              <button type="button" onClick={handleCopySample} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900">
                {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSample ? 'Tersalin!' : 'Salin Contoh CSV'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Atau paste teks CSV langsung:</label>
            <textarea rows={4} value={csvText} onChange={event => handleTextChange(event.target.value)} placeholder="Nama,No Punggung,Ukuran,Qty,Catatan,Jenis Lengan&#10;BUDI,03,M,1,,Pendek" className="w-full p-3 text-xs font-mono rounded-xl border border-neutral-300 focus:border-[#D71920] outline-none" />
          </div>

          {fileError && <div role="alert" className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{fileError}</div>}
          {parseResult?.errors.map((error, index) => (
            <div key={`${error}-${index}`} role="status" className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-700">
            <span>Opsi Import:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'append'} onChange={() => setImportMode('append')} className="accent-[#D71920]" />
              <span>Tambahkan ke tabel saat ini (disarankan)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-[#D71920]" />
              <span>Gantikan seluruh tabel</span>
            </label>
          </div>

          {parseResult && (
            <div className="pt-1">
              <div className="text-xs font-bold text-neutral-900 mb-2">Pratinjau yang dapat diedit ({parseResult.data.length} baris)</div>
              {parseResult.invalidQuantityRows.length > 0 && <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">Baris dengan Qty salah ditandai di bawah. Baris valid tetap dapat diimpor; baris yang perlu diperiksa akan tetap tersedia untuk diperbaiki setelahnya.</p>}
              {parseResult.data.length > 0 ? (
                <div className="max-h-64 overflow-auto rounded-xl border border-neutral-200">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-neutral-100 font-bold text-neutral-700 sticky top-0">
                      <tr>{['Status', 'Nama', 'No Punggung', 'Ukuran', 'Qty', 'Catatan', 'Lengan'].map(label => <th key={label} className="py-2 px-2">{label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/70">
                      {parseResult.data.map((item, index) => (
                        <tr key={index} className={`hover:bg-neutral-50 ${parseResult.invalidQuantityRows.includes(index) ? 'bg-amber-50/70' : ''}`}>
                          <td className="py-1 px-2 text-[10px] font-semibold">{parseResult.invalidQuantityRows.includes(index) ? <span className="text-amber-800">Baris {index + 1}: Periksa</span> : <span className="text-emerald-700">Valid</span>}</td>
                          <td className="py-1 px-1"><input aria-label={`Nama baris ${index + 1}`} value={item.name} onChange={event => updatePlayer(index, 'name', event.target.value)} className="w-full min-w-24 rounded border border-neutral-200 px-2 py-1" /></td>
                          <td className="py-1 px-1"><input aria-label={`Nomor baris ${index + 1}`} value={item.number} onChange={event => updatePlayer(index, 'number', event.target.value)} className="w-full min-w-20 rounded border border-neutral-200 px-2 py-1 font-mono" /></td>
                          <td className="py-1 px-1"><input aria-label={`Ukuran baris ${index + 1}`} value={item.size} onChange={event => { const size = event.target.value.toUpperCase(); updatePlayer(index, 'size', size === 'CUSTOM' ? 'Custom' : size); }} className="w-20 rounded border border-neutral-200 px-2 py-1 text-center font-bold" /></td>
                          <td className="py-1 px-1"><input aria-label={`Qty baris ${index + 1}`} type="number" min="1" value={item.quantity} onChange={event => updatePlayer(index, 'quantity', event.target.value)} className="w-16 rounded border border-neutral-200 px-2 py-1 text-center" /></td>
                          <td className="py-1 px-1"><input aria-label={`Catatan baris ${index + 1}`} value={item.notes || '-'} onChange={event => updatePlayer(index, 'notes', event.target.value)} className="w-full min-w-32 rounded border border-neutral-200 px-2 py-1" /></td>
                          <td className="py-1 px-1"><select aria-label={`Lengan baris ${index + 1}`} value={item.sleeve || ''} onChange={event => updatePlayer(index, 'sleeve', event.target.value)} className="w-28 rounded border border-neutral-200 px-2 py-1"><option value="">Default</option><option value="Pendek">Pendek</option><option value="Panjang">Panjang</option></select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">Belum ada data roster yang dapat diimpor.</div>}
            </div>
          )}
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button type="button" onClick={resetAndClose} disabled={isLoading || isImporting} className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 rounded-xl disabled:opacity-50">Batal</button>
          <button type="button" disabled={!parseResult?.success || parseResult.data.length === 0 || parseResult.data.length === parseResult.invalidQuantityRows.length || isLoading || isImporting} onClick={handleConfirm} className="px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm">
            {isImporting ? 'Mengimpor...' : `Import ${parseResult ? parseResult.data.length - parseResult.invalidQuantityRows.length : 0} Baris Valid`}
          </button>
        </div>
      </div>
    </div>
  );
};
