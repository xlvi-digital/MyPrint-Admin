import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderSizeRecap, getOrderTotalQuantity, resolveOrderInputMode } from './orderSizing';

test('roster total counts valid jersey rows, not blank or partially sized entries', () => {
  const players = [
    { id: 'one', name: 'A', number: '1', size: '2A', quantity: 5 },
    { id: 'two', name: 'B', number: '', size: 'M', quantity: 1 },
    { id: 'blank', name: '', number: '', size: 'L', quantity: 1 },
    { id: 'missing-size', name: 'C', number: '3', size: '', quantity: 1 },
  ];

  assert.equal(getOrderTotalQuantity('roster', players), 2);
  assert.deepEqual(getOrderSizeRecap('roster', players), [
    { size: '2A', quantity: 1 },
    { size: 'M', quantity: 1 },
  ]);
});

test('10-player roster and child/adult sizes remain separate in the recap', () => {
  const players = Array.from({ length: 10 }, (_, index) => ({
    id: `${index}`,
    name: `Player ${index + 1}`,
    number: String(index + 1),
    size: index < 3 ? '2A' : 'M',
    quantity: 1,
  }));
  assert.equal(getOrderTotalQuantity('roster', players), 10);
  assert.deepEqual(getOrderSizeRecap('roster', players), [
    { size: '2A', quantity: 3 },
    { size: 'M', quantity: 7 },
  ]);
});

test('size quantity totals include only rows with a size and positive integer quantity', () => {
  const rows = [
    { id: 's', name: '', number: '', size: 'S', quantity: 5 },
    { id: 'm', name: '', number: '', size: 'M', quantity: 10 },
    { id: 'l', name: '', number: '', size: 'L', quantity: 15 },
    { id: 'invalid-size', name: '', number: '', size: '', quantity: 7 },
    { id: 'invalid-qty', name: '', number: '', size: 'XL', quantity: 0 },
  ];
  assert.equal(getOrderTotalQuantity('size-quantity', rows), 30);
  assert.deepEqual(getOrderSizeRecap('size-quantity', rows), [
    { size: 'S', quantity: 5 },
    { size: 'M', quantity: 10 },
    { size: 'L', quantity: 15 },
  ]);

  const edited = rows.map(row => row.id === 'm' ? { ...row, quantity: 4 } : row).filter(row => row.id !== 'l');
  assert.equal(getOrderTotalQuantity('size-quantity', edited), 9);
});

test('child and adult sizes retain a stable distinct recap order', () => {
  const rows = ['M', '16A', '2A', 'XL', '10A'].map((size, index) => ({
    id: `${index}`,
    name: '',
    number: '',
    size,
    quantity: 1,
  }));
  assert.deepEqual(getOrderSizeRecap('size-quantity', rows).map(item => item.size), ['2A', '10A', '16A', 'M', 'XL']);
});

test('selected size filters recalculate recap and PCS without modifying source rows', () => {
  const rows = [
    { id: 's1', name: '', number: '', size: 'S', quantity: 5 },
    { id: 'm1', name: '', number: '', size: 'M', quantity: 10 },
    { id: 'm2', name: '', number: '', size: 'M', quantity: 2 },
  ];
  const filtered = rows.filter(row => ['M'].includes(row.size));
  assert.equal(getOrderTotalQuantity('size-quantity', filtered), 12);
  assert.deepEqual(getOrderSizeRecap('size-quantity', filtered), [{ size: 'M', quantity: 12 }]);
  assert.equal(rows.length, 3);
});

test('legacy orders with nameless size rows reopen using size-quantity input', () => {
  assert.equal(resolveOrderInputMode(undefined, [
    { id: 'size', name: '', number: '', size: 'S', quantity: 3 },
  ]), 'size-quantity');
  assert.equal(resolveOrderInputMode(undefined, [
    { id: 'player', name: 'A', number: '1', size: 'S', quantity: 1 },
  ]), 'roster');
});
