import { PlayerDetail } from '../types/order';

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function formatDateId(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // In case date is DD/MM/YYYY
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateNextLocalOrderNumber(
  existingOrders: readonly { orderNumber: string }[],
  year = new Date().getFullYear(),
  lastUsedSequence = 0,
): string {
  const prefix = `ORD-${year}-`;
  const savedSequence = Number.isSafeInteger(lastUsedSequence)
    ? Math.max(0, lastUsedSequence)
    : 0;
  const highestSequence = existingOrders.reduce((highest, order) => {
    if (!order.orderNumber.startsWith(prefix)) return highest;
    const sequence = Number(order.orderNumber.slice(prefix.length));
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, savedSequence);

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
}

export function cleanWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Returns formatted text summary for small list of players
 * (e.g. "BUDI (10 - M) x1, ANDI (7 - L) x1")
 */
export function formatPlayerSummary(players: PlayerDetail[]): string {
  if (!players || players.length === 0) return '';
  return players
    .map(p => {
      const parts = [];
      if (p.name) parts.push(p.name.trim().toUpperCase());
      if (p.number) parts.push(`#${p.number}`);
      if (p.size) parts.push(`Size ${p.size}`);
      if (p.quantity > 1) parts.push(`x${p.quantity}`);
      return parts.join(' - ');
    })
    .join('\n');
}
