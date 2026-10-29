import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { parsePastedRosterDetailed } from './parserService';
import { formatSpreadsheetCell, parsePlayerCsv, parsePlayerRows } from '../utils/csvHelper';
import { getRosterSizeTotals, getRosterTotalQuantity, groupRosterPlayers } from '../utils/rosterGrouping';

test('parses slash-delimited roster and retains leading zeroes', () => {
  const result = parsePastedRosterDetailed('Apriana/4/L\nArdann/03/XS\nBudi No. Punggung 08 ukuran M\nRizky/9/Custom');
  assert.deepEqual(result.players.map(player => [player.name, player.number, player.size]), [
    ['Apriana', '4', 'L'],
    ['Ardann', '03', 'XS'],
    ['Budi', '08', 'M'],
    ['Rizky', '9', 'Custom'],
  ]);
  assert.equal(result.issues.length, 0);
});

test('collects notes from multiple parenthetical groups and detects sleeve', () => {
  const result = parsePastedRosterDetailed('Shaka/17/m (baju anak) (Desain kiper merah) (lengan panjang)');
  assert.equal(result.players[0].number, '17');
  assert.equal(result.players[0].size, 'M');
  assert.equal(result.players[0].sleeve, 'Panjang');
  assert.match(result.players[0].notes, /baju anak/i);
  assert.match(result.players[0].notes, /Desain kiper merah/i);
});

test('keeps slashes inside parenthetical notes and does not infer a jersey size from them', () => {
  const result = parsePastedRosterDetailed('Smith/11/ (Lengan panjang, Baju UK "S" / Celana UK "M")');
  assert.equal(result.players[0].size, '-');
  assert.equal(result.players[0].number, '11');
  assert.equal(result.players[0].sleeve, 'Panjang');
  assert.match(result.players[0].notes, /Celana UK "M"/);
});

test('handles ordinal prefixes, unnumbered names, and explicit missing-name notes', () => {
  const result = parsePastedRosterDetailed([
    '1. Budi 10 ukuran M',
    "GTT'RH (Tanpa nomor)/M/(lengan panjang)",
    'Jono (tanpa nama & nomor) (lengan panjang) (L)',
    'Tanpa nama/16/L',
  ].join('\n'));
  assert.equal(result.rows.length, 4);
  assert.deepEqual(result.players.map(player => [player.name, player.number, player.size]), [
    ['Budi', '10', 'M'],
    ["GTT'RH", '-', 'M'],
    ['-', '-', 'L'],
    ['-', '16', 'L'],
  ]);
});

test('leaves uncertain tokens editable and ignores blank lines', () => {
  const result = parsePastedRosterDetailed('\n\nBudi/4/Q\n\nApriana/4/L\n');
  assert.equal(result.rows.length, 2);
  assert.equal(result.issues.length, 1);
  assert.equal(result.rows[0].status, 'review');
  assert.equal(result.rows[0].player.size, '-');
  assert.equal(result.players.length, 1);
});

test('parses quoted CSV, reordered headers, and keeps player numbers as strings', () => {
  const result = parsePlayerCsv('Ukuran;No Punggung;Nama Pemain;Catatan;Qty\nM;03;"Budi, Andi";"Kiper; merah";2');
  assert.equal(result.success, true);
  assert.deepEqual(result.data[0], {
    name: 'Budi, Andi',
    number: '03',
    size: 'M',
    quantity: 2,
    notes: 'Kiper; merah',
    sleeve: undefined,
  });
});

test('uses dash values for blank cells and rejects missing required columns', () => {
  const row = parsePlayerCsv('Nama,No Punggung,Ukuran\nBudi,,');
  assert.equal(row.data[0].number, '-');
  assert.equal(row.data[0].size, '-');
  assert.equal(row.data[0].notes, '-');

  const missingHeaders = parsePlayerCsv('Nama,Ukuran\nBudi,M');
  assert.equal(missingHeaders.success, false);
  assert.match(missingHeaders.errors[0], /No Punggung/);

  assert.equal(parsePlayerCsv('Nama,No Punggung,Ukuran\nBudi,4,custom').data[0].size, 'Custom');
});

test('accepts worksheet rows and reports invalid quantities without dropping roster rows', () => {
  const result = parsePlayerRows([
    ['Nama', 'No Punggung', 'Ukuran', 'Qty'],
    ['Budi', '08', 'L', 'invalid'],
  ]);
  assert.equal(result.success, true);
  assert.equal(result.data[0].number, '08');
  assert.equal(result.data[0].quantity, 1);
  assert.match(result.errors[0], /Qty tidak valid/);
  assert.deepEqual(result.invalidQuantityRows, [0]);
});

test('reads displayed Excel jersey numbers with leading zeroes', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Roster');
  sheet.addRow(['Nama', 'No Punggung', 'Ukuran']);
  const row = sheet.addRow(['Budi', 3, 'M']);
  row.getCell(2).numFmt = '00';
  const source = new ExcelJS.Workbook();
  await source.xlsx.load(await workbook.xlsx.writeBuffer());

  const worksheetRows: unknown[][] = [];
  source.worksheets[0].eachRow({ includeEmpty: false }, sourceRow => {
    const values: unknown[] = [];
    sourceRow.eachCell({ includeEmpty: true }, cell => values.push(formatSpreadsheetCell(cell.value, cell.numFmt, cell.text)));
    worksheetRows.push(values);
  });
  const result = parsePlayerRows(worksheetRows);
  assert.equal(result.data[0].number, '03');
});

test('imports valid rows while identifying invalid quantities for repair', () => {
  const result = parsePlayerCsv([
    'Nama,No Punggung,Ukuran,Qty,Jenis Lengan,Catatan Khusus',
    'Ilham,12,m,10,Pendek,',
    'Apriana,4,L,invalid,,',
    'Fanyy,14,M,2,Pendek,-',
  ].join('\n'));
  assert.equal(result.data.length, 3);
  assert.deepEqual(result.invalidQuantityRows, [1]);
  assert.equal(result.data[0].size, 'M');
  assert.equal(result.data[0].notes, '-');
});

test('groups roster by normalized size while weighting totals by quantity', () => {
  const players = [
    { id: 'a', name: 'Large', number: '1', size: 'l', quantity: 2 },
    { id: 'b', name: 'Missing', number: '2', size: '-', quantity: 1 },
    { id: 'c', name: 'Medium', number: '3', size: 'm', quantity: 4 },
    { id: 'd', name: '3XL', number: '4', size: '3xl', quantity: 3 },
    { id: 'e', name: 'Other', number: '5', size: '4XL', quantity: 1 },
  ];
  assert.deepEqual(groupRosterPlayers(players).map(item => item.group), [
    'Belum ditentukan', 'M', 'L', 'XXXL', 'Ukuran lainnya',
  ]);
  assert.deepEqual(getRosterSizeTotals(players), {
    'Belum ditentukan': 1,
    M: 4,
    L: 2,
    XXXL: 3,
    'Ukuran lainnya': 1,
  });
});

test('size recap normalizes sizes, counts quantity, and follows roster edits and removals', () => {
  const initialPlayers = [
    { id: 'one', name: 'A', number: '1', size: 'm', quantity: 2 },
    { id: 'two', name: 'B', number: '2', size: 'L', quantity: 1 },
    { id: 'three', name: 'C', number: '3', size: '-', quantity: 1 },
  ];
  assert.deepEqual(getRosterSizeTotals(initialPlayers), {
    M: 2,
    L: 1,
    'Belum ditentukan': 1,
  });
  assert.equal(getRosterTotalQuantity(initialPlayers), 4);

  const editedPlayers = initialPlayers
    .map(player => player.id === 'one' ? { ...player, size: 'xl' } : player)
    .filter(player => player.id !== 'two');
  assert.deepEqual(getRosterSizeTotals(editedPlayers), {
    XL: 2,
    'Belum ditentukan': 1,
  });
  assert.equal(getRosterTotalQuantity(editedPlayers), 3);
});
