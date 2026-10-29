import React, { useState, useEffect } from 'react';
import { 
  Order, 
  Customer, 
  Product, 
  PlayerDetail, 
  PrintingMachine, 
  DesignAsset, 
  CollarSpec, 
  WorkflowSignoff,
  ProductionStatus 
} from '../types/order';
import { storageService } from '../services/storageService';
import { getTodayDateString } from '../utils/formatters';
import { generateUuid } from '../utils/uuid';
import { CustomerForm } from '../components/invoice/CustomerForm';
import { ProductForm } from '../components/invoice/ProductForm';
import { PlayerTable } from '../components/invoice/PlayerTable';
import { DesignUploader } from '../components/invoice/DesignUploader';
import { PrintingTable } from '../components/invoice/PrintingTable';
import { CollarForm } from '../components/invoice/CollarForm';
import { ProductionNotes } from '../components/invoice/ProductionNotes';
import { OrderSummaryBar } from '../components/invoice/OrderSummaryBar';
import { InvoicePreviewA4 } from '../components/invoice/InvoicePreviewA4';
import { ImportCsvModal } from '../components/invoice/ImportCsvModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SalesOrderFields } from '../components/order/SalesOrderFields';
import { useMasterData } from '../hooks/useMasterData';
import { 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Printer, 
  FileText,
  AlertTriangle,
  X
} from 'lucide-react';

interface CreateInvoiceProps {
  initialOrder?: Order | null;
  onSaved: (order: Order, andPrint?: boolean) => void;
  onCancel: () => void;
}

export const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  initialOrder,
  onSaved,
  onCancel,
}) => {
  // Onboarding banner state
  const [showHelperBanner, setShowHelperBanner] = useState(true);
  const [draftAlertOpen, setDraftAlertOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveAndPrintPending, setSaveAndPrintPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const masterData = useMasterData();

  // Initialize Default Order State
  const createDefaultOrder = (): Order => {
    const today = getTodayDateString();
    const newOrderNum = '';

    return {
      id: generateUuid(),
      orderNumber: newOrderNum,
      salesChannel: 'Offline',
      externalOrderNumber: '',
      customer: {
        name: '',
        phone: '',
        email: '',
        teamName: '',
        address: '',
        orderDate: today,
        deadlineDate: '',
        orderNumber: newOrderNum,
      },
      product: {
        productType: 'Jersey Sublime',
        material: 'Milano',
        color: '',
        model: 'Reguler Fit',
        sleeve: 'Pendek',
        rib: 'Tidak Pakai Rib',
        totalQuantity: 20,
        unitPrice: 110000,
        totalPrice: 2200000,
        downPayment: 1000000,
        remainingPayment: 1200000,
      },
      players: [
        { id: 'p-1', name: '', number: '', size: 'M', quantity: 1, notes: '' },
        { id: 'p-2', name: '', number: '', size: 'L', quantity: 1, notes: '' },
      ],
      useTableThreshold: 5,
      printingMachines: [
        { id: 'm-1', name: 'MESIN EPSON F7270' },
        { id: 'm-2', name: 'MESIN EPSON F7270' },
        { id: 'm-3', name: 'MESIN EPSON F7270' },
        { id: 'm-4', name: 'MESIN EPSON F7270' },
        { id: 'm-5', name: 'MESIN EPSON F7270' },
      ],
      designs: [],
      collar: {
        modelName: 'POLO KANCING 2',
      },
      notes: 'DATA TERPISAH DI HALAMAN BELAKANG\nTIDAK PAKAI RIB\nATASAN MILANO\nCELANA LOTTO SAKU 1',
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
  };

  const [order, setOrder] = useState<Order>(() => {
    if (initialOrder) return initialOrder;
    return createDefaultOrder();
  });

  // Check draft on mount if not editing existing order
  useEffect(() => {
    if (!initialOrder) {
      const savedDraft = storageService.getDraft();
      if (savedDraft && savedDraft.customer?.name) {
        setDraftAlertOpen(true);
      }
    }
  }, [initialOrder]);

  // Autosave to draft on changes (debounced)
  useEffect(() => {
    if (!initialOrder) {
      const timer = setTimeout(() => {
        storageService.saveDraft(order);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [order, initialOrder]);

  const handleResumeDraft = () => {
    const savedDraft = storageService.getDraft();
    if (savedDraft) {
      setOrder(prev => ({ ...prev, ...(savedDraft as Order) }));
    }
    setDraftAlertOpen(false);
  };

  const handleDiscardDraft = () => {
    storageService.clearDraft();
    setOrder(createDefaultOrder());
    setDraftAlertOpen(false);
  };

  // Sync Total Qty from Player Table
  const handleSyncTotalQty = (computedQty: number) => {
    const newQty = Math.max(1, computedQty);
    const totalPrice = newQty * (order.product.unitPrice || 0);
    const remainingPayment = Math.max(0, totalPrice - (order.product.downPayment || 0));

    setOrder(prev => ({
      ...prev,
      product: {
        ...prev.product,
        totalQuantity: newQty,
        totalPrice,
        remainingPayment,
      },
    }));
  };

  // Validate Form before opening Confirmation Modal
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!order.customer.name.trim()) {
      errors.name = 'Nama pemesan wajib diisi';
    }
    if (!order.customer.phone.trim()) {
      errors.phone = 'Nomor telepon/WA wajib diisi';
    }
    if (!order.externalOrderNumber?.trim()) {
      errors.externalOrderNumber = 'Nomor pesanan wajib diisi';
    }
    if (!order.product.material.trim()) {
      errors.material = 'Jenis bahan wajib dipilih';
    }
    if (!initialOrder) {
      if (masterData.isLoading) errors.masterData = 'Data master sedang dimuat. Coba simpan kembali sebentar lagi.';
      else if (masterData.error) errors.masterData = masterData.error;
      else {
        if (!masterData.data.product_types.some(item => item.isActive && item.name === order.product.productType)) {
          errors.productType = 'Pilih jenis produk aktif dari Data Master.';
        }
        if (!masterData.data.materials.some(item => item.isActive && item.name === order.product.material)) {
          errors.material = 'Pilih jenis bahan aktif dari Data Master.';
        }
        if (order.players.some(player => !masterData.data.jersey_sizes.some(
          size => size.isActive && (size.code === player.size || size.name === player.size),
        ))) {
          errors.playerSizes = 'Roster berisi ukuran nonaktif atau belum terdaftar. Perbarui data ukuran sebelum menyimpan order baru.';
        }
      }
    }
    if (!order.product.totalQuantity || order.product.totalQuantity <= 0) {
      errors.totalQuantity = 'Jumlah total pesanan minimal 1 pcs';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to top or show error alert
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    return true;
  };

  const handleRequestSave = (andPrint: boolean = false) => {
    if (isSaving) return;
    if (!validateForm()) return;
    setSaveError(null);
    setSaveAndPrintPending(andPrint);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (isSaving) return;
    const finalOrder: Order = {
      ...order,
      customer: {
        ...order.customer,
        orderNumber: order.orderNumber, // keep in sync
      },
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaved(finalOrder, saveAndPrintPending);
      setIsConfirmModalOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Pesanan gagal disimpan ke Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // CSV Import handler
  const handleImportCsvData = (imported: PlayerDetail[], mode: 'replace' | 'append') => {
    const updatedPlayers = mode === 'replace' ? imported : [...order.players, ...imported];
    const totalTableQty = updatedPlayers.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    setOrder(prev => ({
      ...prev,
      players: updatedPlayers,
      product: {
        ...prev.product,
        totalQuantity: totalTableQty > 0 ? totalTableQty : prev.product.totalQuantity,
        totalPrice: totalTableQty * prev.product.unitPrice,
        remainingPayment: Math.max(0, totalTableQty * prev.product.unitPrice - prev.product.downPayment),
      },
    }));
  };

  const steps = [
    { num: 1, title: 'Pemesan' },
    { num: 2, title: 'Produk & Bahan' },
    { num: 3, title: 'Upload Desain' },
    { num: 4, title: 'Data Ukuran' },
    { num: 5, title: 'Mesin & Kerah' },
    { num: 6, title: 'Keterangan' },
  ];

  const totalTableQty = order.players.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto pb-24">
      {/* Draft Notification Banner */}
      {draftAlertOpen && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-sm flex items-center justify-between gap-3 animate-in fade-in duration-200 no-print">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm">Draft sebelumnya ditemukan!</span>
              <p className="text-xs text-amber-700 mt-0.5">
                Ada draft formulir pembuatan invoice yang belum disimpan dari sesi sebelumnya.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-amber-100 rounded-xl transition-colors"
            >
              Mulai Baru
            </button>
            <button
              onClick={handleResumeDraft}
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-all shadow-xs"
            >
              Lanjutkan Draft
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Helper Panel (Requirement #4: "Cara membuat invoice") */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 mb-6 shadow-2xs no-print">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHelperBanner(!showHelperBanner)}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D71920] flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Panduan Cepat: Cara Membuat Invoice & Form Order Sublime
              </h3>
              <p className="text-xs text-neutral-400">
                Alur standar administrasi pesanan jersey myprintin dari input hingga cetak PDF
              </p>
            </div>
          </div>

          <button className="text-neutral-400 hover:text-neutral-700 p-1">
            {showHelperBanner ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showHelperBanner && (
          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { step: 'Step 1', title: 'Data Pemesan', desc: 'Isi nama tim, kontak WA & nomor order.' },
              { step: 'Step 2', title: 'Detail Bahan', desc: 'Pilih kain (Milano, Drifit) & harga.' },
              { step: 'Step 3', title: 'Upload Desain', desc: 'Unggah file visual mock-up jersey.' },
              { step: 'Step 4', title: 'Data Ukuran', desc: 'Ketik nama, no punggung, ukuran pemain.' },
              { step: 'Step 5', title: 'Periksa Preview', desc: 'Cek live pratinjau A4 di sisi kanan.' },
              { step: 'Step 6', title: 'Simpan & PDF', desc: 'Cetak langsung ke printer atau PDF.' },
            ].map(item => (
              <div key={item.step} className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/50">
                <span className="text-[10px] font-black uppercase text-[#D71920] tracking-wider block mb-1">
                  {item.step}
                </span>
                <p className="text-xs font-bold text-neutral-800">{item.title}</p>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Step Indicator (Requirement #29) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-3 mb-6 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto no-print">
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map((st, idx) => {
            const isActive = activeStep === st.num;
            return (
              <button
                key={st.num}
                type="button"
                onClick={() => setActiveStep(st.num)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#D71920] text-white shadow-xs'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-white text-[#D71920]' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {st.num}
                </span>
                <span>{st.title}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400 font-medium pl-3 border-l border-neutral-200 shrink-0">
          <span>Progres:</span>
          <strong className="text-neutral-900 font-mono">Step {activeStep} dari 6</strong>
        </div>
      </div>

      {/* MAIN SPLIT LAYOUT (Requirement #16):
          LEFT (48%): Form Input Sections
          RIGHT (52%): Real-Time Live A4 Document Preview
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Forms */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6">
          {/* Section 1: Data Pemesan */}
          <div id="step-1">
            <CustomerForm
              customer={order.customer}
              onChange={newCust => setOrder(prev => ({ ...prev, customer: newCust, orderNumber: newCust.orderNumber }))}
              errors={validationErrors as any}
            />
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <SalesOrderFields
                salesChannel={order.salesChannel}
                externalOrderNumber={order.externalOrderNumber}
                onChange={(salesChannel, externalOrderNumber) => setOrder(prev => ({
                  ...prev,
                  salesChannel,
                  externalOrderNumber,
                }))}
              />
              {validationErrors.externalOrderNumber && (
                <p className="mt-1 text-[11px] text-red-600">{validationErrors.externalOrderNumber}</p>
              )}
              {validationErrors.masterData && (
                <p className="mt-1 text-[11px] text-red-600">{validationErrors.masterData}</p>
              )}
            </div>
          </div>

          {/* Section 2: Detail Produk & Bahan */}
          <div id="step-2">
            <ProductForm
              product={order.product}
              onChange={newProd => setOrder(prev => ({ ...prev, product: newProd }))}
              errors={validationErrors as any}
              preserveLegacyValues={Boolean(initialOrder)}
            />
          </div>

          {/* Section 3: Upload Desain */}
          <div id="step-3">
            <DesignUploader
              orderId={order.id}
              designs={order.designs}
              onChange={newDesigns => setOrder(prev => ({ ...prev, designs: newDesigns }))}
              materialName={order.product.material}
            />
          </div>

          {/* Section 4: Data Pemain & Detail Ukuran */}
          <div id="step-4">
            {validationErrors.playerSizes && (
              <p className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{validationErrors.playerSizes}</p>
            )}
            <PlayerTable
              players={order.players}
              onChange={newPlayers => setOrder(prev => ({ ...prev, players: newPlayers }))}
              targetTotalQty={order.product.totalQuantity}
              onSyncTotalQty={handleSyncTotalQty}
              defaultSleeve={order.product.sleeve}
              onOpenImportCsv={() => setIsCsvModalOpen(true)}
              orderNumber={order.orderNumber}
              preserveLegacySizes={Boolean(initialOrder)}
            />
          </div>

          {/* Section 5: Printing Machine Allocation */}
          <div id="step-5">
            <PrintingTable
              machines={order.printingMachines}
              onChange={newMachines => setOrder(prev => ({ ...prev, printingMachines: newMachines }))}
            />
          </div>

          {/* Section 6: Model Kerah */}
          <div id="step-6">
            <CollarForm
              orderId={order.id}
              collar={order.collar}
              onChange={newCollar => setOrder(prev => ({ ...prev, collar: newCollar }))}
              preserveLegacyValues={Boolean(initialOrder)}
            />
          </div>

          {/* Section 7: Keterangan Produksi & Approval Stamps */}
          <div id="step-7">
            <ProductionNotes
              notes={order.notes}
              onChangeNotes={n => setOrder(prev => ({ ...prev, notes: n }))}
              signoff={order.signoff}
              onChangeSignoff={s => setOrder(prev => ({ ...prev, signoff: s }))}
            />
          </div>
        </div>

        {/* Right Column: Live Real-Time A4 Invoice Preview */}
        <div className="lg:col-span-6 xl:col-span-6 sticky top-20 no-print">
          <div className="bg-neutral-800/5 p-4 rounded-3xl border border-neutral-200/90 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-neutral-800 tracking-tight">
                  Pratinjau Langsung (A4 Live Preview)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenPreviewOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestSave(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#D71920] hover:text-white hover:bg-[#D71920] bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak A4</span>
                </button>
              </div>
            </div>

            {/* Scrollable A4 Document Container */}
            <div className="max-h-[82vh] overflow-y-auto pr-1">
              <InvoicePreviewA4 order={order} mode="preview" />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Order Summary & Actions Bar (Requirements #19, #30) */}
      <OrderSummaryBar
        order={order}
        onSave={() => handleRequestSave(false)}
        onSaveAndPrint={() => handleRequestSave(true)}
        onOpenPreview={() => setIsFullscreenPreviewOpen(true)}
        onPrintPdf={() => handleRequestSave(true)}
        onClearDraft={handleDiscardDraft}
      />

      {/* Confirmation Modal before Saving (Requirement #31) */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Periksa Order Sebelum Simpan"
        subtitle="Pastikan seluruh data pemesan, bahan, dan detail ukuran sudah benar."
        type="review"
        confirmText="Simpan Invoice"
        cancelText="Kembali Edit"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmModalOpen(false)}
        isProcessing={isSaving}
        processingText="Menyimpan..."
      >
        <div className="space-y-3 font-sans text-xs">
          {saveError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700" role="alert">{saveError}</p>}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">Pemesan</span>
              <strong className="text-neutral-900 text-sm">{order.customer.name || '-'}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">No. Order</span>
              <strong className="text-[#D71920] font-mono text-sm">{order.orderNumber}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">Bahan & Produk</span>
              <strong className="text-neutral-800">{order.product.productType} ({order.product.material})</strong>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">Total Order</span>
              <strong className="text-neutral-900 font-mono text-sm">{order.product.totalQuantity} pcs</strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <span className="text-neutral-600">Roster Data Ukuran Pemain:</span>
            <strong className="font-mono text-neutral-900">
              {order.players.length} baris ({totalTableQty} pcs)
            </strong>
          </div>

          {order.product.totalQuantity !== totalTableQty && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan:</strong> Total order ({order.product.totalQuantity} pcs) berbeda dengan jumlah tabel pemain ({totalTableQty} pcs). Anda tetap dapat menyimpan invoice ini.
              </span>
            </div>
          )}
        </div>
      </ConfirmModal>

      {/* CSV Import Modal */}
      <ImportCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportCsvData}
      />

      {/* Fullscreen Preview Modal */}
      {isFullscreenPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 no-print">
          <div className="relative max-w-4xl w-full bg-neutral-100 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 bg-white border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D71920]" />
                <h3 className="font-bold text-neutral-900 text-sm">
                  Pratinjau Dokumen Cetak Form Order Sublime
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsFullscreenPreviewOpen(false);
                    handleRequestSave(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#D71920] text-white rounded-xl text-xs font-bold hover:bg-[#b8141a]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setIsFullscreenPreviewOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <InvoicePreviewA4 order={order} mode="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
