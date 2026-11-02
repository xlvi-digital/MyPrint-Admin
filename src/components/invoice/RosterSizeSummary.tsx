import React from 'react';
import { PlayerDetail } from '../../types/order';
import { getOrderSizeRecap, getOrderTotalQuantity } from '../../utils/orderSizing';

interface RosterSizeSummaryProps {
  players: PlayerDetail[];
}

export const RosterSizeSummary: React.FC<RosterSizeSummaryProps> = ({ players }) => {
  const recap = getOrderSizeRecap('roster', players);
  const totalQuantity = getOrderTotalQuantity('roster', players);

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <h3 className="text-xs font-bold text-neutral-800">REKAPITULASI UKURAN</h3>
        <span className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-[#D71920]">
          Total {totalQuantity} pcs
        </span>
      </div>
      {recap.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-neutral-500">Belum ada data ukuran</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Ukuran</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recap.map(item => (
                <tr key={item.size}>
                  <th scope="row" className="px-3 py-2 font-semibold text-neutral-700">
                    {item.size}
                  </th>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-neutral-800">
                    {item.quantity} pcs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
