import React, { useEffect, useState } from 'react';
import { 
  Order, 
  ProductionStatus, 
  PRODUCTION_STATUS_STEPS 
} from '../types/order';
import { storageService } from '../services/storageService';
import { 
  ArrowLeft, 
  Printer, 
  Edit3, 
  Copy, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Shirt, 
  Layers, 
  DollarSign, 
  Users, 
  FileText, 
  Eye, 
  Download,
  CheckCircle2,
  Share2,
  ExternalLink,
  Sliders,
  ChevronRight,
  Stamp,
  LoaderCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatRupiah, formatDateId, cleanWhatsAppNumber } from '../utils/formatters';
import { exportPlayersToCsv } from '../utils/csvHelper';
import { displaySpecialNote, formatWhatsAppRoster } from '../utils/rosterData';
import { InvoicePreviewA4 } from '../components/invoice/InvoicePreviewA4';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EditCustomerModal, EditProductModal, EditCollarModal } from '../components/order/EditSectionModals';
import { PlayerFastPasteModal } from '../components/order/PlayerFastPasteModal';
import { PlayerDetail } from '../types/order';
import { DesignUploader } from '../components/invoice/DesignUploader';
import { getOrderSizeRecap, getOrderTotalQuantity, isValidRosterPlayer, resolveOrderInputMode } from '../utils/orderSizing';

interface OrderDetailProps {
  order: Order;
  onBack: () => void;
  onEdit: (id: string) => void;
  onPrint: (order: Order) => void;
  onDownloadPdf?: (order: Order) => Promise<void> | void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => Promise<boolean> | boolean;
  onStatusChange: (id: string, newStatus: ProductionStatus) => Promise<void> | void;
  onOrderUpdated?: (updatedOrder: Order) => Promise<boolean> | boolean;
}

export const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  onBack,
  onEdit,
  onPrint,
  onDownloadPdf,
  onDuplicate,
  onDelete,
  onStatusChange,
  onOrderUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'document'>('detail');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ProductionStatus | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isEditCollarOpen, setIsEditCollarOpen] = useState(false);
  const [isPasteRosterOpen, setIsPasteRosterOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedSizeFilters, setSelectedSizeFilters] = useState<string[]>([]);

  const { customer, product, players, printingMachines, designs, collar, notes, signoff } = order;
  const inputMode = resolveOrderInputMode(order.inputMode, players);
  const sizeFilteredPlayers = players.filter(player =>
    selectedSizeFilters.length === 0 || selectedSizeFilters.includes(player.size.trim().toUpperCase()),
  );
  const filteredOrder: Order = {
    ...order,
    players: sizeFilteredPlayers,
    printFilterSizes: selectedSizeFilters.length > 0 ? selectedSizeFilters : undefined,
    product: {
      ...product,
      totalQuantity: players.length
        ? getOrderTotalQuantity(inputMode, sizeFilteredPlayers)
        : product.totalQuantity,
    },
  };

  // Filter players inside roster table
  const filteredPlayers = sizeFilteredPlayers.filter(p => {
    if (!playerSearch) return true;
    const q = playerSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.number.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      (p.sleeve || product.sleeve).toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    );
  });

  const totalPlayerQty = players.length ? getOrderTotalQuantity(inputMode, players) : product.totalQuantity;
  const filteredSizeRecap = getOrderSizeRecap(inputMode, sizeFilteredPlayers);
  const availableSizes = getOrderSizeRecap(inputMode, players).map(item => item.size);

  useEffect(() => {
    setSelectedSizeFilters([]);
    setPlayerSearch('');
  }, [order.id]);

  // WhatsApp quick chat link
  const waNumber = cleanWhatsAppNumber(customer.phone);
  const waMessage = encodeURIComponent(
    `Halo ${customer.name}, ini update pesanan jersey #${order.orderNumber} (${product.productType} - ${product.material}) di myprintin. Status saat ini: ${order.productionStatus}.${formatWhatsAppRoster(order)}`
  );
  const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-2xs no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            title="Kembali ke Daftar Order"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-[#D71920]">
                #{order.orderNumber}
              </span>
              <StatusBadge status={order.productionStatus} size="md" />
            </div>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              Dibuat: {formatDateId(order.createdAt)} · Terakhir diupdate: {formatDateId(order.updatedAt)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-neutral-700">
              Metode: {order.salesChannel || 'Offline'} · Nomor Pesanan: {order.externalOrderNumber || 'Belum dicatat'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onEdit(order.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Order</span>
          </button>

          <button
            onClick={() => onDuplicate(order.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Duplikat pesanan dengan nomor order baru"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplikat</span>
          </button>

          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={async () => {
              if (isDownloadingPdf) return;
              setIsDownloadingPdf(true);
              try {
                if (onDownloadPdf) {
                  await onDownloadPdf(filteredOrder);
                }
              } finally {
                setIsDownloadingPdf(false);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-60 rounded-xl transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
            title="Download langsung Form Order sebagai file PDF (.pdf)"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
            <span>{isDownloadingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => onPrint(filteredOrder)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Buka dialog Cetak / Preview Form Order"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Preview</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ml-1"
            title="Hapus Order"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Production Workflow Stepper Bar (Requirement #15: DRAFT -> DESAIN -> PRINTING -> PRESS -> CUTTING -> JAHIT -> FINISHING -> SELESAI) */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs no-print">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 tracking-tight uppercase flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D71920]" />
              <span>Status Alur Kerja Produksi Workshop</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Klik tahapan produksi di bawah ini untuk memperbarui progres order secara real-time.
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-lg">
            Status: <span className="text-[#D71920]">{order.productionStatus}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PRODUCTION_STATUS_STEPS.map((st, idx) => {
            const isCurrent = order.productionStatus === st.status;
            const currentIdx = PRODUCTION_STATUS_STEPS.findIndex(s => s.status === order.productionStatus);
            const isPassed = idx < currentIdx;

            return (
              <button
                key={st.status}
                type="button"
                disabled={updatingStatus !== null}
                onClick={async () => {
                  setUpdatingStatus(st.status);
                  try {
                    await onStatusChange(order.id, st.status);
                  } finally {
                    setUpdatingStatus(null);
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer disabled:cursor-wait disabled:opacity-70 ${
                  isCurrent
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-red-500/20'
                    : isPassed
                    ? 'bg-emerald-50/60 text-emerald-900 border-emerald-200 hover:bg-emerald-100/60'
                    : 'bg-neutral-50/70 text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-neutral-400' : 'text-neutral-400'}`}>
                    0{idx + 1}
                  </span>
                  {updatingStatus === st.status
                    ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    : isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="font-bold text-xs truncate">{st.label}</div>
                <div className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-neutral-400' : 'text-neutral-400'}`}>
                  {st.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Switcher: Dossier Detail vs Live Form Order Sublime PDF */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 no-print">
        <button
          onClick={() => setActiveTab('detail')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'detail'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Dossier Detail Produksi
        </button>
        <button
          onClick={() => setActiveTab('document')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'document'
              ? 'bg-[#D71920] text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Form Order Sublime A4 (Siap Cetak)</span>
        </button>
      </div>

      {/* Tab 1: Dossier Detail */}
      {activeTab === 'detail' && (
        <div className="space-y-6">
          {/* Row 1: Customer Info & Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Customer Dossier */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Informasi Pelanggan & Pemesanan
                </h3>
                <button
                  onClick={() => setIsEditCustomerOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#D71920] hover:text-[#b8141a] px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Pelanggan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Nama Pemesan</span>
                  <div className="font-bold text-sm text-neutral-900 mt-0.5">
                    {customer.name}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Kontak WhatsApp / HP</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-xs text-neutral-900">
                      {customer.phone}
                    </span>
                    {customer.phone && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Chat WA</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Tanggal Pemesanan</span>
                  <div className="font-mono text-xs font-semibold text-neutral-800 mt-0.5">
                    {formatDateId(customer.orderDate)}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Target Deadline</span>
                  <div className="font-mono text-xs font-bold text-amber-800 mt-0.5">
                    {customer.deadlineDate ? formatDateId(customer.deadlineDate) : 'Tidak Ditentukan'}
                  </div>
                </div>

                {customer.email && (
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Email</span>
                    <div className="text-xs text-neutral-700 mt-0.5">{customer.email}</div>
                  </div>
                )}

                {customer.address && (
                  <div className="sm:col-span-2">
                    <span className="text-neutral-400 block text-[11px]">Alamat Pengiriman</span>
                    <div className="text-xs text-neutral-700 mt-0.5 leading-relaxed">
                      {customer.address}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial & Price Calculation Dossier */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Rincian Biaya & Pembayaran
                  </h3>
                  <button
                    onClick={() => setIsEditProductOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#D71920] hover:text-[#b8141a] px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Produk</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Jumlah Pesanan:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {totalPlayerQty} pcs
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Harga Satuan:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatRupiah(product.unitPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Total Tagihan:</span>
                    <span className="font-mono font-black text-sm text-neutral-900">
                      {formatRupiah(product.totalPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-500">Uang Muka / DP:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatRupiah(product.downPayment)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 bg-red-50/60 p-3 rounded-xl border border-red-200/60">
                    <span className="font-bold text-[#D71920]">Sisa Pembayaran:</span>
                    <span className="font-mono font-black text-sm text-[#D71920]">
                      {formatRupiah(product.remainingPayment)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-[11px] text-neutral-400">
                Status pembayaran diupdate saat pelunasan sebelum barang diambil.
              </div>
            </div>
          </div>

          {/* Row 2: Production Specs (Fabric, Machine, Collar, Notes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fabric & Model */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Spesifikasi Kain & Jahitan
              </h3>
              <div className="text-xs">
                <span className="text-neutral-400 block text-[10px]">Jenis Bahan:</span>
                <strong className="text-sm text-[#D71920] font-black">{product.material}</strong>
              </div>
              <div className="text-xs">
                <span className="text-neutral-400 block text-[10px]">Model & Pola:</span>
                <span className="font-semibold text-neutral-800">{product.model} · {product.sleeve}</span>
              </div>
              <div className="text-xs">
                <span className="text-neutral-400 block text-[10px]">Finishing Rib:</span>
                <span className="text-neutral-800 font-medium">{product.rib}</span>
              </div>
              <div className="text-xs">
                <span className="text-neutral-400 block text-[10px]">Warna Dasar:</span>
                <span className="text-neutral-800">{product.color || 'Custom Sublime'}</span>
              </div>
            </div>

            {/* Collar & Machine */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Kerah & Alokasi Mesin
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditCollarOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#D71920] hover:text-[#b8141a] px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Kerah</span>
                </button>
              </div>

              <div>
                <span className="text-neutral-400 block text-[10px]">Model Kerah:</span>
                <strong className="text-xs text-neutral-900 font-bold uppercase">
                  {collar.modelName || 'POLO KANCING 2'}
                </strong>

                {collar.imageUrl ? (
                  <div className="mt-2.5 flex items-center gap-3 p-2 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                    <div className="h-16 w-20 rounded-xl bg-white border border-neutral-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                      <img 
                        src={collar.imageUrl} 
                        alt={collar.modelName} 
                        className="h-full w-full object-contain" 
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mb-1">
                        Foto Referensi Aktif
                      </span>
                      <p className="text-[11px] text-neutral-500 truncate">
                        Tampil di dokumen Form Order A4
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-neutral-50/80 rounded-2xl border border-dashed border-neutral-200 text-center">
                    <span className="text-[11px] text-neutral-400 block">
                      (Belum ada referensi visual)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditCollarOpen(true)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#D71920] hover:underline"
                    >
                      <span>+ Unggah Gambar Kerah</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <span className="text-neutral-400 block text-[10px]">Mesin Printing Ditugaskan:</span>
                <div className="text-xs font-mono text-neutral-700 space-y-0.5 mt-1">
                  {printingMachines.map((m, i) => (
                    <div key={i} className="truncate">
                      {i + 1}. {m.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Workshop Approval Stamps & Notes */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stamp className="w-3.5 h-3.5 text-[#D71920]" />
                <span>Keterangan & Paraf Operator</span>
              </h3>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 font-mono text-xs font-bold text-[#D71920] uppercase whitespace-pre-line leading-relaxed">
                {notes || 'DATA TERPISAH DI HALAMAN BELAKANG'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  <span className="text-neutral-400 block text-[9px]">DESAINER:</span>
                  <strong>{signoff.designerInitial || 'BELUM PARAF'}</strong>
                </div>
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  <span className="text-neutral-400 block text-[9px]">PRESS SUBLIM:</span>
                  <strong className={signoff.pressSigned ? 'text-emerald-700' : 'text-neutral-400'}>
                    {signoff.pressSigned ? '✓ SELESAI' : 'BELUM'}
                  </strong>
                </div>
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  <span className="text-neutral-400 block text-[9px]">CUTTING POLA:</span>
                  <strong className={signoff.cuttingSigned ? 'text-emerald-700' : 'text-neutral-400'}>
                    {signoff.cuttingSigned ? '✓ SELESAI' : 'BELUM'}
                  </strong>
                </div>
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  <span className="text-neutral-400 block text-[9px]">JAHIT / OBRAS:</span>
                  <strong className={signoff.jahitSigned ? 'text-emerald-700' : 'text-neutral-400'}>
                    {signoff.jahitSigned ? '✓ SELESAI' : 'BELUM'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Design upload and editable gallery */}
          <DesignUploader
            orderId={order.id}
            designs={designs}
            materialName={product.material}
            onChange={async nextDesigns => {
              const updated = { ...order, designs: nextDesigns };
              if (onOrderUpdated) {
                const saved = await onOrderUpdated(updated);
                if (!saved) throw new Error('Perubahan desain tidak tersimpan ke database.');
              } else {
                storageService.saveOrder(updated);
              }
            }}
          />

          {/* Row 4: Player roster or quantity-by-size details */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D71920]" />
                  <span>{inputMode === 'size-quantity' ? 'Rincian Jumlah per Ukuran' : `Roster Nama Pemain & Detail Ukuran (${players.length} Data)`}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Total PCS: <strong>{totalPlayerQty} pcs</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11px] font-semibold text-neutral-600">
                  Filter ukuran
                  <select
                    multiple
                    size={Math.min(availableSizes.length || 2, 4)}
                    value={selectedSizeFilters}
                    onChange={event => setSelectedSizeFilters(Array.from(event.target.selectedOptions, option => option.value))}
                    aria-label="Filter ukuran untuk rekap dan dokumen cetak"
                    className="ml-2 min-w-24 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs"
                  >
                    {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                {selectedSizeFilters.length > 0 && (
                  <button type="button" onClick={() => setSelectedSizeFilters([])} className="rounded-xl bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200">
                    Semua Ukuran
                  </button>
                )}
                {inputMode === 'roster' && (
                  <>
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      placeholder="Cari pemain atau no punggung..."
                      className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none font-medium"
                    />
                    <button
                      onClick={() => setIsPasteRosterOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                    >
                      <span>+ Paste Pemain</span>
                    </button>
                    <button
                      onClick={() => exportPlayersToCsv(players, order.orderNumber)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <section className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3" aria-live="polite">
              <h4 className="mb-2 text-xs font-bold text-neutral-800">REKAPITULASI UKURAN</h4>
              <div className="flex flex-wrap gap-2">
                {filteredSizeRecap.length ? filteredSizeRecap.map(item => (
                  <span key={item.size} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold">
                    {item.size}: {item.quantity} PCS
                  </span>
                )) : <span className="text-xs text-neutral-500">Tidak ada data ukuran untuk filter ini.</span>}
                <strong className="ml-auto self-center font-mono text-xs text-[#D71920]">TOTAL {getOrderTotalQuantity(inputMode, sizeFilteredPlayers)} PCS</strong>
              </div>
            </section>

            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-left text-xs border-collapse">
                {inputMode === 'size-quantity' ? (
                  <>
                    <thead><tr className="bg-neutral-50 text-neutral-600 font-bold"><th className="px-3 py-2.5">Ukuran</th><th className="px-3 py-2.5 text-right">Jumlah PCS</th></tr></thead>
                    <tbody className="divide-y divide-neutral-200/60 bg-white">
                      {filteredSizeRecap.map(item => <tr key={item.size}><td className="px-3 py-2 font-bold">{item.size}</td><td className="px-3 py-2 text-right font-mono font-bold">{item.quantity}</td></tr>)}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Nama Pemain</th>
                        <th className="py-2.5 px-3 w-28 text-center">No Punggung</th>
                        <th className="py-2.5 px-3 w-28 text-center">Ukuran</th>
                        <th className="py-2.5 px-3 w-28 text-center">Jenis Lengan</th>
                        <th className="py-2.5 px-3">Catatan Khusus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 bg-white">
                      {filteredPlayers.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-neutral-50/70 font-mono text-[11px]">
                          <td className="py-2 px-3 text-center text-neutral-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-bold text-neutral-900 uppercase">{p.name || '-'}</td>
                          <td className="py-2 px-3 text-center font-bold text-neutral-800">{p.number || '-'}</td>
                          <td className="py-2 px-3 text-center font-black text-[#D71920]">{p.size}</td>
                          <td className="py-2 px-3 text-center font-sans text-neutral-700">{p.sleeve || product.sleeve || '-'}</td>
                          <td className="py-2 px-3 font-sans text-neutral-600 whitespace-pre-wrap break-words">{displaySpecialNote(p.notes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Document View (A4 Paper Print Ready) */}
      {activeTab === 'document' && (
        <div className="bg-neutral-800/10 p-6 rounded-3xl border border-neutral-200 flex flex-col items-center">
          <div className="mb-4 flex items-center justify-between w-full max-w-[780px] bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs no-print">
            <span className="text-xs font-semibold text-neutral-700">
              Dokumen Format Cetak Form Order Sublime Standar Percetakan
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={async () => {
                  if (isDownloadingPdf) return;
                  setIsDownloadingPdf(true);
                  try {
                    if (onDownloadPdf) {
                      await onDownloadPdf(filteredOrder);
                    }
                  } finally {
                    setIsDownloadingPdf(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
                <span>{isDownloadingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => onPrint(filteredOrder)}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Browser</span>
              </button>
            </div>
          </div>

          <div className="w-full max-w-[780px]">
            <InvoicePreviewA4 order={filteredOrder} mode="preview" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Hapus Order Produksi?"
        subtitle={`Order #${order.orderNumber} atas nama ${customer.name} akan dihapus secara permanen.`}
        type="danger"
        confirmText="Hapus Pesanan"
        cancelText="Batal"
        onConfirm={async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            const deleted = await onDelete(order.id);
            if (deleted) setIsDeleteModalOpen(false);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
        isProcessing={isDeleting}
        processingText="Menghapus..."
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        order={order}
        onSave={async updated => {
          if (onOrderUpdated) {
            const saved = await onOrderUpdated(updated);
            if (!saved) throw new Error('Perubahan pelanggan tidak tersimpan.');
          } else {
            storageService.saveOrder(updated);
          }
        }}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditProductOpen}
        onClose={() => setIsEditProductOpen(false)}
        order={order}
        onSave={async updated => {
          if (onOrderUpdated) {
            const saved = await onOrderUpdated(updated);
            if (!saved) throw new Error('Perubahan produk tidak tersimpan.');
          } else {
            storageService.saveOrder(updated);
          }
        }}
      />

      {/* Edit Collar & Reference Photo Modal */}
      <EditCollarModal
        isOpen={isEditCollarOpen}
        onClose={() => setIsEditCollarOpen(false)}
        order={order}
        onSave={updated => {
          storageService.saveOrder(updated);
          if (onOrderUpdated) onOrderUpdated(updated);
        }}
      />

      {/* Paste Roster Modal */}
      <PlayerFastPasteModal
        isOpen={isPasteRosterOpen}
        onClose={() => setIsPasteRosterOpen(false)}
        defaultSleeve={product.sleeve}
        onApply={(newPlayers, mode) => {
          const updatedPlayers = mode === 'replace' ? newPlayers : [...order.players, ...newPlayers];
          const totalQuantity = updatedPlayers.filter(isValidRosterPlayer).length;
          const updated: Order = {
            ...order,
            inputMode: 'roster',
            players: updatedPlayers,
            product: {
              ...order.product,
              totalQuantity,
              totalPrice: totalQuantity * order.product.unitPrice,
              remainingPayment: Math.max(0, totalQuantity * order.product.unitPrice - order.product.downPayment),
            },
          };
          storageService.saveOrder(updated);
          if (onOrderUpdated) onOrderUpdated(updated);
        }}
      />
    </div>
  );
};
