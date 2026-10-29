import React, { useLayoutEffect, useRef, useState } from 'react';
import { Order } from '../../types/order';
import { formatDateId } from '../../utils/formatters';
import { measureRosterPages, paginateRosterPlayers, RosterPageItem } from '../../utils/rosterPagination';
import { displaySpecialNote, normalizeRoster } from '../../utils/rosterData';

interface OrderPrintDocumentProps {
  order: Order;
  mode?: 'print' | 'preview';
  rosterPages?: RosterPageItem[][];
}

export const OrderPrintDocument: React.FC<OrderPrintDocumentProps> = ({
  order,
  mode = 'print',
  rosterPages,
}) => {
  const { customer, product, printingMachines = [], designs = [], collar, notes, signoff } = order;
  const players = normalizeRoster(order.players || []);

  const totalPlayerQty = players.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
  const totalDisplayQty = product.totalQuantity || totalPlayerQty || 0;
  const isQtyMatch = totalPlayerQty === totalDisplayQty;
  const qtyDiff = Math.abs(totalDisplayQty - totalPlayerQty);

  const hasRosterPages = players.length > 0;
  const paginationKey = JSON.stringify([
    order.id,
    customer.orderNumber,
    customer.name,
    product.material,
    product.sleeve,
    product.totalQuantity,
    players,
  ]);
  const paginationRoot = useRef<HTMLDivElement>(null);
  const [measuredPagination, setMeasuredPagination] = useState<{
    key: string;
    pages: RosterPageItem[][];
  } | null>(null);
  const playerChunks = rosterPages
    || (measuredPagination?.key === paginationKey ? measuredPagination.pages : paginateRosterPlayers(players));
  const totalPages = 1 + playerChunks.length;

  useLayoutEffect(() => {
    if (rosterPages || measuredPagination?.key === paginationKey || !paginationRoot.current) return;
    const pages = measureRosterPages(paginationRoot.current, players);
    setMeasuredPagination({ key: paginationKey, pages });
  }, [paginationKey, measuredPagination?.key, players, rosterPages]);

  // Primary design visual
  const primaryDesign = designs.length > 0 ? designs[0] : null;

  return (
    <div ref={paginationRoot} className={`print-document ${mode === 'preview' ? 'order-document-preview w-[794px] max-w-none mx-0 text-black' : 'w-full'}`}>
      {/* ========================================================= */}
      {/* PAGE 1: FORM ORDER SUBLIME TIKET PRODUKSI UTAMA */}
      {/* ========================================================= */}
      <div className={`print-page bg-white text-black font-sans leading-tight border-2 border-black p-5 sm:p-6 mb-6 shadow-sm ${mode === 'print' ? 'shadow-none !border-2 !border-black' : 'rounded-lg'}`}>
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
                  <div className="w-full max-h-[240px] flex items-center justify-center">
                    <img
                      src={primaryDesign.dataUrl}
                      alt={primaryDesign.label}
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
          <div className="col-span-5 p-3.5 sm:p-4 flex flex-col justify-between bg-white">
            <div className="space-y-2 text-xs sm:text-sm font-black tracking-wide leading-relaxed">
              {hasRosterPages && (
                <div className="text-[#D71920] font-black uppercase text-sm border-b-2 border-red-300 pb-1 mb-2">
                  DATA TERPISAH DI HALAMAN BELAKANG
                </div>
              )}

              {notes ? (
                <div className="whitespace-pre-line text-[#D71920] font-black uppercase">
                  {notes}
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
              <div className="w-full min-h-28 flex items-center justify-center p-1.5 bg-neutral-50 rounded border border-neutral-400">
                {collar?.imageUrl ? (
                  <img
                    src={collar.imageUrl}
                    alt={collar.modelName || 'Model Kerah'}
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
      </div>
      {!hasRosterPages && (
        <div className="border-2 border-black p-3 bg-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs font-bold uppercase font-mono gap-2">
          <span>TOTAL ORDER: <strong>{totalDisplayQty} PCS</strong></span>
          <span className="text-neutral-700">STATUS DATA: BELUM ADA ROSTER PEMAIN</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 2+: DETAIL NAMA, NO PUNGGUNG & UKURAN (REPEAT HEADERS) */}
      {/* ========================================================= */}
      {hasRosterPages &&
        playerChunks.map((chunk, chunkIdx) => {
          const pageNum = chunkIdx + 2;
          const isLastRosterPage = chunkIdx === playerChunks.length - 1;

          return (
            <div
              key={`roster-page-${chunkIdx}`}
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
                    Halaman {pageNum} dari {totalPages}
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
                    <th style={{ width: '25%' }} className="py-2 px-2 border-r border-neutral-700">Nama Pemain</th>
                    <th style={{ width: '12%' }} className="py-2 px-1 text-center border-r border-neutral-700">No. Punggung</th>
                    <th style={{ width: '10%' }} className="py-2 px-1 text-center border-r border-neutral-700">Ukuran</th>
                    <th style={{ width: '7%' }} className="py-2 px-1 text-center border-r border-neutral-700">Qty</th>
                    <th style={{ width: '14%' }} className="py-2 px-1 text-center border-r border-neutral-700">Lengan</th>
                    <th style={{ width: '26%' }} className="py-2 px-2">Catatan Khusus</th>
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
                          <td className="py-1.5 px-1 text-center font-mono font-bold border-r border-neutral-300 text-xs align-top">
                            {p.quantity}
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
    </div>
  );
};
