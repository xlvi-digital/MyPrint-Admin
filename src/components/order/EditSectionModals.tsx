import React, { useState, useEffect } from 'react';
import { X, Check, User, Shirt, FileText, Printer, Sparkles } from 'lucide-react';
import { Order, Customer, Product, CollarSpec, COMMON_MATERIALS, COMMON_COLLARS } from '../../types/order';
import { CollarUploadControl } from './CollarUploadControl';
import { supabaseOrderService } from '../../services/supabase/orderService';

interface EditModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
  order: Order;
}

export const EditCustomerModal: React.FC<EditModalBaseProps> = ({ isOpen, onClose, onSave, order }) => {
  const [customer, setCustomer] = useState<Customer>({ ...order.customer });
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...order,
      customer: {
        ...customer,
        name: customer.name.toUpperCase(),
        teamName: customer.teamName?.toUpperCase(),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden">
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#D71920]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Edit Data Pelanggan #{order.orderNumber}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Nama Pemesan</label>
            <input
              type="text"
              required
              value={customer.name}
              onChange={e => setCustomer({ ...customer, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:border-[#D71920] outline-none font-bold uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">No. WhatsApp</label>
            <input
              type="text"
              required
              value={customer.phone}
              onChange={e => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:border-[#D71920] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Nama Tim / Komunitas</label>
            <input
              type="text"
              value={customer.teamName || ''}
              onChange={e => setCustomer({ ...customer, teamName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:border-[#D71920] outline-none uppercase font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Tanggal Order</label>
              <input
                type="date"
                value={customer.orderDate}
                onChange={e => setCustomer({ ...customer, orderDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Target Deadline</label>
              <input
                type="date"
                value={customer.deadlineDate || ''}
                onChange={e => setCustomer({ ...customer, deadlineDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Alamat Pengiriman</label>
            <textarea
              rows={2}
              value={customer.address || ''}
              onChange={e => setCustomer({ ...customer, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-neutral-600">
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#D71920] text-white font-bold rounded-xl hover:bg-[#b8141a]"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditProductModal: React.FC<EditModalBaseProps> = ({ isOpen, onClose, onSave, order }) => {
  const [product, setProduct] = useState<Product>({ ...order.product });
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalPrice = product.totalQuantity * product.unitPrice;
    const remainingPayment = Math.max(0, totalPrice - product.downPayment);

    onSave({
      ...order,
      product: {
        ...product,
        totalPrice,
        remainingPayment,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden">
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#D71920]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Edit Spesifikasi & Biaya #{order.orderNumber}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Jenis Produk</label>
            <select
              value={product.productType}
              onChange={e => setProduct({ ...product, productType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none font-semibold"
            >
              <option value="Jersey Sublime">Jersey Sublime</option>
              <option value="Jersey Sublime Setelan">Jersey Sublime Setelan</option>
              <option value="Jersey Running / Singlet">Jersey Running / Singlet</option>
              <option value="Jaket / Hoodie Sublime">Jaket / Hoodie Sublime</option>
              <option value="Kaos Event Sublime">Kaos Event Sublime</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Bahan Kain</label>
              <select
                value={product.material}
                onChange={e => setProduct({ ...product, material: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none font-bold text-[#D71920]"
              >
                {COMMON_MATERIALS.filter(m => m !== 'Custom').map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">Total Pcs</label>
              <input
                type="number"
                min="1"
                value={product.totalQuantity}
                onChange={e => setProduct({ ...product, totalQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none font-mono font-bold text-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Model Pola</label>
              <input
                type="text"
                value={product.model}
                onChange={e => setProduct({ ...product, model: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Lengan</label>
              <input
                type="text"
                value={product.sleeve}
                onChange={e => setProduct({ ...product, sleeve: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                step="5000"
                value={product.unitPrice}
                onChange={e => setProduct({ ...product, unitPrice: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Uang Muka / DP (Rp)</label>
              <input
                type="number"
                step="50000"
                value={product.downPayment}
                onChange={e => setProduct({ ...product, downPayment: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-neutral-600">
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#D71920] text-white font-bold rounded-xl hover:bg-[#b8141a]"
            >
              Simpan Produk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditCollarModal: React.FC<EditModalBaseProps> = ({ isOpen, onClose, onSave, order }) => {
  const [collar, setCollar] = useState<CollarSpec>({
    modelName: order.collar?.modelName || 'POLO KANCING 2',
    imageUrl: order.collar?.imageUrl,
    imagePath: order.collar?.imagePath,
    updatedAt: order.collar?.updatedAt,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCollar({
        modelName: order.collar?.modelName || 'POLO KANCING 2',
        imageUrl: order.collar?.imageUrl,
        imagePath: order.collar?.imagePath,
        updatedAt: order.collar?.updatedAt,
      });
      setSaveError(null);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const originalImagePath = order.collar?.imagePath || order.collar?.imageUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await supabaseOrderService.updateCollar(
        order.id,
        collar,
        originalImagePath
      );

      if (!result.success) {
        throw new Error(result.error || 'Gagal menyimpan perubahan kerah.');
      }

      const updatedOrder: Order = {
        ...order,
        collar,
        updatedAt: new Date().toISOString(),
      };

      onSave(updatedOrder);
      onClose();
    } catch (err: any) {
      console.error('[EditCollarModal] Save failed:', err);
      setSaveError(err.message || 'Gagal menyimpan perubahan ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#D71920]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              Edit Model & Foto Kerah #{order.orderNumber}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <p className="text-[11px] text-neutral-500">
            Foto referensi kerah akan otomatis ditampilkan pada dokumen cetak <strong>Form Order Sublime A4</strong> untuk panduan bagian penjahitan.
          </p>

          <CollarUploadControl
            orderId={order.id}
            value={collar}
            onChange={(newCollar) => setCollar(newCollar)}
            disabled={isSaving}
          />

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">
              {saveError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving}
              className="px-4 py-2 font-semibold text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white font-bold rounded-xl shadow-sm shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan ke Cloud...' : 'Simpan Model Kerah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

