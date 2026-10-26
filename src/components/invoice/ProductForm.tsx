import React, { useState } from 'react';
import { Product, COMMON_MATERIALS } from '../../types/order';
import { Shirt, Plus, DollarSign, Tag, Layers } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

interface ProductFormProps {
  product: Product;
  onChange: (product: Product) => void;
  errors?: Partial<Record<keyof Product, string>>;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onChange,
  errors = {},
}) => {
  const [customMaterialInput, setCustomMaterialInput] = useState('');
  const [showCustomMaterial, setShowCustomMaterial] = useState(false);

  const updateNumeric = (
    field: 'totalQuantity' | 'unitPrice' | 'downPayment',
    val: number
  ) => {
    const updated = {
      ...product,
      [field]: val,
    };

    // Recalculate totals
    const qty = field === 'totalQuantity' ? val : product.totalQuantity;
    const price = field === 'unitPrice' ? val : product.unitPrice;
    const dp = field === 'downPayment' ? val : product.downPayment;

    const totalPrice = qty * price;
    const remainingPayment = Math.max(0, totalPrice - dp);

    onChange({
      ...updated,
      totalPrice,
      remainingPayment,
    });
  };

  const handleMaterialSelect = (mat: string) => {
    if (mat === 'Custom') {
      setShowCustomMaterial(true);
    } else {
      setShowCustomMaterial(false);
      onChange({ ...product, material: mat });
    }
  };

  const handleAddCustomMaterial = () => {
    if (!customMaterialInput.trim()) return;
    onChange({ ...product, material: customMaterialInput.trim() });
    setShowCustomMaterial(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#D71920]" />
            <span>Detail Produk, Bahan & Kalkulasi Biaya</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Spesifikasi kain sublime, varian model jahitan, dan hitungan pembayaran (DP/Lunas).
          </p>
        </div>
        <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
          Step 2
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Jenis Produk */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-neutral-400" />
            Jenis Produk <span className="text-[#D71920]">*</span>
          </label>
          <select
            value={product.productType}
            onChange={e => onChange({ ...product, productType: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none transition-all font-medium"
          >
            <option value="Jersey Sublime">Jersey Sublime</option>
            <option value="Jersey Sublime Setelan">Jersey Sublime Setelan (Atasan + Celana)</option>
            <option value="Jersey Running / Singlet">Jersey Running / Singlet</option>
            <option value="Jaket / Hoodie Sublime">Jaket / Hoodie Sublime</option>
            <option value="Kaos Event Sublime">Kaos Event Sublime</option>
            <option value="Celana Olahraga / Lotto">Celana Olahraga / Lotto</option>
            <option value="Rompi Futsal / Basket">Rompi Futsal / Basket</option>
            <option value="Custom Apparel">Custom Apparel</option>
          </select>
          <p className="text-[10px] text-neutral-400 mt-1">Format garmen yang diproduksi</p>
        </div>

        {/* Jenis Bahan */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            Jenis Bahan <span className="text-[#D71920]">*</span>
          </label>
          {!showCustomMaterial ? (
            <div className="flex gap-1.5">
              <select
                value={COMMON_MATERIALS.includes(product.material) ? product.material : 'Custom'}
                onChange={e => handleMaterialSelect(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border font-bold text-[#D71920] outline-none transition-all ${
                  errors.material
                    ? 'border-red-400 bg-red-50/30'
                    : 'border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400'
                }`}
              >
                {COMMON_MATERIALS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCustomMaterial(true)}
                className="px-2.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold shrink-0"
                title="Input Bahan Kustom"
              >
                +
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customMaterialInput}
                onChange={e => setCustomMaterialInput(e.target.value)}
                placeholder="Nama bahan baru..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:border-[#D71920] outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomMaterial}
                className="px-3 py-2 bg-[#D71920] text-white text-xs font-semibold rounded-xl"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setShowCustomMaterial(false)}
                className="px-2.5 py-2 bg-neutral-100 text-neutral-600 text-xs rounded-xl"
              >
                ✕
              </button>
            </div>
          )}
          {errors.material && <p className="text-[11px] text-red-600 mt-1">{errors.material}</p>}
          <p className="text-[10px] text-neutral-400 mt-1">
            Saat ini: <span className="font-semibold text-neutral-800">{product.material || 'Belum dipilih'}</span>
          </p>
        </div>

        {/* Warna Dasar */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Warna Dasar / Kombinasi
          </label>
          <input
            type="text"
            value={product.color}
            onChange={e => onChange({ ...product, color: e.target.value })}
            placeholder="Contoh: Hijau Toska / Hitam"
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none transition-all font-medium"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Warna dasar kain & aksen pola</p>
        </div>

        {/* Model Pola */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Model Pola Potong
          </label>
          <select
            value={product.model}
            onChange={e => onChange({ ...product, model: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none transition-all"
          >
            <option value="Reguler Fit">Reguler Fit</option>
            <option value="Slim Fit">Slim Fit</option>
            <option value="Raglan">Pola Raglan</option>
            <option value="Singlet / Sleeveless">Singlet / Sleeveless</option>
            <option value="Oversized Streetwear">Oversized Streetwear</option>
          </select>
        </div>

        {/* Lengan */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Panjang Lengan
          </label>
          <select
            value={product.sleeve}
            onChange={e => onChange({ ...product, sleeve: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none transition-all"
          >
            <option value="Pendek">Lengan Pendek</option>
            <option value="Panjang">Lengan Panjang</option>
            <option value="3/4 (Tiga Perempat)">Lengan 3/4</option>
            <option value="Tanpa Lengan">Tanpa Lengan / Kutung</option>
            <option value="Kombinasi (Lihat Tabel)">Kombinasi (Sesuai Data Pemain)</option>
          </select>
        </div>

        {/* Rib */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Finishing Rib Kain
          </label>
          <select
            value={product.rib}
            onChange={e => onChange({ ...product, rib: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none transition-all"
          >
            <option value="Tidak Pakai Rib">Tidak Pakai Rib (Kain Langsung)</option>
            <option value="Rib Leher Saja">Rib Leher Saja</option>
            <option value="Rib Tangan Saja">Rib Tangan Saja</option>
            <option value="Rib Leher + Tangan">Rib Leher + Ujung Tangan</option>
            <option value="Rib Custom Warna">Rib Custom Warna Khusus</option>
          </select>
        </div>
      </div>

      {/* Pricing & Financials Calculator */}
      <div className="mt-5 pt-5 border-t border-neutral-100">
        <h3 className="text-xs font-bold text-neutral-800 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
          Kalkulasi Total Order & Pembayaran
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/60">
          {/* Jumlah Total Pcs */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Jumlah Total (Pcs) <span className="text-[#D71920]">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={product.totalQuantity || ''}
              onChange={e => updateNumeric('totalQuantity', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="76"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-white outline-none font-mono font-bold text-neutral-900"
            />
            <p className="text-[10px] text-neutral-400 mt-1">Disinkronkan dengan data pemain</p>
          </div>

          {/* Harga Satuan */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Harga Satuan (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="5000"
              value={product.unitPrice || ''}
              onChange={e => updateNumeric('unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="110000"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-white outline-none font-mono text-neutral-900"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              {formatRupiah(product.unitPrice)} / pcs
            </p>
          </div>

          {/* Total Harga (Calculated) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Total Tagihan
            </label>
            <div className="px-3 py-2 rounded-xl bg-neutral-200/60 text-xs font-mono font-bold text-neutral-900 flex items-center justify-between">
              <span>{formatRupiah(product.totalPrice)}</span>
              <span className="text-[10px] text-neutral-500 font-sans font-normal">Otomatis</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              {product.totalQuantity} pcs × {formatRupiah(product.unitPrice)}
            </p>
          </div>

          {/* DP / Uang Muka */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Uang Muka / DP (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="50000"
              value={product.downPayment || ''}
              onChange={e => updateNumeric('downPayment', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="4500000"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-neutral-400 bg-white outline-none font-mono text-neutral-900"
            />
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-neutral-500">Sisa Bayar:</span>
              <span className="font-mono font-bold text-[#D71920]">
                {formatRupiah(product.remainingPayment)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
