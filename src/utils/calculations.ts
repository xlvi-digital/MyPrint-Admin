import { Order, SizeRecapItem, STANDARD_SIZES } from '../types/order';
import { getOrderSizeRecap, getOrderTotalQuantity } from './orderSizing';

/**
 * Calculates aggregate size recap across a list of orders (or a single order)
 */
export function calculateSizeRecap(orders: Order[], configuredSizes: string[] = STANDARD_SIZES): {
  recap: SizeRecapItem[];
  totalQty: number;
} {
  const sizeMap = new Map<string, number>();
  const totalQty = orders.reduce((total, order) => {
    getOrderSizeRecap(order.inputMode, order.players || []).forEach(item => {
      sizeMap.set(item.size, (sizeMap.get(item.size) || 0) + item.quantity);
    });
    return total + getOrderTotalQuantity(order.inputMode, order.players || []);
  }, 0);

  const recap: SizeRecapItem[] = [...sizeMap.entries()]
    .map(([size, quantity]) => ({ size, quantity }))
    .sort((a, b) => {
      const idxA = configuredSizes.indexOf(a.size);
      const idxB = configuredSizes.indexOf(b.size);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.size.localeCompare(b.size);
    });

  return { recap, totalQty };
}

/**
 * Checks if an order is complete or needs attention (missing data, size mismatch, missing design)
 */
export function getOrderCompleteness(order: Order): {
  isComplete: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!order.customer.name) {
    issues.push('Nama pemesan belum diisi');
  }
  if (!order.customer.phone) {
    issues.push('No WhatsApp belum dicatat');
  }
  if (!order.product.material) {
    issues.push('Bahan kain belum ditentukan');
  }
  if (!order.product.totalQuantity || order.product.totalQuantity <= 0) {
    issues.push('Jumlah pesanan masih kosong');
  }

  if (!order.designs || order.designs.length === 0) {
    issues.push('File visual desain belum diupload');
  }

  return {
    isComplete: issues.length === 0,
    issues,
  };
}
