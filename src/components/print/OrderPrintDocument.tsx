import React, { useLayoutEffect, useRef, useState } from 'react';
import { Order } from '../../types/order';
import { formatDateId } from '../../utils/formatters';
import { paginateRosterPlayers } from '../../utils/rosterPagination';
import { displaySpecialNote, normalizeRoster } from '../../utils/rosterData';
import { getOrderSizeRecap, getOrderTotalQuantity, isValidRosterPlayer, isValidSizeQuantity, resolveOrderInputMode } from '../../utils/orderSizing';
import {
  groupProductionRoster,
  paginateProductionGroups,
  ProductionPageGroup,
  ProductionRosterGroup,
} from '../../utils/productionRoster';

interface OrderPrintDocumentProps {
  order: Order;
  mode?: 'print' | 'preview';
}

const PRINT_PAGE_STYLE: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '794px',
  height: '1123px',
  minHeight: '1123px',
  padding: '38px',
  marginBottom: '24px',
};

function splitText(text: string, maximumLength: number): string[] {
  const parts: string[] = [];
  let remaining = text.trim().replace(/\s+/g, ' ');
  while (remaining.length > maximumLength) {
    let splitAt = remaining.lastIndexOf('\n', maximumLength);
    if (splitAt < maximumLength * 0.6) splitAt = remaining.lastIndexOf(' ', maximumLength);
    if (splitAt < maximumLength * 0.6) splitAt = maximumLength;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

interface ProductionGroupBlockProps {
  size: string;
  quantity: number;
  players: Order['players'];
  groupIndex: number;
  startIndex: number;
  endIndex: number;
  isRoster: boolean;
  continued: boolean;
  defaultSleeve: string;
}

const ProductionGroupBlock: React.FC<ProductionGroupBlockProps> = ({
  size,
  quantity,
  players,
  groupIndex,
  startIndex,
  endIndex,
  isRoster,
  continued,
  defaultSleeve,
}) => (
  <section
    data-production-group={groupIndex}
    className="mb-3 overflow-hidden border-2 border-black"
  >
    <div className="flex items-center justify-between gap-3 bg-neutral-100 px-3 py-2">
      <h3 className="text-sm font-black uppercase tracking-wide">
        KELOMPOK UKURAN {size}{continued ? ' — LANJUTAN' : ''}
      </h3>
      <span className="shrink-0 font-mono text-sm font-black">{quantity} PCS</span>
    </div>
    {isRoster && (
      <table className="w-full table-fixed border-collapse text-left font-sans text-[10px]">
        <thead>
          <tr data-production-table-header className="bg-black text-[10px] font-black uppercase text-white">
            <th style={{ width: '6%' }} className="border-r border-neutral-700 px-1 py-1.5 text-center">No</th>
            <th style={{ width: '28%' }} className="border-r border-neutral-700 px-2 py-1.5">Nama</th>
            <th style={{ width: '14%' }} className="border-r border-neutral-700 px-1 py-1.5 text-center">No. Punggung</th>
            <th style={{ width: '12%' }} className="border-r border-neutral-700 px-1 py-1.5 text-center">Ukuran</th>
            <th style={{ width: '16%' }} className="border-r border-neutral-700 px-1 py-1.5 text-center">Lengan</th>
            <th style={{ width: '24%' }} className="px-2 py-1.5">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {players.slice(startIndex, endIndex).map((player, index) => (
            <tr
              key={player.id || startIndex + index}
              data-production-row
              className={`border-t border-neutral-300 align-top ${index % 2 ? 'bg-neutral-50' : 'bg-white'}`}
            >
              <td className="border-r border-neutral-300 px-1 py-1.5 text-center font-mono font-bold">
                {startIndex + index + 1}
              </td>
              <td className="break-words border-r border-neutral-300 px-2 py-1.5 font-bold uppercase [overflow-wrap:anywhere]">
                {player.name || '-'}
              </td>
              <td className="break-words border-r border-neutral-300 px-1 py-1.5 text-center font-mono font-bold [overflow-wrap:anywhere]">
                {player.number || '-'}
              </td>
              <td className="break-words border-r border-neutral-300 px-1 py-1.5 text-center font-bold [overflow-wrap:anywhere]">
                {player.size || '-'}
              </td>
              <td className="break-words border-r border-neutral-300 px-1 py-1.5 text-center [overflow-wrap:anywhere]">
                {player.sleeve || defaultSleeve || '-'}
              </td>
              <td className="break-words whitespace-pre-wrap px-2 py-1.5 [overflow-wrap:anywhere]">
                {displaySpecialNote(player.notes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);

interface ProductionPageHeaderProps {
  orderNumber: string;
  customerName: string;
  pageNumber: number;
  totalPages: number;
  filterSizes?: string[];
  groups: ProductionRosterGroup[];
  totalQuantity: number;
  showRecap: boolean;
}

const ProductionPageHeader: React.FC<ProductionPageHeaderProps> = ({
  orderNumber,
  customerName,
  pageNumber,
  totalPages,
  filterSizes,
  groups,
  totalQuantity,
  showRecap,
}) => (
  <div data-production-page-header>
    <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
      <div className="min-w-0">
        <h2 className="text-xl font-black uppercase tracking-wide text-[#D71920]">
          DAFTAR PRODUKSI BERDASARKAN UKURAN
        </h2>
        <p className="mt-1 break-words text-xs font-bold uppercase text-neutral-700 [overflow-wrap:anywhere]">
          CUTTING & JAHIT · PEMESAN: {customerName || '-'}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="border-2 border-black bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase">
          NO. ORDER: <span className="font-mono text-[#D71920]">{orderNumber || '-'}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] font-bold">HAL. {pageNumber}/{totalPages}</div>
      </div>
    </div>
    <p className="mt-2 border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-black uppercase text-[#D71920]">
      Filter ukuran: {filterSizes?.length ? filterSizes.join(', ') : 'Semua Ukuran'}
    </p>
    {showRecap ? <div className="mt-2 border-2 border-black">
      <div className="border-b border-black bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase">
        Rekapitulasi jumlah per ukuran
      </div>
      <table className="w-full table-fixed border-collapse text-[10px]">
        <thead>
          <tr className="bg-black text-left font-black uppercase text-white">
            <th className="w-[30%] border-r border-neutral-700 px-2 py-1">Ukuran</th>
            <th className="w-[20%] border-r border-neutral-700 px-2 py-1 text-right">Total PCS</th>
            <th className="w-[30%] border-r border-neutral-700 px-2 py-1">Ukuran</th>
            <th className="w-[20%] px-2 py-1 text-right">Total PCS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(groups.length / 2) }, (_, index) => {
            const left = groups[index * 2];
            const right = groups[index * 2 + 1];
            return (
              <tr key={left.size} className="border-t border-neutral-300">
                <td className="border-r border-neutral-300 px-2 py-1 font-bold">{left.size}</td>
                <td className="border-r border-neutral-300 px-2 py-1 text-right font-mono font-bold">{left.quantity}</td>
                <td className="border-r border-neutral-300 px-2 py-1 font-bold">{right?.size || '-'}</td>
                <td className="px-2 py-1 text-right font-mono font-bold">{right?.quantity ?? '-'}</td>
              </tr>
            );
          })}
          {groups.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-1.5 text-center font-bold text-neutral-500">
                Belum ada data ukuran.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black bg-neutral-100 font-black">
            <td colSpan={3} className="px-2 py-1.5 text-right uppercase">Total</td>
            <td className="px-2 py-1.5 text-right font-mono">{totalQuantity} PCS</td>
          </tr>
        </tfoot>
      </table>
    </div> : (
      <p className="mt-2 border border-black bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase">
        Total seluruh data terpilih: {totalQuantity} PCS
      </p>
    )}
  </div>
);

export const OrderPrintDocument: React.FC<OrderPrintDocumentProps> = ({
  order,
  mode = 'print',
}) => {
  const { customer, product, printingMachines = [], designs = [], collar, notes, signoff } = order;
  const inputMode = resolveOrderInputMode(order.inputMode, order.players || []);
  const validSourcePlayers = inputMode === 'size-quantity'
    ? (order.players || []).filter(isValidSizeQuantity)
    : (order.players || []).filter(isValidRosterPlayer);
  const players = normalizeRoster(validSourcePlayers);

  const totalPlayerQty = getOrderTotalQuantity(inputMode, players);
  const totalDisplayQty = validSourcePlayers.length > 0 || inputMode === 'size-quantity' || order.printFilterSizes?.length
    ? totalPlayerQty
    : product.totalQuantity || 0;
  const isQtyMatch = validSourcePlayers.length === 0 && !order.printFilterSizes?.length
    ? true
    : totalPlayerQty === totalDisplayQty;
  const qtyDiff = isQtyMatch ? 0 : Math.abs(totalDisplayQty - totalPlayerQty);

  const sizeRecap = getOrderSizeRecap(inputMode, players);
  const productionGroups = groupProductionRoster(inputMode, players);
  const sizeRecapPages: typeof sizeRecap[] = [];
  for (let index = 0; index < sizeRecap.length; index += 24) {
    sizeRecapPages.push(sizeRecap.slice(index, index + 24));
  }
  const notePages = splitText(notes || '', 260);
  const continuedNotePages: string[][] = [];
  for (let index = 1; index < notePages.length; index += 3) {
    continuedNotePages.push(notePages.slice(index, index + 3));
  }
  const hasRosterPages = inputMode === 'roster' && players.length > 0;
  const hasSizeQuantityPages = inputMode === 'size-quantity' && players.length > 0;
  const paginationKey = JSON.stringify([
    order.id,
    inputMode,
    customer.orderNumber,
    customer.name,
    product.material,
    product.sleeve,
    product.totalQuantity,
    players,
    order.printFilterSizes,
  ]);
  const paginationRoot = useRef<HTMLDivElement>(null);
  const [measuredProductionPagination, setMeasuredProductionPagination] = useState<{
    key: string;
    pages: ProductionPageGroup[][];
  } | null>(null);
  const playerChunks = paginateRosterPlayers(players);
  const fallbackProductionPage = productionGroups.map((group, groupIndex) => ({
    groupIndex,
    startIndex: 0,
    endIndex: group.players.length,
  }));
  const productionPages = measuredProductionPagination?.key === paginationKey
    ? measuredProductionPagination.pages
    : [fallbackProductionPage];
  const productionPaginationReady = productionGroups.length === 0
    || measuredProductionPagination?.key === paginationKey;
  const totalPages = 1
    + continuedNotePages.length
    + productionPages.length;
  const productionStartPageNumber = 2 + continuedNotePages.length;
  const isPaginationReady = productionPaginationReady;

  useLayoutEffect(() => {
    if (productionGroups.length === 0
      || measuredProductionPagination?.key === paginationKey
      || !paginationRoot.current) return;

    const page = paginationRoot.current.querySelector<HTMLElement>('[data-production-measure-page]');
    const pageHeader = page?.querySelector<HTMLElement>('[data-production-page-header]');
    if (!page || !pageHeader) {
      throw new Error('Tidak dapat menyiapkan pengukuran pagination daftar produksi.');
    }

    const pageRect = page.getBoundingClientRect();
    const pageStyles = getComputedStyle(page);
    const contentBottom = pageRect.bottom
      - Number.parseFloat(pageStyles.borderBottomWidth || '0')
      - Number.parseFloat(pageStyles.paddingBottom || '0');
    const groupGap = 12;
    const availableHeight = contentBottom - pageHeader.getBoundingClientRect().bottom - groupGap - 8;
    const measurements = productionGroups.map((group, groupIndex) => {
      const element = page.querySelector<HTMLElement>(`[data-production-group="${groupIndex}"]`);
      if (!element) throw new Error(`Tidak dapat mengukur kelompok ukuran ${group.size}.`);

      const rows = Array.from(element.querySelectorAll<HTMLElement>('[data-production-row]'));
      const rowHeights = rows.map(row => row.getBoundingClientRect().height);
      const styles = getComputedStyle(element);
      const marginBottom = Number.parseFloat(styles.marginBottom || '0');
      const measuredHeight = element.getBoundingClientRect().height + marginBottom;
      const headerHeight = measuredHeight - rowHeights.reduce((total, height) => total + height, 0);

      return {
        groupHeight: measuredHeight,
        headerHeight,
        rowHeights,
      };
    });

    setMeasuredProductionPagination({
      key: paginationKey,
      pages: paginateProductionGroups(measurements, availableHeight),
    });
  }, [measuredProductionPagination?.key, paginationKey, productionGroups]);

  // Primary design visual
  const primaryDesign = designs.length > 0 ? designs[0] : null;

  return (
    <div
      ref={paginationRoot}
      data-pagination-ready={isPaginationReady ? 'true' : 'false'}
      className={`print-document ${mode === 'preview' ? 'order-document-preview w-[794px] max-w-none mx-0 text-black' : 'w-full'}`}
    >
      {/* ========================================================= */}
      {/* PAGE 1: FORM ORDER SUBLIME TIKET PRODUKSI UTAMA */}
      {/* ========================================================= */}
      <div style={PRINT_PAGE_STYLE} className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'}`}>
        {/* Document Header */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="w-16 hidden sm:block"></div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-black font-sans text-center flex-1">
            FORM ORDER SUBLIME
          </h1>
          <div className="text-right">
            <span className="font-mono text-[10px] font-bold border border-black px-2 py-0.5 rounded bg-neutral-100">
              Hal. 1/{totalPages}
            </span>
          </div>
        </div>

        {/* Top Info Grid */}
        <div className="border-2 border-black text-xs font-bold uppercase mb-0">
          {/* Row 1: Pemesan & No Order */}
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-3 sm:col-span-2 p-1.5 sm:p-2 bg-neutral-100 border-r-2 border-black">
              PEMESAN
            </div>
            <div className="col-span-4 sm:col-span-5 p-1.5 sm:p-2 border-r-2 border-black font-mono font-black text-neutral-900 break-words [overflow-wrap:anywhere]">
              {customer.name || '-'}
            </div>
            <div className="col-span-3 sm:col-span-2 p-1.5 sm:p-2 bg-neutral-100 border-r-2 border-black">
              NO. ORDER
            </div>
            <div className="col-span-2 sm:col-span-3 p-1.5 sm:p-2 font-mono font-black text-[#D71920] text-sm break-words [overflow-wrap:anywhere]">
              {customer.orderNumber || '-'}
            </div>
          </div>

          {/* Row 2: No WA & Jenis Bahan */}
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-3 sm:col-span-2 p-1.5 sm:p-2 bg-neutral-100 border-r-2 border-black">
              NO. WA/TLP
            </div>
            <div className="col-span-4 sm:col-span-5 p-1.5 sm:p-2 border-r-2 border-black font-mono">
              {customer.phone || '-'}
            </div>
            <div className="col-span-3 sm:col-span-2 p-1.5 sm:p-2 bg-neutral-100 border-r-2 border-black">
              JENIS BAHAN
            </div>
            <div className="col-span-2 sm:col-span-3 p-1.5 sm:p-2 font-black text-[#D71920] tracking-wide break-words [overflow-wrap:anywhere]">
              {product.material || 'Milano'}
            </div>
          </div>

          {/* Row 3: Tanggal, channel, and external order reference */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 sm:col-span-2 p-1.5 sm:p-2 bg-neutral-100 border-r-2 border-black">
              TANGGAL
            </div>
            <div className="col-span-4 sm:col-span-5 p-1.5 sm:p-2 border-r-2 border-black font-mono">
              {formatDateId(customer.orderDate)}
            </div>
            <div className="col-span-5 sm:col-span-5 p-1.5 sm:p-2 bg-neutral-100 text-center font-black tracking-wide break-words [overflow-wrap:anywhere]">
              <div>KETERANGAN</div>
              <div className="mt-0.5 text-[8px] leading-tight">
                {order.salesChannel || 'Offline'} · NO. PESANAN: {order.externalOrderNumber || '-'}
              </div>
            </div>
          </div>
        </div>

        <section className="border-x-2 border-b-2 border-black bg-neutral-50 px-3 py-2.5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-black uppercase tracking-wide">REKAPITULASI UKURAN</h2>
            <span className="font-mono text-[11px] font-black">TOTAL {totalDisplayQty} PCS</span>
          </div>
          {order.printFilterSizes?.length ? (
            <p className="mb-1 text-[9px] font-bold uppercase text-[#D71920]">
              Dokumen menggunakan filter ukuran: {order.printFilterSizes.join(', ')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {sizeRecap.length ? sizeRecap.map(item => (
              <span key={item.size} className="border border-neutral-400 bg-white px-2 py-1 text-[10px] font-bold">
                {item.size}: {item.quantity} PCS
              </span>
            )) : <span className="text-[10px] text-neutral-500">Belum ada data ukuran</span>}
          </div>
        </section>

        {/* Middle Section: Artwork (Left) vs Production Notes (Right) */}
        <div className="border-x-2 border-b-2 border-black grid grid-cols-12 min-h-[300px]">
          {/* Left Column: Artwork Gallery */}
          <div className="col-span-7 border-r-2 border-black p-3 flex flex-col justify-between bg-white relative">
            <div className="text-center pb-1">
              <span className="text-[#D71920] font-black text-sm tracking-wide uppercase">
                {product.material || 'MILANO'}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] p-1">
              {primaryDesign ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full max-h-[240px] flex items-center justify-center overflow-hidden">
                    <img
                      src={primaryDesign.dataUrl}
                      alt={primaryDesign.label}
                      style={{ maxWidth: '100%', maxHeight: '230px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                      className="max-h-[230px] w-auto max-w-full object-contain opacity-100 filter-none mix-blend-normal"
                    />
                  </div>
                  {designs.length > 1 && (
                    <div className="grid grid-cols-3 gap-1.5 w-full pt-1 border-t border-neutral-300">
                      {designs.slice(1, 4).map((d, i) => (
                        <div key={i} className="h-14 border border-neutral-300 rounded overflow-hidden flex items-center justify-center p-0.5">
                          <img
                            src={d.dataUrl}
                            alt={d.label}
                            style={{ maxWidth: '100%', maxHeight: '56px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                            className="h-full w-full object-contain opacity-100 filter-none mix-blend-normal"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-300 rounded p-6 text-center text-neutral-400 text-xs">
                  Gambar desain belum diunggah
                </div>
              )}
            </div>

            <div className="text-[10px] text-neutral-600 text-center font-mono pt-1 uppercase">
              {product.productType || 'Jersey Sublime'} · {product.model || 'Reguler'} · {product.color || 'Pola Custom'}
            </div>
          </div>

          {/* Right Column: Production Notes in Bold Red */}
          <div className="col-span-5 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between bg-white">
            <div className="space-y-2 text-xs sm:text-sm font-black tracking-wide leading-relaxed">
              {(hasRosterPages || hasSizeQuantityPages) && (
                <div className="text-[#D71920] font-black uppercase text-sm border-b-2 border-red-300 pb-1 mb-2">
                  DATA TERPISAH DI HALAMAN BELAKANG
                </div>
              )}

              {notePages[0] ? (
                <div className="whitespace-pre-line break-words [overflow-wrap:anywhere] text-[#D71920] font-black uppercase">
                  {notePages[0]}
                </div>
              ) : (
                <div className="whitespace-pre-line text-[#D71920] font-black uppercase">-</div>
              )}

            </div>

            {/* Quantity Verification Notice */}
            <div className="mt-3 pt-2 border-t border-neutral-200 text-[10px] font-bold uppercase">
              <span className="text-neutral-500">Status Validasi Qty: </span>
              {isQtyMatch ? (
                <span className="text-emerald-700 font-black">✓ PAS ({totalDisplayQty} PCS)</span>
              ) : (
                <span className="text-red-600 font-black">
                  ⚠ SELISIH {qtyDiff} PCS (Order: {totalDisplayQty}, Data: {totalPlayerQty})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Printing & Collar & Signoffs */}
        <div className="border-x-2 border-b-2 border-black grid grid-cols-12">
          {/* Bottom Left: Printing Machine List & Total Pcs */}
          <div className="col-span-6 border-r-2 border-black p-3 sm:p-4 flex flex-col justify-between bg-white">
            <div>
              <div className="text-center font-black text-sm uppercase tracking-wider pb-2 border-b border-black mb-2">
                PRINTING
              </div>

              {/* Printing Machine List */}
              <div className="border border-black text-xs font-mono">
                {printingMachines.slice(0, 5).map((machine, index) => (
                    <div
                      key={machine.id || index}
                      className="grid grid-cols-12 border-b last:border-b-0 border-black py-1 px-1.5 font-bold"
                    >
                      <div className="col-span-2 text-center border-r border-black font-sans font-black">
                        {index + 1}
                      </div>
                      <div className="col-span-10 pl-2 text-neutral-900 break-words uppercase">
                        {machine.name}
                      </div>
                    </div>
                  ))}
                {printingMachines.length === 0 && (
                  <div className="px-2 py-2 text-center text-neutral-500">-</div>
                )}
              </div>
            </div>

            {/* Massive Bold TOTAL PCS */}
            <div className="pt-4 pb-1 text-center">
              <span className="text-xs font-black uppercase tracking-widest block text-neutral-700">
                TOTAL :
              </span>
              <div className="text-3xl sm:text-4xl font-black text-black tracking-tight mt-0.5">
                {totalDisplayQty} <span className="text-base sm:text-lg font-bold">pcs</span>
              </div>
            </div>
          </div>

          {/* Bottom Right: Model Kerah & Approval Signoffs */}
          <div className="col-span-6 p-3 sm:p-4 flex flex-col justify-between bg-white">
            <div>
              <div className="text-center font-black text-sm uppercase tracking-wider pb-1 border-b border-black mb-1.5">
                MODEL KERAH
              </div>

              <div className="text-xs mb-1.5 flex items-baseline justify-between border-b border-neutral-200 pb-1">
                <span className="text-[10px] font-bold text-neutral-600 uppercase">Nama Model:</span>
                <span className="font-black text-xs text-neutral-900 uppercase">
                  {collar?.modelName || 'POLO KANCING 2'}
                </span>
              </div>

              <div className="text-[10px] font-bold text-neutral-700 uppercase mb-1 flex items-center justify-between">
                <span>Referensi Visual:</span>
                {collar?.imageUrl && (
                  <span className="text-[9px] font-mono text-neutral-400 font-normal">
                    (Rasio 100% terjaga)
                  </span>
                )}
              </div>

              {/* Collar Mockup Image - Sized clearly for sewing operators */}
              <div className="w-full h-28 flex items-center justify-center overflow-hidden p-1.5 bg-neutral-50 rounded border border-neutral-400">
                {collar?.imageUrl ? (
                  <img
                    src={collar.imageUrl}
                    alt={collar.modelName || 'Model Kerah'}
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector('.img-error-alert')) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'img-error-alert text-[10px] text-red-600 font-black text-center p-2 leading-tight uppercase';
                        alertDiv.innerHTML = '⚠ PERINGATAN: Gambar referensi kerah gagal dimuat dari Storage!';
                        parent.appendChild(alertDiv);
                      }
                    }}
                  />
                ) : (
                  <div className="text-[10px] text-neutral-500 font-medium text-center italic">
                    (Referensi visual belum diunggah)
                  </div>
                )}
              </div>
            </div>

            {/* Signoff Workflow Box: DESAINER | PRESS | CUTTING | JAHIT */}
            <div className="mt-3 pt-2">
              <div className="border border-black text-center text-[10px] sm:text-[11px] font-bold">
                <div className="grid grid-cols-4 bg-neutral-100 border-b border-black font-black py-1">
                  <div className="border-r border-black">DESAINER</div>
                  <div className="border-r border-black">PRESS</div>
                  <div className="border-r border-black">CUTTING</div>
                  <div>JAHIT</div>
                </div>

                <div className="grid grid-cols-4 h-12 sm:h-14 items-center">
                  {/* Desainer initial */}
                  <div className="border-r border-black h-full flex items-center justify-center p-1">
                    {signoff?.designerInitial ? (
                      <div className="border-2 border-black rounded-full px-2 py-0.5 font-mono font-black text-xs tracking-wider transform -rotate-3 text-black">
                        {signoff.designerInitial}
                      </div>
                    ) : (
                      <span className="text-neutral-400 text-[10px]">PARAF</span>
                    )}
                  </div>

                  {/* Press status */}
                  <div className="border-r border-black h-full flex items-center justify-center">
                    {signoff?.pressSigned ? (
                      <span className="font-mono text-emerald-800 font-black text-xs">✓ PRESS</span>
                    ) : (
                      <span className="text-neutral-400 text-[10px]">PARAF</span>
                    )}
                  </div>

                  {/* Cutting status */}
                  <div className="border-r border-black h-full flex items-center justify-center">
                    {signoff?.cuttingSigned ? (
                      <span className="font-mono text-emerald-800 font-black text-xs">✓ CUT</span>
                    ) : (
                      <span className="text-neutral-400 text-[10px]">PARAF</span>
                    )}
                  </div>

                  {/* Jahit status */}
                  <div className="h-full flex items-center justify-center">
                    {signoff?.jahitSigned ? (
                      <span className="font-mono text-emerald-800 font-black text-xs">✓ JAHIT</span>
                    ) : (
                      <span className="text-neutral-400 text-[10px]">PARAF</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!hasRosterPages && !hasSizeQuantityPages && (
          <div className="mt-2 border-t border-black pt-2 text-[10px] font-bold uppercase font-mono">
            TOTAL ORDER: {totalDisplayQty} PCS · STATUS DATA: BELUM ADA ROSTER PEMAIN
          </div>
        )}
      </div>

      {continuedNotePages.map((chunks, index) => (
        <div
          key={`notes-page-${index}`}
          style={PRINT_PAGE_STYLE}
          className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'}`}
        >
          <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-2">
            <div>
              <h2 className="text-xl font-black uppercase">FORM ORDER SUBLIME — LANJUTAN KETERANGAN</h2>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-neutral-700">
                Order #{customer.orderNumber || '-'} · {customer.name || '-'}
              </p>
            </div>
            <span className="border border-black bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold">
              Halaman {index + 2} dari {totalPages}
            </span>
          </div>
          <div className="space-y-3 break-words [overflow-wrap:anywhere] text-sm font-bold uppercase leading-relaxed">
            {chunks.map((chunk, chunkIndex) => (
              <p key={chunkIndex} className="whitespace-pre-wrap">{chunk}</p>
            ))}
          </div>
        </div>
      ))}

      {/* ========================================================= */}
      {/* PAGE 2+: DETAIL NAMA, NO PUNGGUNG & UKURAN (REPEAT HEADERS) */}
      {/* ========================================================= */}
      {false && hasRosterPages &&
        playerChunks.map((chunk, chunkIdx) => {
          const pageNum = chunkIdx + 2;
          const isLastRosterPage = chunkIdx === playerChunks.length - 1;

          return (
            <div
              key={`roster-page-${chunkIdx}`}
              style={PRINT_PAGE_STYLE}
              className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${
                mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'
              }`}
            >
              {/* Header Page 2+ */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-black font-sans">
                    FORM ORDER SUBLIME — DETAIL ORDER
                  </h2>
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest mt-0.5">
                    RINCIAN PEMAIN & KEBUTUHAN PRODUKSI
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold bg-neutral-100 border border-black px-2.5 py-1 rounded">
                    Halaman {pageNum + continuedNotePages.length} dari {totalPages}
                  </span>
                </div>
              </div>

              {/* Quick Header Summary Pill */}
              <div className="grid grid-cols-12 border-2 border-black text-xs font-bold uppercase mb-4 bg-neutral-100">
                <div className="col-span-3 p-1.5 border-r border-black font-mono">
                  <span className="text-neutral-600 block text-[9px]">NO. ORDER:</span>
                  <strong className="text-black font-black text-sm">{customer.orderNumber || '-'}</strong>
                </div>
                <div className="col-span-4 p-1.5 border-r border-black">
                  <span className="text-neutral-600 block text-[9px]">PEMESAN:</span>
                  <strong className="text-black font-black block break-words [overflow-wrap:anywhere]">{customer.name || '-'}</strong>
                </div>
                <div className="col-span-3 p-1.5 border-r border-black">
                  <span className="text-neutral-600 block text-[9px]">BAHAN:</span>
                  <strong className="text-[#D71920] font-black block break-words [overflow-wrap:anywhere]">{product.material || 'Milano'}</strong>
                </div>
                <div className="col-span-2 p-1.5 text-right font-mono">
                  <span className="text-neutral-600 block text-[9px]">TOTAL PCS:</span>
                  <strong className="text-black font-black text-sm">{totalDisplayQty} pcs</strong>
                </div>
              </div>

              {/* Multi-page Player Table with thead table-header-group */}
              <div className="border-2 border-black mb-4">
              <table className="w-full table-fixed text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-black text-white font-black text-[11px] uppercase tracking-wider">
                    <th style={{ width: '6%' }} className="py-2 px-1 text-center border-r border-neutral-700">No</th>
                    <th style={{ width: '30%' }} className="py-2 px-2 border-r border-neutral-700">Nama Pemain</th>
                    <th style={{ width: '14%' }} className="py-2 px-1 text-center border-r border-neutral-700">No. Punggung</th>
                    <th style={{ width: '12%' }} className="py-2 px-1 text-center border-r border-neutral-700">Ukuran</th>
                    <th style={{ width: '16%' }} className="py-2 px-1 text-center border-r border-neutral-700">Lengan</th>
                    <th style={{ width: '22%' }} className="py-2 px-2">Catatan Khusus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-t border-black divide-neutral-300">
                  {chunk.map(({ player: p, index: globalIdx }, idx) => {
                    const sleeve = p.sleeve || product.sleeve;
                    return (
                      <tr
                        key={p.id || globalIdx}
                        data-roster-index={globalIdx}
                        className={`page-break-avoid ${idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}`}
                        >
                          <td className="py-1.5 px-1 text-center font-mono font-bold text-neutral-600 border-r border-neutral-300 text-[11px] align-top">
                            {globalIdx + 1}
                          </td>
                          <td className="py-1.5 px-2 font-bold text-neutral-900 uppercase border-r border-neutral-300 break-words [overflow-wrap:anywhere] align-top">
                            {p.name || 'BELUM DIISI'}
                          </td>
                          <td className="py-1.5 px-1 text-center font-mono font-black text-neutral-900 border-r border-neutral-300 text-xs break-words [overflow-wrap:anywhere] align-top">
                            {p.number || '-'}
                          </td>
                          <td className="py-1.5 px-1 text-center font-black text-[#D71920] border-r border-neutral-300 text-xs break-words align-top">
                            {p.size || '-'}
                          </td>
                          <td className="py-1.5 px-1 text-center text-neutral-700 text-[10px] break-words [overflow-wrap:anywhere] border-r border-neutral-300 align-top">
                            {sleeve || '-'}
                          </td>
                          <td className="py-1.5 px-2 text-neutral-700 text-[10px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] align-top">
                            {displaySpecialNote(p.notes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isLastRosterPage && (
              <div className="roster-footer border-2 border-black p-3 bg-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs font-bold uppercase font-mono gap-2">
                <div className="flex items-center gap-3">
                  <span>TOTAL ORDER: <strong className="text-black">{totalDisplayQty} PCS</strong></span>
                  <span>·</span>
                  <span>DETAIL DATA: <strong className="text-black">{totalPlayerQty} PCS</strong></span>
                </div>
                <div>
                  {isQtyMatch ? (
                    <span className="text-emerald-700 font-black">
                      STATUS: ✓ DATA LENGKAP & VALID ({totalPlayerQty}/{totalDisplayQty})
                    </span>
                  ) : (
                    <span className="text-red-600 font-black">
                      STATUS: ⚠ SELISIH {qtyDiff} PCS (PERIKSA ROSTER)
                    </span>
                  )}
                </div>
              </div>
              )}
            </div>
          );
        })}
      {false && hasSizeQuantityPages && sizeRecapPages.map((pageItems, pageIndex) => (
        <div
          key={`size-page-${pageIndex}`}
          style={PRINT_PAGE_STYLE}
          className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'}`}
        >
          <div className="mb-3 flex items-center justify-between border-b-2 border-black pb-2">
            <div>
              <h2 className="text-xl font-black uppercase">FORM ORDER SUBLIME — DETAIL UKURAN</h2>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-neutral-700">Rekap jumlah jersey tanpa roster pemain</p>
            </div>
            <span className="border border-black bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold">
              Halaman {2 + continuedNotePages.length + pageIndex} dari {totalPages}
            </span>
          </div>
          <div className="mb-3 grid grid-cols-12 border-2 border-black bg-neutral-100 text-xs font-bold uppercase">
            <div className="col-span-6 border-r border-black p-2">NO. ORDER: {customer.orderNumber || '-'}</div>
            <div className="col-span-6 p-2">PEMESAN: {customer.name || '-'}</div>
          </div>
          {order.printFilterSizes?.length ? (
            <p className="mb-2 border border-red-300 bg-red-50 p-2 text-xs font-bold uppercase text-[#D71920]">
              Dokumen menggunakan filter ukuran: {order.printFilterSizes.join(', ')}
            </p>
          ) : null}
          <div className="border-2 border-black">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-black text-[11px] font-black uppercase tracking-wide text-white">
                  <th className="w-16 border-r border-neutral-700 px-2 py-2 text-center">No</th>
                  <th className="border-r border-neutral-700 px-3 py-2">Ukuran</th>
                  <th className="w-40 px-3 py-2 text-right">Jumlah PCS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {pageItems.map((item, index) => (
                  <tr key={item.size} className={index % 2 ? 'bg-neutral-50' : 'bg-white'}>
                    <td className="border-r border-neutral-300 px-2 py-2 text-center font-mono">{pageIndex * 24 + index + 1}</td>
                    <td className="border-r border-neutral-300 px-3 py-2 font-bold">{item.size}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
              {pageIndex === sizeRecapPages.length - 1 && (
                <tfoot>
                  <tr className="border-t-2 border-black bg-neutral-100 font-black">
                    <td colSpan={2} className="px-3 py-2 text-right uppercase">Total PCS</td>
                    <td className="px-3 py-2 text-right font-mono">{totalDisplayQty}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {pageIndex === sizeRecapPages.length - 1 && (
            <div className="mt-4 border-2 border-black bg-neutral-100 p-3 text-right font-mono text-sm font-black uppercase">
              Total order: {totalDisplayQty} PCS
            </div>
          )}
        </div>
      ))}

      {productionPages.map((pageGroups, pageIndex) => (
        <div
          key={`production-page-${pageIndex}`}
          data-last-print-page={pageIndex === productionPages.length - 1 ? 'true' : undefined}
          style={PRINT_PAGE_STYLE}
          className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'}`}
        >
          <ProductionPageHeader
            orderNumber={customer.orderNumber || '-'}
            customerName={customer.name}
            pageNumber={productionStartPageNumber + pageIndex}
            totalPages={totalPages}
            filterSizes={order.printFilterSizes}
            groups={productionGroups}
            totalQuantity={totalDisplayQty}
            showRecap={pageIndex === 0}
          />
          <div className="mt-3">
            {pageGroups.length ? pageGroups.map(({ groupIndex, startIndex, endIndex }) => {
              const group = productionGroups[groupIndex];
              return (
                <ProductionGroupBlock
                  key={`${group.size}-${startIndex}`}
                  size={group.size}
                  quantity={group.quantity}
                  players={group.players}
                  groupIndex={groupIndex}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  isRoster={inputMode === 'roster'}
                  continued={startIndex > 0}
                  defaultSleeve={product.sleeve}
                />
              );
            }) : (
              <div className="border-2 border-dashed border-neutral-400 p-4 text-center text-sm font-bold uppercase text-neutral-500">
                Data ukuran belum tersedia untuk dikelompokkan.
              </div>
            )}
          </div>
        </div>
      ))}

      {productionGroups.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-100000px',
            top: 0,
            width: '794px',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div
            data-production-measure-page
            style={{ ...PRINT_PAGE_STYLE, margin: 0 }}
            className="bg-white text-black font-sans leading-tight border-2 border-black"
          >
            <ProductionPageHeader
              orderNumber={customer.orderNumber || '-'}
              customerName={customer.name}
              pageNumber={1}
              totalPages={totalPages}
              filterSizes={order.printFilterSizes}
              groups={productionGroups}
              totalQuantity={totalDisplayQty}
              showRecap
            />
            <div className="mt-3">
              {productionGroups.map((group, groupIndex) => (
                <ProductionGroupBlock
                  key={group.size}
                  size={group.size}
                  quantity={group.quantity}
                  players={group.players}
                  groupIndex={groupIndex}
                  startIndex={0}
                  endIndex={group.players.length}
                  isRoster={inputMode === 'roster'}
                  continued={false}
                  defaultSleeve={product.sleeve}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
