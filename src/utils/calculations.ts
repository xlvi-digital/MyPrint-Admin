import { Order, SizeRecapItem, STANDARD_SIZES } from '../types/order';

/**
 * Calculates aggregate size recap across a list of orders (or a single order)
 */
export function calculateSizeRecap(orders: Order[], configuredSizes: string[] = STANDARD_SIZES): {
  recap: SizeRecapItem[];
  totalQty: number;
} {
  const sizeMap: Record<string, number> = {};

  // Initialize standard sizes
  STANDARD_SIZES.filter(s => s !== 'Custom').forEach(s => {
    sizeMap[s] = 0;
  });

  let totalQty = 0;

  for (const order of orders) {
    if (order.players && order.players.length > 0) {
      for (const player of order.players) {
        const size = (player.size || 'L').toUpperCase();
        const qty = Number(player.quantity) || 1;
        sizeMap[size] = (sizeMap[size] || 0) + qty;
        totalQty += qty;
      }
    } else {
      // If no player detail table, bucket under 'ALL SIZE' or standard 'L'
      const orderQty = order.product?.totalQuantity || 0;
      sizeMap['L'] = (sizeMap['L'] || 0) + orderQty;
      totalQty += orderQty;
    }
  }

  // Format into ordered list
  const recap: SizeRecapItem[] = Object.entries(sizeMap)
    .filter(([_, qty]) => qty > 0)
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

  // Check player count vs total order
  if (order.players && order.players.length > 0) {
    const tableTotal = order.players.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    if (tableTotal !== order.product.totalQuantity) {
      const diff = order.product.totalQuantity - tableTotal;
      issues.push(
        diff > 0
          ? `Data ukuran kurang ${diff} pcs dari total order`
          : `Data ukuran berlebih ${Math.abs(diff)} pcs dari total order`
      );
    }
  }

  if (!order.designs || order.designs.length === 0) {
    issues.push('File visual desain belum diupload');
  }

  return {
    isComplete: issues.length === 0,
    issues,
  };
}
