import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SalesOrderFields } from './SalesOrderFields';

const renderFields = (salesChannel: 'Offline' | 'Shopee' | 'Tokopedia', orderNumber = '', externalOrderNumber = '') =>
  renderToStaticMarkup(createElement(SalesOrderFields, {
    salesChannel,
    orderNumber,
    externalOrderNumber,
    onChange: () => undefined,
  }));

test('Offline order number is read-only and explains automatic database allocation', () => {
  const html = renderFields('Offline', 'MPCJR-1126-0001');

  assert.match(html, /readOnly=""/);
  assert.match(html, /value="MPCJR-1126-0001"/);
  assert.match(html, /Dibuat otomatis oleh sistem saat order disimpan/);
  assert.doesNotMatch(html, /Masukkan nomor pesanan Offline/);
});

test('marketplace order numbers remain editable with channel-specific placeholders', () => {
  const shopee = renderFields('Shopee', '', 'SPX-123');
  const tokopedia = renderFields('Tokopedia');

  assert.match(shopee, /value="SPX-123"/);
  assert.match(shopee, /placeholder="Masukkan nomor pesanan Shopee"/);
  assert.match(tokopedia, /placeholder="Masukkan nomor pesanan Tokopedia"/);
  assert.doesNotMatch(tokopedia, /readonly/);
});
