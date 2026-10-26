import { Order, PlayerDetail } from '../types/order';

export function displaySpecialNote(note?: string | null): string {
  const normalized = note?.trim() || '';
  return normalized && !['null', 'undefined'].includes(normalized.toLowerCase())
    ? normalized
    : '-';
}

export function normalizeRoster(players: PlayerDetail[]): PlayerDetail[] {
  return players.map(player => {
    const notes = player.notes?.trim() || '';
    return {
      ...player,
      name: player.name?.trim() || '',
      number: player.number?.trim() || '',
      size: player.size?.trim() || '',
      quantity: Number(player.quantity) || 1,
      notes: displaySpecialNote(notes) === '-' ? '' : notes,
    };
  });
}

export function formatWhatsAppRoster(order: Order): string {
  const players = normalizeRoster(order.players || []);
  if (players.length === 0) return '';

  const lines = players.flatMap((player, index) => [
    `${index + 1}. ${player.name || 'BELUM DIISI'}`,
    `No. Punggung: ${player.number || '-'}`,
    `Ukuran: ${player.size || '-'}`,
    `Qty: ${player.quantity}`,
    `Lengan: ${player.sleeve || order.product.sleeve || '-'}`,
    `Catatan Khusus: ${displaySpecialNote(player.notes)}`,
  ]);

  return `\n\nROSTER PEMAIN\n${lines.join('\n')}`;
}
