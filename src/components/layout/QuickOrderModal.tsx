import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Zap, 
  Shirt, 
  Layers, 
  User, 
  Phone, 
  Hash, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Order, COMMON_MATERIALS, COMMON_COLLARS } from '../../types/order';
import { getTodayDateString } from '../../utils/formatters';
import { generateUuid } from '../../utils/uuid';
import { WhatsAppParserModal } from '../order/WhatsAppParserModal';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: Order) => Promise<Order | void> | Order | void;
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [teamName, setTeamName] = useState('');
  const [productType, setProductType] = useState('Jersey Sublime');
  const [material, setMaterial] = useState('Milano');
  const [collarModel, setCollarModel] = useState('POLO KANCING 2');
  const [quantity, setQuantity] = useState<number>(20);
  const [unitPrice, setUnitPrice] = useState<number>(110000);
  const [usePlayerDetails, setUsePlayerDetails] = useState(false);
  const [notes, setNotes] = useState('');
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftOrderId, setDraftOrderId] = useState(() => generateUuid());

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'Nama pemesan wajib diisi';
    if (!phone.trim()) err.phone = 'No WhatsApp wajib diisi';
    if (!quantity || quantity <= 0) err.quantity = 'Jumlah pcs minimal 1';

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const orderNumber = '';
    const totalPrice = quantity * unitPrice;
    const newId = draftOrderId;

    const newOrder: Order = {
      id: newId,
      orderNumber,
      customer: {
        name: name.trim().toUpperCase(),
        phone: phone.trim(),
        teamName: teamName.trim().toUpperCase(),
        orderDate: getTodayDateString(),
        orderNumber,
      },
      product: {
        productType,
        material,
        color: '',
        model: 'Reguler Fit',
        sleeve: 'Pendek',
        rib: 'Tidak Pakai Rib',
        totalQuantity: quantity,
        unitPrice,
        totalPrice,
        downPayment: Math.round(totalPrice * 0.5),
        remainingPayment: Math.round(totalPrice * 0.5),
      },
      players: [],
      useTableThreshold: 5,
      printingMachines: [
        { id: 'm1', name: 'MESIN EPSON F7270' },
        { id: 'm2', name: 'MESIN EPSON F7270' },
      ],
      designs: [],
      collar: {
        modelName: collarModel || 'POLO KANCING 2',
      },
      notes: notes || 'DATA TERPISAH DI HALAMAN BELAKANG\nTIDAK PAKAI RIB',
      productionStatus: 'DRAFT',
      signoff: {
        designerName: '',
        designerInitial: '',
        pressSigned: false,
        cuttingSigned: false,
        jahitSigned: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onCreated(newOrder);
      setDraftOrderId(generateUuid());
      onClose();
    } catch (saveErr: any) {
      console.error('[QuickOrderModal] Save failed:', saveErr);
      setSubmitError(saveErr.message || 'Gagal menyimpan pesanan ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyWhatsApp = (res: any) => {
    if (res.customerName) setName(res.customerName);
    if (res.phone) setPhone(res.phone);
    if (res.teamName) setTeamName(res.teamName);
    if (res.material) setMaterial(res.material);
    if (res.quantity) setQuantity(res.quantity);
    if (res.productType) setProductType(res.productType);
    if (res.notes && res.notes.length > 0) setNotes(res.notes.join('\n'));
    if (res.players && res.players.length > 0) setUsePlayerDetails(true);
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 no-print overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] max-h-[90dvh] border border-neutral-200/90 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Top Header - Always visible within frame */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#D71920] text-white flex items-center justify-center shadow-xs shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-neutral-900 text-base truncate">Quick Order Baru</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-bold shrink-0">
                  ~30 detik
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                Input data inti saja. Roster pemain & desain dapat dilengkapi kemudian.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors shrink-0 ml-2"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Shortcut Banner: WhatsApp Fast Import */}
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => setIsWaModalOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 transition-colors text-xs font-semibold group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Punya chat order dari WhatsApp? <strong>Paste & Parse Otomatis</strong></span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Compact Form Fields */}
          <div className="p-5 space-y-3.5">
          {/* Row 1: Nama Pemesan & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Nama Pemesan <span className="text-[#D71920]">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase())}
                placeholder="CONTOH: PASDAMAN / BUDI"
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold uppercase ${
                  errors.name ? 'border-red-400 bg-red-50/40' : 'border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920]'
                }`}
              />
              {errors.name && <p className="text-[10px] text-red-600 mt-0.5">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                No. WhatsApp <span className="text-[#D71920]">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="082128346174"
                className={`w-full px-3 py-2 text-xs rounded-xl border font-mono outline-none font-bold ${
                  errors.phone ? 'border-red-400 bg-red-50/40' : 'border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920]'
                }`}
              />
              {errors.phone && <p className="text-[10px] text-red-600 mt-0.5">{errors.phone}</p>}
            </div>
          </div>

          {/* Row 2: Tim & Produk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Nama Tim / Instansi (Opsional)
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value.toUpperCase())}
                placeholder="PASDAMA PASKIBRA"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920] outline-none font-semibold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Jenis Produk
              </label>
              <select
                value={productType}
                onChange={e => setProductType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-semibold cursor-pointer"
              >
                <option value="Jersey Sublime">Jersey Sublime</option>
                <option value="Jersey Sublime Setelan">Jersey Sublime Setelan</option>
                <option value="Jersey Running / Singlet">Jersey Running / Singlet</option>
                <option value="Jaket / Hoodie Sublime">Jaket / Hoodie Sublime</option>
                <option value="Kaos Event Sublime">Kaos Event Sublime</option>
              </select>
            </div>
          </div>

          {/* Row 3: Bahan & Jumlah Pcs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Jenis Bahan <span className="text-[#D71920]">*</span>
              </label>
              <select
                value={material}
                onChange={e => setMaterial(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-black text-[#D71920] cursor-pointer"
              >
                {COMMON_MATERIALS.filter(m => m !== 'Custom').map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Total Jumlah (Pcs) <span className="text-[#D71920]">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity || ''}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920] outline-none font-mono font-black text-neutral-900"
              />
            </div>
          </div>

          {/* Model Kerah */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Model Kerah
            </label>
            <select
              value={collarModel}
              onChange={e => setCollarModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-bold text-neutral-800 cursor-pointer"
            >
              {COMMON_COLLARS.filter(c => c !== 'CUSTOM').map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Notes textarea */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              Catatan Produksi Singkat
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Tidak pakai rib, atasan Milano, celana Lotto saku 1"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 focus:border-[#D71920] outline-none uppercase"
            />
          </div>
        </div>

        {/* Submit Error Alert */}
        {submitError && (
          <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs flex items-center justify-between gap-2">
            <span className="font-medium">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-700 font-bold px-1.5"
            >
              ✕
            </button>
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50/90 border-t border-neutral-200/80 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-neutral-400 hidden sm:block">
            Tekan <kbd className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded font-mono font-bold">Ctrl+Enter</kbd> untuk simpan cepat
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-semibold text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
            >
              <Zap className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Menyimpan ke Supabase...' : 'Buat Order Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nested WhatsApp parser */}
      <WhatsAppParserModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        onApplyParsed={handleApplyWhatsApp}
      />
    </div>
  );
};
