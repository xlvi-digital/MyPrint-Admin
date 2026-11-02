import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerDetail } from '../types/order';
import { paginateRosterPlayersByHeight } from './rosterPagination';

function players(count: number): PlayerDetail[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    number: String(index + 1),
    size: 'M',
    quantity: 1,
  }));
}

test('paginates small rosters, 20–30 rows, and multi-page rosters without losing rows', () => {
  const scenarios = [
    { count: 10, rowHeight: 40, capacity: 500, expectedPages: 1 },
    { count: 25, rowHeight: 40, capacity: 520, expectedPages: 2 },
    { count: 50, rowHeight: 40, capacity: 800, expectedPages: 3 },
  ];

  for (const scenario of scenarios) {
    const roster = players(scenario.count);
    const pages = paginateRosterPlayersByHeight(
      roster,
      roster.map(() => scenario.rowHeight),
      scenario.capacity
    );
    const paginatedPlayers = pages.flat();

    assert.equal(pages.length, scenario.expectedPages);
    assert.deepEqual(paginatedPlayers.map(item => item.player.id), roster.map(player => player.id));
    pages.forEach(page => {
      const pageHeight = page.reduce((height, item) => height + scenario.rowHeight, 0);
      assert.ok(pageHeight <= scenario.capacity);
    });
  }
});

test('rejects a single roster row that cannot fit on an A4 detail page', () => {
  assert.throws(
    () => paginateRosterPlayersByHeight(players(1), [501], 500),
    /lebih tinggi dari area cetak satu halaman A4/
  );
});
