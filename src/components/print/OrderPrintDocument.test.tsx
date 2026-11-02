import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Order } from '../../types/order';
import { OrderPrintDocument } from './OrderPrintDocument';

const createOrder = (players: Order['players'], inputMode: Order['inputMode']): Order => ({
  id: 'pdf-test-order',
  orderNumber: 'MPCJR-1126-0001',
  salesChannel: 'Offline',
  customer: {
    name: 'TEST TEAM',
    phone: '0800000000',
    orderDate: '2026-11-01',
    orderNumber: 'MPCJR-1126-0001',
  },
  product: {
    productType: 'Jersey Sublime',
    material: 'Milano',
    color: 'Hitam',
    model: 'Reguler Fit',
    sleeve: 'Pendek',
    rib: 'Tidak Pakai Rib',
    totalQuantity: players.reduce((total, player) => total + player.quantity, 0),
    unitPrice: 100000,
    totalPrice: 0,
    downPayment: 0,
    remainingPayment: 0,
  },
  inputMode,
  players,
  useTableThreshold: 5,
  printingMachines: [],
  designs: [],
  collar: { modelName: 'POLO KANCING 2' },
  notes: '',
  productionStatus: 'DRAFT',
  signoff: {
    designerName: '',
    designerInitial: '',
    pressSigned: false,
    cuttingSigned: false,
    jahitSigned: false,
  },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

test('PDF shows roster only in the grouped production list', () => {
  const order = createOrder([
    { id: 's-1', name: 'BUDI', number: '10', size: 'S', quantity: 1, sleeve: 'Pendek' },
    { id: 'm-1', name: 'ANDI', number: '7', size: 'M', quantity: 1, sleeve: 'Panjang' },
  ], 'roster');
  const html = renderToStaticMarkup(createElement(OrderPrintDocument, { order, mode: 'preview' }));
  const printedPages = html.slice(0, html.indexOf('<div aria-hidden="true"'));

  assert.match(printedPages, /DAFTAR PRODUKSI BERDASARKAN UKURAN/);
  assert.match(printedPages, /KELOMPOK UKURAN S/);
  assert.match(printedPages, /KELOMPOK UKURAN M/);
  assert.equal(printedPages.match(/BUDI/g)?.length, 1);
  assert.equal(printedPages.match(/ANDI/g)?.length, 1);
  assert.doesNotMatch(printedPages, /RINCIAN PEMAIN & KEBUTUHAN PRODUKSI/);
  assert.doesNotMatch(printedPages, /FORM ORDER SUBLIME — DETAIL UKURAN/);
});

test('PDF lists size quantities without rendering player-name rows for nameless orders', () => {
  const order = createOrder([
    { id: 'size-s', name: '', number: '', size: 'S', quantity: 2 },
    { id: 'size-m', name: '', number: '', size: 'M', quantity: 1 },
  ], 'size-quantity');
  const html = renderToStaticMarkup(createElement(OrderPrintDocument, { order, mode: 'preview' }));

  assert.match(html, /KELOMPOK UKURAN S/);
  assert.match(html, /KELOMPOK UKURAN M/);
  assert.match(html, /Total PCS/);
  assert.doesNotMatch(html, /Nama Pemain/);
});
