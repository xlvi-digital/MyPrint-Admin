import { Order, PlayerDetail, SizeRecapItem, STANDARD_SIZES } from '../types/order';

export function isValidRosterPlayer(player: PlayerDetail): boolean {
  const size = player.size.trim();
  return Boolean(player.name.trim() && size && size !== '-');
}

export function isValidSizeQuantity(player: PlayerDetail): boolean {
  const size = player.size.trim();
  return Boolean(size && size !== '-' && Number.isInteger(Number(player.quantity)) && Number(player.quantity) > 0);
}

export function resolveOrderInputMode(
  inputMode: Order['inputMode'],
  players: PlayerDetail[],
): NonNullable<Order['inputMode']> {
  if (inputMode) return inputMode;
  return players.length > 0 && players.every(player => !player.name.trim() && !player.number.trim())
    ? 'size-quantity'
    : 'roster';
}

export function getOrderTotalQuantity(
  inputMode: Order['inputMode'],
  players: PlayerDetail[],
): number {
  if (resolveOrderInputMode(inputMode, players) === 'size-quantity') {
    return players.reduce((total, player) =>
      total + (isValidSizeQuantity(player) ? Number(player.quantity) : 0), 0);
  }
  return players.filter(isValidRosterPlayer).length;
}

export function getOrderSizeRecap(
  inputMode: Order['inputMode'],
  players: PlayerDetail[],
): SizeRecapItem[] {
  const resolvedMode = resolveOrderInputMode(inputMode, players);
  const totals = new Map<string, number>();
  players.forEach(player => {
    const size = player.size.trim().toUpperCase();
    if (!size) return;
    if (resolvedMode === 'size-quantity') {
      if (isValidSizeQuantity(player)) totals.set(size, (totals.get(size) || 0) + Number(player.quantity));
    } else if (isValidRosterPlayer(player)) {
      totals.set(size, (totals.get(size) || 0) + 1);
    }
  });

  const configuredSizes = [...STANDARD_SIZES.filter(size => size !== 'Custom')];
  return [...totals.entries()]
    .map(([size, quantity]) => ({ size, quantity }))
    .sort((left, right) => {
      const leftIndex = configuredSizes.indexOf(left.size);
      const rightIndex = configuredSizes.indexOf(right.size);
      if (leftIndex !== -1 || rightIndex !== -1) {
        return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
          - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
      }
      return left.size.localeCompare(right.size);
    });
}
