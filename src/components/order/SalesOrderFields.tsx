import React, { useEffect, useState } from 'react';
import { SalesChannel } from '../../types/order';

interface SalesOrderFieldsProps {
  salesChannel?: SalesChannel;
  orderNumber?: string;
  externalOrderNumber?: string;
  onChange: (salesChannel: SalesChannel, externalOrderNumber: string) => void;
  compact?: boolean;
}

export const SalesOrderFields: React.FC<SalesOrderFieldsProps> = ({
  salesChannel = 'Offline',
  orderNumber = '',
  externalOrderNumber = '',
  onChange,
  compact = false,
}) => {
  const [manualNumbers, setManualNumbers] = useState({
    Shopee: salesChannel === 'Shopee' ? externalOrderNumber : '',
    Tokopedia: salesChannel === 'Tokopedia' ? externalOrderNumber : '',
  });

  useEffect(() => {
    if (salesChannel !== 'Offline') {
      setManualNumbers(current => ({ ...current, [salesChannel]: externalOrderNumber }));
    }
  }, [externalOrderNumber, salesChannel]);

  return (
    <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <label className="block text-xs font-semibold text-neutral-700">
        Metode Pesanan <span className="text-[#D71920]">*</span>
        <select
          required
          value={salesChannel}
          onChange={event => {
            const nextChannel = event.target.value as SalesChannel;
            onChange(nextChannel, nextChannel === 'Offline' ? '' : manualNumbers[nextChannel]);
          }}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#D71920]"
        >
          <option value="Offline">Offline</option>
          <option value="Shopee">Shopee</option>
          <option value="Tokopedia">Tokopedia</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-neutral-700">
        {salesChannel === 'Offline' ? 'Nomor Pesanan Offline' : `Nomor Pesanan ${salesChannel}`}
        {salesChannel === 'Offline' ? (
          <>
            <input
              value={orderNumber}
              readOnly
              placeholder="Dibuat otomatis saat disimpan"
              aria-label="Nomor pesanan Offline otomatis"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-mono font-bold text-neutral-600 outline-none"
            />
            <span className="mt-1 block text-[10px] font-normal text-neutral-400">
              Dibuat otomatis oleh sistem saat order disimpan.
            </span>
          </>
        ) : (
          <>
            <input
              required
              maxLength={120}
              value={externalOrderNumber}
              onChange={event => {
                const value = event.target.value;
                setManualNumbers(current => ({ ...current, [salesChannel]: value }));
                onChange(salesChannel, value);
              }}
              placeholder={`Masukkan nomor pesanan ${salesChannel}`}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#D71920]"
            />
          </>
        )}
      </label>
    </div>
  );
};
