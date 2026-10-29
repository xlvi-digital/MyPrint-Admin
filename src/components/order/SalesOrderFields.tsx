import React from 'react';
import { SalesChannel } from '../../types/order';

interface SalesOrderFieldsProps {
  salesChannel?: SalesChannel;
  externalOrderNumber?: string;
  onChange: (salesChannel: SalesChannel, externalOrderNumber: string) => void;
  compact?: boolean;
}

export const SalesOrderFields: React.FC<SalesOrderFieldsProps> = ({
  salesChannel = 'Offline',
  externalOrderNumber = '',
  onChange,
  compact = false,
}) => {
  const channelLabels: Record<SalesChannel, string> = {
    Offline: 'Nomor Pesanan Offline',
    Shopee: 'Nomor Pesanan Shopee',
    Tokopedia: 'Nomor Pesanan Tokopedia',
  };

  return (
    <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <label className="block text-xs font-semibold text-neutral-700">
        Metode Pesanan <span className="text-[#D71920]">*</span>
        <select
          required
          value={salesChannel}
          onChange={event => onChange(event.target.value as SalesChannel, externalOrderNumber)}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#D71920]"
        >
          <option value="Offline">Offline</option>
          <option value="Shopee">Shopee</option>
          <option value="Tokopedia">Tokopedia</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-neutral-700">
        {channelLabels[salesChannel]} <span className="text-[#D71920]">*</span>
        <input
          required
          maxLength={120}
          value={externalOrderNumber}
          onChange={event => onChange(salesChannel, event.target.value)}
          placeholder={
            salesChannel === 'Offline'
              ? 'Masukkan nomor pesanan manual'
              : `Masukkan nomor pesanan ${salesChannel}`
          }
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#D71920]"
        />
        <span className="mt-1 block text-[10px] font-normal text-neutral-400">
          Nomor tetap dipertahankan saat metode diganti. Periksa dan sesuaikan bila diperlukan.
        </span>
      </label>
    </div>
  );
};
