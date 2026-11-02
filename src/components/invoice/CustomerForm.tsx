import React from 'react';
import { Customer } from '../../types/order';
import { User, Phone, Mail, MapPin, Calendar, Hash } from 'lucide-react';

interface CustomerFormProps {
  customer: Customer;
  onChange: (customer: Customer) => void;
  errors?: Partial<Record<keyof Customer, string>>;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onChange,
  errors = {},
}) => {
  const updateField = (field: keyof Customer, value: string) => {
    onChange({
      ...customer,
      [field]: value,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <User className="w-4 h-4 text-[#D71920]" />
            <span>Data Pemesan & Kontak</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Informasi identitas pelanggan, kontak WhatsApp, dan tanggal tenggat.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
          Step 1
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nomor Order */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-neutral-400" />
              Nomor Order
            </span>
          </label>
          <input
            type="text"
            value={customer.orderNumber}
            readOnly
            placeholder="Dibuat otomatis saat disimpan"
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-100 font-mono font-bold tracking-wide text-neutral-600 outline-none"
          />
          {errors.orderNumber && (
            <p className="text-[11px] text-red-600 mt-1">{errors.orderNumber}</p>
          )}
          <p className="text-[10px] text-neutral-400 mt-1">Nomor unik dialokasikan saat pesanan disimpan</p>
        </div>

        {/* Nama Pemesan */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-neutral-400" />
            Nama Pemesan <span className="text-[#D71920]">*</span>
          </label>
          <input
            type="text"
            value={customer.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="Contoh: 2610205SQTYEP6 atau BUDI SANTOSO"
            className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all font-medium ${
              errors.name
                ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                : 'border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white'
            }`}
          />
          {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
          <p className="text-[10px] text-neutral-400 mt-1">Nama pemesan perorangan / kode akun</p>
        </div>

        {/* No WhatsApp / Telepon */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-neutral-400" />
            No. WhatsApp / Telepon <span className="text-[#D71920]">*</span>
          </label>
          <input
            type="text"
            value={customer.phone}
            onChange={e => updateField('phone', e.target.value)}
            placeholder="Contoh: +62 821-2834-6174"
            className={`w-full px-3 py-2 text-xs rounded-xl border font-mono outline-none transition-all ${
              errors.phone
                ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                : 'border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white'
            }`}
          />
          {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
          <p className="text-[10px] text-neutral-400 mt-1">Nomor aktif untuk konfirmasi produksi</p>
        </div>

        {/* Tanggal Order */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            Tanggal Order <span className="text-[#D71920]">*</span>
          </label>
          <input
            type="date"
            value={customer.orderDate}
            onChange={e => updateField('orderDate', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white outline-none transition-all"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Tanggal nota dibuat</p>
        </div>

        {/* Tanggal Deadline */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            Target Deadline
          </label>
          <input
            type="date"
            value={customer.deadlineDate || ''}
            onChange={e => updateField('deadlineDate', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white outline-none transition-all"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Estimasi barang harus selesai dikirim</p>
        </div>

        {/* Email */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-neutral-400" />
            Email Pemesan
          </label>
          <input
            type="email"
            value={customer.email || ''}
            onChange={e => updateField('email', e.target.value)}
            placeholder="pemesan@example.com"
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white outline-none transition-all"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Untuk kirim salinan invoice digital</p>
        </div>

        {/* Alamat Pengiriman */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            Alamat Pengiriman / Workshop Pick-up
          </label>
          <input
            type="text"
            value={customer.address || ''}
            onChange={e => updateField('address', e.target.value)}
            placeholder="Alamat lengkap tujuan kirim ekspedisi / kurir"
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-neutral-50/50 focus:bg-white outline-none transition-all"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Sertakan kecamatan/kota untuk kalkulasi ongkir</p>
        </div>
      </div>
    </div>
  );
};
