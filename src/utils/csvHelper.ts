import { PlayerDetail } from '../types/order';

export interface CsvParseResult {
  success: boolean;
  data: Omit<PlayerDetail, 'id'>[];
  errors: string[];
  invalidQuantityRows: number[];
}

export function formatSpreadsheetCell(value: unknown, numberFormat?: string, fallbackText?: string): string {
  if (typeof value === 'number' && Number.isInteger(value)) {
    const zeroFormat = numberFormat?.split(';')[0].match(/^0+$/);
    if (zeroFormat) return String(value).padStart(zeroFormat[0].length, '0');
  }
  if (value && typeof value === 'object' && fallbackText !== undefined) return fallbackText;
  return String(value ?? '').trim();
}

type RosterColumn = 'name' | 'number' | 'size' | 'quantity' | 'notes' | 'sleeve';

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<RosterColumn, string[]> = {
  name: ['nama', 'name', 'namapemain', 'player'],
  number: ['nopunggung', 'nomorpunggung', 'nomor', 'nomer', 'number', 'jerseynumber', 'jerseyno', 'nomorjersey', 'nojersey', 'nobaju'],
  size: ['ukuran', 'size', 'jerseysize', 'ukuranjersey'],
  quantity: ['qty', 'quantity', 'jumlah'],
  notes: ['catatan', 'notes', 'note', 'keterangan'],
  sleeve: ['jenislengan', 'lengan', 'sleeve', 'sleevelength'],
};

function detectDelimiter(line: string): string {
  const counts = [',', ';', '\t'].map(delimiter => {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && line[index] === delimiter) {
        count += 1;
      }
    }
    return { delimiter, count };
  });
  return counts.sort((left, right) => right.count - left.count)[0].delimiter;
}

function parseCsvRows(text: string): string[][] {
  const delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] || '');
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      row.push(value.trim());
      value = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  row.push(value.trim());
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

function findHeaderColumns(header: unknown[]): Partial<Record<RosterColumn, number>> {
  const columns: Partial<Record<RosterColumn, number>> = {};
  header.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    const match = (Object.keys(HEADER_ALIASES) as RosterColumn[])
      .find(column => HEADER_ALIASES[column].includes(normalized));
    if (match && columns[match] === undefined) columns[match] = index;
  });
  return columns;
}

export function parsePlayerRows(rows: unknown[][]): CsvParseResult {
  const errors: string[] = [];
  const data: Omit<PlayerDetail, 'id'>[] = [];
  const invalidQuantityRows: number[] = [];
  if (rows.length === 0) return { success: false, data, errors: ['File atau teks CSV kosong'], invalidQuantityRows };

  const headerColumns = findHeaderColumns(rows[0]);
  const hasHeader = Object.keys(headerColumns).length > 0;
  const requiredColumns: RosterColumn[] = ['name', 'number', 'size'];
  const missingColumns = hasHeader
    ? requiredColumns.filter(column => headerColumns[column] === undefined)
    : [];
  if (missingColumns.length) {
    const labels: Record<RosterColumn, string> = {
      name: 'Nama', number: 'No Punggung', size: 'Ukuran',
      quantity: 'Qty', notes: 'Catatan', sleeve: 'Jenis Lengan',
    };
    return {
      success: false,
      data,
      errors: [`Kolom wajib tidak ditemukan: ${missingColumns.map(column => labels[column]).join(', ')}.`],
      invalidQuantityRows,
    };
  }
  if (!hasHeader && (rows[0]?.length ?? 0) < 3) {
    return { success: false, data, errors: ['Kolom wajib minimal Nama, No Punggung, dan Ukuran.'], invalidQuantityRows };
  }

  const sourceRows = rows.slice(hasHeader ? 1 : 0);
  sourceRows.forEach((row, index) => {
    if (!row.some(value => String(value ?? '').trim())) return;
    const valueFor = (column: RosterColumn, fallbackIndex: number) => {
      const position = hasHeader ? headerColumns[column] : fallbackIndex;
      return position === undefined ? '' : String(row[position] ?? '').trim();
    };
    const rawQuantity = valueFor('quantity', 3);
    const numericQuantity = Number(rawQuantity);
    if (rawQuantity && (!Number.isInteger(numericQuantity) || numericQuantity < 1)) {
      errors.push(`Baris ${index + (hasHeader ? 2 : 1)}: Qty tidak valid; gunakan bilangan bulat minimal 1.`);
      invalidQuantityRows.push(data.length);
    }
    const sleeveValue = valueFor('sleeve', 5).toLowerCase();
    const rawSize = valueFor('size', 2);
    const normalizedSize = rawSize.toUpperCase();
    data.push({
      name: valueFor('name', 0) || '-',
      number: valueFor('number', 1) || '-',
      size: normalizedSize === 'CUSTOM' ? 'Custom' : normalizedSize || '-',
      quantity: Number.isInteger(numericQuantity) && numericQuantity > 0 ? numericQuantity : 1,
      notes: valueFor('notes', 4) || '-',
      sleeve: sleeveValue.includes('panjang') ? 'Panjang'
        : sleeveValue.includes('pendek') ? 'Pendek'
        : undefined,
    });
  });
  return {
    success: data.length > 0,
    data,
    errors: data.length ? errors : ['Tidak ada baris roster yang berisi data.'],
    invalidQuantityRows,
  };
}

export function parsePlayerCsv(csvText: string): CsvParseResult {
  if (!csvText.trim()) return { success: false, data: [], errors: ['File atau teks CSV kosong'], invalidQuantityRows: [] };
  return parsePlayerRows(parseCsvRows(csvText));
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
