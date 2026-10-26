import { PlayerDetail } from '../types/order';

export interface RosterPageItem {
  player: PlayerDetail;
  index: number;
}

export function paginateRosterPlayersByHeight(
  players: PlayerDetail[],
  rowHeights: number[],
  availableHeight: number
): RosterPageItem[][] {
  const pages: RosterPageItem[][] = [];
  let currentPage: RosterPageItem[] = [];
  let currentPageHeight = 0;

  players.forEach((player, index) => {
    const rowHeight = rowHeights[index];
    if (!Number.isFinite(rowHeight) || rowHeight <= 0) {
      throw new Error(`Tidak dapat mengukur tinggi baris roster pemain ${index + 1}.`);
    }

    if (currentPage.length > 0 && currentPageHeight + rowHeight > availableHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentPageHeight = 0;
    }

    currentPage.push({ player, index });
    currentPageHeight += rowHeight;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

export function measureRosterPages(
  container: HTMLElement,
  players: PlayerDetail[]
): RosterPageItem[][] {
  if (players.length === 0) return [];

  const detailPages = Array.from(container.querySelectorAll<HTMLElement>('.print-page')).slice(1);
  const rowHeights = new Array<number>(players.length);
  let sharedPageContentHeight = 0;
  let footerHeight = 0;
  let measuredRows = 0;

  detailPages.forEach(page => {
    const rows = Array.from(page.querySelectorAll<HTMLTableRowElement>('tbody tr[data-roster-index]'));
    const pageRowHeight = rows.reduce((height, row) => {
      const index = Number(row.dataset.rosterIndex);
      const rowHeight = row.getBoundingClientRect().height;
      rowHeights[index] = rowHeight;
      measuredRows += 1;
      return height + rowHeight;
    }, 0);
    const measuredFooterHeight = page.querySelector<HTMLElement>('.roster-footer')?.getBoundingClientRect().height || 0;
    footerHeight = Math.max(footerHeight, measuredFooterHeight);
    sharedPageContentHeight = Math.max(
      sharedPageContentHeight,
      page.getBoundingClientRect().height - pageRowHeight - measuredFooterHeight
    );
  });

  if (measuredRows !== players.length || rowHeights.some(height => !Number.isFinite(height) || height <= 0)) {
    throw new Error('Tidak dapat mengukur seluruh baris roster untuk pagination PDF.');
  }

  const pageWidth = detailPages[0].getBoundingClientRect().width;
  const a4Height = pageWidth * 297 / 210;
  const availableRowHeight = a4Height - sharedPageContentHeight - footerHeight - 18;
  if (availableRowHeight <= 0) {
    throw new Error('Header roster dan footer tidak menyisakan ruang untuk data pemain pada halaman A4.');
  }

  return paginateRosterPlayersByHeight(players, rowHeights, availableRowHeight);
}

export function paginateRosterPlayers(players: PlayerDetail[]): RosterPageItem[][] {
  return players.length > 0 ? [players.map((player, index) => ({ player, index }))] : [];
}
