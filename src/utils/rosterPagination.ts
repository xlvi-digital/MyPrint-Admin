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
    if (rowHeight > availableHeight) {
      throw new Error(`Catatan atau isi roster baris ${index + 1} lebih tinggi dari area cetak satu halaman A4.`);
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
  let availablePageHeight = 0;

  detailPages.forEach(page => {
    const rows = Array.from(page.querySelectorAll<HTMLTableRowElement>('tbody tr[data-roster-index]'));
    rows.forEach(row => {
      const index = Number(row.dataset.rosterIndex);
      const rowHeight = row.getBoundingClientRect().height;
      rowHeights[index] = rowHeight;
      measuredRows += 1;
    });
    const measuredFooterHeight = page.querySelector<HTMLElement>('.roster-footer')?.getBoundingClientRect().height || 0;
    footerHeight = Math.max(footerHeight, measuredFooterHeight);
    const firstRow = rows[0];
    if (firstRow) {
      const pageRect = page.getBoundingClientRect();
      const firstRowTop = firstRow.getBoundingClientRect().top;
      const styles = getComputedStyle(page);
      const pageContentTop = pageRect.top
        + Number.parseFloat(styles.borderTopWidth || '0')
        + Number.parseFloat(styles.paddingTop || '0');
      sharedPageContentHeight = Math.max(sharedPageContentHeight, firstRowTop - pageContentTop);

      const pageContentBottom = pageRect.bottom
        - Number.parseFloat(styles.borderBottomWidth || '0')
        - Number.parseFloat(styles.paddingBottom || '0');
      availablePageHeight = Math.max(availablePageHeight, pageContentBottom - pageContentTop);
    }
  });

  if (measuredRows !== players.length || rowHeights.some(height => !Number.isFinite(height) || height <= 0)) {
    throw new Error('Tidak dapat mengukur seluruh baris roster untuk pagination PDF.');
  }

  const availableRowHeight = availablePageHeight - sharedPageContentHeight - footerHeight - 12;
  if (availableRowHeight <= 0) {
    throw new Error('Header roster dan footer tidak menyisakan ruang untuk data pemain pada halaman A4.');
  }

  const oversizedRow = rowHeights.findIndex(height => height > availableRowHeight);
  if (oversizedRow !== -1) {
    throw new Error(`Catatan atau isi roster baris ${oversizedRow + 1} lebih tinggi dari area cetak satu halaman A4.`);
  }

  return paginateRosterPlayersByHeight(players, rowHeights, availableRowHeight);
}

export function paginateRosterPlayers(players: PlayerDetail[]): RosterPageItem[][] {
  return players.length > 0 ? [players.map((player, index) => ({ player, index }))] : [];
}
