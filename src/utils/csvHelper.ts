import { PlayerDetail } from '../types/order';

export interface CsvParseResult {
  success: boolean;
  data: Omit<PlayerDetail, 'id'>[];
  errors: string[];
}

export function parsePlayerCsv(csvText: string): CsvParseResult {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  const data: Omit<PlayerDetail, 'id'>[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    return { success: false, data: [], errors: ['File atau teks CSV kosong'] };
  }

  // Detect delimiter (, or ;)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  // Check if first line is header
  let startIndex = 0;
  const firstRowCols = firstLine.split(delimiter).map(c => c.trim().toLowerCase());
  if (
    firstRowCols.some(c => c.includes('nama') || c.includes('name') || c.includes('punggung') || c.includes('ukuran') || c.includes('size'))
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 3) {
      errors.push(`Baris ${i + 1}: Data kurang lengkap (minimal Nama, No Punggung, Ukuran)`);
      continue;
    }

    const name = cols[0] || '';
    const number = cols[1] || '';
    const size = cols[2] ? cols[2].toUpperCase() : 'L';
    const quantity = cols[3] && !isNaN(Number(cols[3])) && Number(cols[3]) > 0 ? Number(cols[3]) : 1;
    const notes = cols[4] || '';
    const importedSleeve = cols[5]?.toLowerCase().includes('panjang') ? 'Panjang'
      : cols[5]?.toLowerCase().includes('pendek') ? 'Pendek'
      : undefined;

    data.push({
      name,
      number,
      size,
      quantity,
      notes,
      sleeve: importedSleeve,
    });
  }

  return {
    success: data.length > 0,
    data,
    errors,
  };
}

export function exportPlayersToCsv(players: PlayerDetail[], orderNumber: string): void {
  const headers = ['No', 'Nama', 'No Punggung', 'Ukuran', 'Qty', 'Catatan', 'Jenis Lengan'];
  const rows = players.map((p, idx) => [
    idx + 1,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.number || '').replace(/"/g, '""')}"`,
    `"${(p.size || '').replace(/"/g, '""')}"`,
    p.quantity || 1,
    `"${(p.notes || '').replace(/"/g, '""')}"`,
    `"${(p.sleeve || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Detail_Ukuran_${orderNumber || 'Order'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SAMPLE_CSV_TEMPLATE = `Nama,No Punggung,Ukuran,Qty,Catatan,Jenis Lengan
BUDI,10,M,1,,Pendek
ANDI,7,L,1,,Pendek
RIZKY,9,XL,1,Kiper,Panjang
FAHMI,12,XXL,1,,Pendek
ILHAM,4,L,1,,Pendek
DENI,8,M,1,,Pendek
AGUS,11,L,1,,Pendek
YUSUF,5,XL,1,,Pendek
HENDRA,2,S,1,,Pendek
SURYA,23,M,1,,Pendek`;
