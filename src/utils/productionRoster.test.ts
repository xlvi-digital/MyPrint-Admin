import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerDetail } from '../types/order';
import {
  groupProductionRoster,
  paginateProductionGroups,
  ProductionGroupMeasurement,
} from './productionRoster';

const rosterPlayer = (id: string, size: string): PlayerDetail => ({
  id,
  name: id,
  number: id,
  size,
  quantity: 1,
});

test('production groups follow child and adult master size order and retain roster data', () => {
  const players = [
    rosterPlayer('Adult', 'M'),
    rosterPlayer('Child large', '16A'),
    rosterPlayer('Child small', '2A'),
  ];

  assert.deepEqual(groupProductionRoster('roster', players).map(group => group.size), ['2A', '16A', 'M']);
  assert.deepEqual(groupProductionRoster('roster', players).map(group => group.players.map(player => player.id)), [
    ['Child small'],
    ['Child large'],
    ['Adult'],
  ]);
});

test('all child and adult sizes, including a one-piece final size, become separate production groups', () => {
  const sizes = ['2A', '4A', 'S', 'M', 'L', 'XL', 'XXL'];
  const players = sizes.map((size, index) => rosterPlayer(`Player ${index + 1}`, size));
  const groups = groupProductionRoster('roster', players);

  assert.deepEqual(groups.map(group => group.size), sizes);
  assert.deepEqual(groups.map(group => group.quantity), [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(groups.flatMap(group => group.players), players);
});

test('production grouping includes sizes outside the built-in size list', () => {
  const players = [rosterPlayer('Known', 'S'), rosterPlayer('Master custom', '5XL')];
  const groups = groupProductionRoster('roster', players);

  assert.deepEqual(groups.map(group => group.size), ['S', '5XL']);
  assert.equal(groups.reduce((total, group) => total + group.quantity, 0), players.length);
});

test('roster PDF filters select only matching groups while all sizes remain available after reset', () => {
  const players = [
    rosterPlayer('S1', 'S'),
    rosterPlayer('M1', 'M'),
    rosterPlayer('M2', 'M'),
    rosterPlayer('L1', 'L'),
  ];
  const filteredGroups = (sizes: string[]) =>
    groupProductionRoster('roster', players.filter(player => sizes.includes(player.size)));
  const allGroups = groupProductionRoster('roster', players);

  assert.deepEqual(filteredGroups(['S']).map(group => group.size), ['S']);
  assert.deepEqual(filteredGroups(['M', 'L']).map(group => group.size), ['M', 'L']);
  assert.deepEqual(allGroups.map(group => group.size), ['S', 'M', 'L']);
  assert.equal(allGroups.reduce((total, group) => total + group.quantity, 0), players.length);
  assert.equal(players.length, 4);
});

test('size-quantity orders show grouped quantities without player rows', () => {
  const groups = groupProductionRoster('size-quantity', [
    { ...rosterPlayer('M1', 'M'), name: '', number: '', quantity: 3 },
    { ...rosterPlayer('M2', 'M'), name: '', number: '', quantity: 2 },
    { ...rosterPlayer('S', 'S'), name: '', number: '', quantity: 4 },
  ]);

  assert.deepEqual(groups, [
    { size: 'S', quantity: 4, players: [] },
    { size: 'M', quantity: 5, players: [] },
  ]);
});

test('filtered production groups contain only selected sizes and totals return to all sizes on reset', () => {
  const players = [
    { ...rosterPlayer('S', 'S'), name: '', number: '', quantity: 3 },
    { ...rosterPlayer('M', 'M'), name: '', number: '', quantity: 2 },
    { ...rosterPlayer('L', 'L'), name: '', number: '', quantity: 2 },
  ];
  const filteredGroups = (sizes: string[]) => groupProductionRoster(
    'size-quantity',
    players.filter(player => sizes.includes(player.size)),
  );
  const total = (groups: ReturnType<typeof filteredGroups>) =>
    groups.reduce((sum, group) => sum + group.quantity, 0);

  const sizeS = filteredGroups(['S']);
  const sizesMAndL = filteredGroups(['M', 'L']);
  const allSizes = groupProductionRoster('size-quantity', players);

  assert.deepEqual(sizeS.map(group => group.size), ['S']);
  assert.equal(total(sizeS), 3);
  assert.deepEqual(sizesMAndL.map(group => group.size), ['M', 'L']);
  assert.equal(total(sizesMAndL), 4);
  assert.deepEqual(allSizes.map(group => group.size), ['S', 'M', 'L']);
  assert.equal(total(allSizes), 7);
  assert.equal(players.length, 3);
});

test('production pagination keeps groups together when they fit and splits long groups', () => {
  const measurements: ProductionGroupMeasurement[] = [
    { groupHeight: 40, headerHeight: 10, rowHeights: [] },
    { groupHeight: 55, headerHeight: 15, rowHeights: [20, 20] },
    { groupHeight: 75, headerHeight: 15, rowHeights: [20, 20, 20, 20] },
  ];

  assert.deepEqual(paginateProductionGroups(measurements, 60), [
    [
      { groupIndex: 0, startIndex: 0, endIndex: 0 },
    ],
    [
      { groupIndex: 1, startIndex: 0, endIndex: 2 },
    ],
    [
      { groupIndex: 2, startIndex: 0, endIndex: 2 },
    ],
    [
      { groupIndex: 2, startIndex: 2, endIndex: 4 },
    ],
  ]);
});

test('production pagination rejects a roster row that cannot fit on a page', () => {
  assert.throws(
    () => paginateProductionGroups([
      { groupHeight: 150, headerHeight: 20, rowHeights: [120] },
    ], 100),
    /lebih tinggi dari area cetak A4/,
  );
});
