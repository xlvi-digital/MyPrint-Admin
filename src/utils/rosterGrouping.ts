import { PlayerDetail } from '../types/order';

export const ROSTER_SIZE_GROUP_ORDER = [
  'Belum ditentukan',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'Ukuran lainnya',
] as const;

export type RosterSizeGroup = typeof ROSTER_SIZE_GROUP_ORDER[number];

export const ROSTER_SIZE_RECAP_ORDER: RosterSizeGroup[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'Ukuran lainnya',
  'Belum ditentukan',
];

export const getRosterSizeGroup = (sizeValue?: string): RosterSizeGroup => {
  const size = sizeValue?.trim().toUpperCase() || '';
  if (!size || size === '-') return 'Belum ditentukan';
  switch (size) {
    case 'XS':
    case 'S':
    case 'M':
    case 'L':
    case 'XL':
      return size;
    case '2XL':
    case 'XXL':
      return 'XXL';
    case '3XL':
    case 'XXXL':
      return 'XXXL';
  }
  return 'Ukuran lainnya';
};

export interface GroupedRosterPlayer {
  player: PlayerDetail;
  originalIndex: number;
  group: RosterSizeGroup;
}

export const groupRosterPlayers = (players: PlayerDetail[]): GroupedRosterPlayer[] =>
  players.map((player, originalIndex) => ({
    player,
    originalIndex,
    group: getRosterSizeGroup(player.size),
  })).sort((left, right) =>
    ROSTER_SIZE_GROUP_ORDER.indexOf(left.group) - ROSTER_SIZE_GROUP_ORDER.indexOf(right.group)
      || left.originalIndex - right.originalIndex,
  );

export const getRosterSizeTotals = (players: PlayerDetail[]): Partial<Record<RosterSizeGroup, number>> =>
  groupRosterPlayers(players).reduce<Partial<Record<RosterSizeGroup, number>>>((totals, item) => {
    totals[item.group] = (totals[item.group] || 0) + Math.max(0, Number(item.player.quantity) || 0);
    return totals;
  }, {});

export const getRosterTotalQuantity = (players: PlayerDetail[]): number =>
  players.reduce((total, player) => total + Math.max(0, Number(player.quantity) || 0), 0);
