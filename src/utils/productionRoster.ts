import { PlayerDetail } from '../types/order';
import { getOrderSizeRecap } from './orderSizing';

export interface ProductionRosterGroup {
  size: string;
  quantity: number;
  players: PlayerDetail[];
}

export interface ProductionGroupMeasurement {
  headerHeight: number;
  rowHeights: number[];
  groupHeight: number;
}

export interface ProductionPageGroup {
  groupIndex: number;
  startIndex: number;
  endIndex: number;
}

export function groupProductionRoster(
  inputMode: 'roster' | 'size-quantity',
  players: PlayerDetail[],
): ProductionRosterGroup[] {
  return getOrderSizeRecap(inputMode, players).map(({ size, quantity }) => ({
    size,
    quantity,
    players: inputMode === 'roster'
      ? players.filter(player => player.size.trim().toUpperCase() === size)
      : [],
  }));
}

export function paginateProductionGroups(
  measurements: ProductionGroupMeasurement[],
  availableHeight: number,
): ProductionPageGroup[][] {
  if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
    throw new Error('Area untuk daftar produksi pada halaman A4 tidak mencukupi.');
  }

  const pages: ProductionPageGroup[][] = [];
  let currentPage: ProductionPageGroup[] = [];
  let currentPageHeight = 0;

  const finishPage = () => {
    if (currentPage.length > 0) pages.push(currentPage);
    currentPage = [];
    currentPageHeight = 0;
  };

  measurements.forEach((group, groupIndex) => {
    if (!Number.isFinite(group.groupHeight) || group.groupHeight <= 0) {
      throw new Error(`Tidak dapat mengukur kelompok ukuran ${groupIndex + 1}.`);
    }

    if (group.rowHeights.length === 0) {
      if (group.groupHeight > availableHeight) {
        throw new Error(`Kelompok ukuran ${groupIndex + 1} lebih tinggi dari area cetak satu halaman A4.`);
      }
      if (currentPageHeight + group.groupHeight > availableHeight) finishPage();
      currentPage.push({ groupIndex, startIndex: 0, endIndex: 0 });
      currentPageHeight += group.groupHeight;
      return;
    }

    if (!Number.isFinite(group.headerHeight) || group.headerHeight <= 0
      || group.headerHeight >= availableHeight) {
      throw new Error(`Header kelompok ukuran ${groupIndex + 1} tidak menyisakan ruang untuk roster.`);
    }
    if (group.rowHeights.some(height => !Number.isFinite(height) || height <= 0)) {
      throw new Error(`Tidak dapat mengukur seluruh roster pada kelompok ukuran ${groupIndex + 1}.`);
    }

    const fullGroupHeight = group.headerHeight + group.rowHeights.reduce((total, height) => total + height, 0);
    if (fullGroupHeight <= availableHeight) {
      if (currentPageHeight + fullGroupHeight > availableHeight) finishPage();
      currentPage.push({ groupIndex, startIndex: 0, endIndex: group.rowHeights.length });
      currentPageHeight += fullGroupHeight;
      return;
    }

    if (currentPageHeight > 0) finishPage();

    let startIndex = 0;
    while (startIndex < group.rowHeights.length) {
      const remainingHeight = availableHeight - group.headerHeight;
      let endIndex = startIndex;
      let rowsHeight = 0;

      while (endIndex < group.rowHeights.length
        && rowsHeight + group.rowHeights[endIndex] <= remainingHeight) {
        rowsHeight += group.rowHeights[endIndex];
        endIndex += 1;
      }

      if (endIndex === startIndex) {
        throw new Error(`Roster pada kelompok ukuran ${groupIndex + 1} memiliki baris yang lebih tinggi dari area cetak A4.`);
      }

      currentPage.push({ groupIndex, startIndex, endIndex });
      currentPageHeight = group.headerHeight + rowsHeight;
      startIndex = endIndex;
      if (startIndex < group.rowHeights.length) finishPage();
    }
  });

  finishPage();
  return pages.length > 0 ? pages : [[]];
}
