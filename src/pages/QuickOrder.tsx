import React, { useState, useEffect } from "react";
import {
  Order,
  SalesChannel,
  PlayerDetail,
  DesignAsset,
  WhatsAppParseResult,
  CollarSpec,
} from "../types/order";
import { storageService } from "../services/storageService";
import { supabaseStorageService } from "../services/supabase/storageService";
import { CollarUploadControl } from "../components/order/CollarUploadControl";
import {
  getTodayDateString,
  formatRupiah,
} from "../utils/formatters";
import { generateUuid } from "../utils/uuid";
import {
  Zap,
  MessageSquare,
  Plus,
  Trash2,
  ClipboardPaste,
  Shirt,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Check,
  Sparkles,
  Sliders,
  LoaderCircle,
} from "lucide-react";
import { WhatsAppParserModal } from "../components/order/WhatsAppParserModal";
import { PlayerFastPasteModal } from "../components/order/PlayerFastPasteModal";
import { ImportCsvModal } from "../components/invoice/ImportCsvModal";
import { DesignUploader } from "../components/invoice/DesignUploader";
import { RosterSizeSummary } from "../components/invoice/RosterSizeSummary";
import { SizeQuantityTable } from "../components/invoice/SizeQuantityTable";
import { getOrderTotalQuantity, isValidRosterPlayer, isValidSizeQuantity } from "../utils/orderSizing";
import { InvoicePreviewA4 } from "../components/invoice/InvoicePreviewA4";
import { SalesOrderFields } from "../components/order/SalesOrderFields";
import { useMasterData } from "../hooks/useMasterData";

interface QuickOrderProps {
  onOrderCreated: (order: Order) => Promise<Order | void> | Order | void;
  onCancel: () => void;
  initialWhatsAppData?: WhatsAppParseResult | null;
  onInitialWhatsAppDataApplied?: () => void;
}

export const QuickOrder: React.FC<QuickOrderProps> = ({
  onOrderCreated,
  onCancel,
  initialWhatsAppData,
  onInitialWhatsAppDataApplied,
}) => {
  // Primary Mandatory Fields (Section 6 & 35)
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [productType, setProductType] = useState("Jersey Sublime");
  const [material, setMaterial] = useState("Milano");
  const [unitPrice, setUnitPrice] = useState<number>(110000);
  const [salesChannel, setSalesChannel] = useState<SalesChannel>("Offline");
  const [externalOrderNumber, setExternalOrderNumber] = useState("");
  const masterData = useMasterData();

  // Progressive Disclosure Toggles (Section 7 & 17)
  const [enablePlayers, setEnablePlayers] = useState(false);
  const [enableDesigns, setEnableDesigns] = useState(false);
  const [enableCollarRib, setEnableCollarRib] = useState(false);

  // Secondary Data
  const [players, setPlayers] = useState<PlayerDetail[]>([]);
  const [sizeQuantities, setSizeQuantities] = useState<PlayerDetail[]>([]);
  const [designs, setDesigns] = useState<DesignAsset[]>([]);
  const [collarSpec, setCollarSpec] = useState<CollarSpec>({
    modelName: "POLO KANCING 2",
  });
  const [pendingCollarFile, setPendingCollarFile] = useState<
    File | undefined
  >();
  const [ribType, setRibType] = useState("Tidak Pakai Rib");
  const [notes, setNotes] = useState(
    "DATA TERPISAH DI HALAMAN BELAKANG\nTIDAK PAKAI RIB",
  );
  const [deadlineDate, setDeadlineDate] = useState("");

  // Modals & Submission States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isPasteRosterModalOpen, setIsPasteRosterModalOpen] = useState(false);
  const [isRosterImportModalOpen, setIsRosterImportModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftOrderId, setDraftOrderId] = useState<string>(() =>
    generateUuid(),
  );

  // Recalculate price
  const inputMode = enablePlayers ? 'roster' : 'size-quantity';
  const activeSizeRows = enablePlayers ? players : sizeQuantities;
  const quantity = getOrderTotalQuantity(inputMode, activeSizeRows);
  const totalPrice = quantity * (unitPrice || 0);

  // Handle WhatsApp parsed data application
  const handleApplyWhatsApp = (res: WhatsAppParseResult) => {
    if (res.customerName) setCustomerName(res.customerName);
    if (res.phone) setPhone(res.phone);
    if (res.material) setMaterial(res.material);
    if (res.productType) setProductType(res.productType);
    if (res.rib) {
      setRibType(res.rib);
    }
    if (res.collar) {
      setCollarSpec((prev) => ({ ...prev, modelName: res.collar! }));
    }
    if (res.notes && res.notes.length > 0) {
      setNotes(res.notes.join("\n"));
    }
    if (res.players && res.players.length > 0) {
      const playerDetails: PlayerDetail[] = res.players.map((p, idx) => ({
        id: `p-${Date.now()}-${idx}`,
        name: p.name,
        number: p.number,
        size: p.size,
        quantity: 1,
      }));
      setPlayers(playerDetails);
    }
  };

  useEffect(() => {
    if (!initialWhatsAppData) return;
    handleApplyWhatsApp(initialWhatsAppData);
    onInitialWhatsAppDataApplied?.();
  }, [initialWhatsAppData, onInitialWhatsAppDataApplied]);

  const handleAddPlayerRow = () => {
    setPlayers((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: "",
        number: "",
        size: "L",
        quantity: 1,
      },
    ]);
  };

  const handleUpdatePlayer = (
    id: string,
    field: keyof PlayerDetail,
    val: any,
  ) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    );
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleApplyPastedRoster = (
    imported: PlayerDetail[],
    mode: "replace" | "append",
  ) => {
    const updatedPlayers = (mode === "replace" ? imported : [...players, ...imported])
      .map(player => ({ ...player, quantity: 1 }));
    setPlayers(updatedPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const err: Record<string, string> = {};

    if (!customerName.trim()) err.customerName = "Nama pemesan wajib diisi";
    if (!phone.trim()) err.phone = "No WhatsApp wajib diisi";
    if (!quantity) err.quantity = "Isi setidaknya satu baris ukuran yang valid.";
    if (salesChannel !== "Offline" && !externalOrderNumber.trim()) err.externalOrderNumber = "Nomor pesanan wajib diisi";
    if (masterData.isLoading) err.masterData = "Data master masih dimuat. Coba simpan kembali sebentar lagi.";
    else if (masterData.error) err.masterData = masterData.error;
    else {
      if (!masterData.data.product_types.some(item => item.isActive && item.name === productType)) err.productType = "Pilih jenis produk aktif dari Data Master.";
      if (!masterData.data.materials.some(item => item.isActive && item.name === material)) err.material = "Pilih jenis bahan aktif dari Data Master.";
      const validRows = enablePlayers ? players.filter(isValidRosterPlayer) : sizeQuantities.filter(isValidSizeQuantity);
      if (validRows.some(player => !masterData.data.jersey_sizes.some(
        size => size.isActive && (size.code === player.size || size.name === player.size),
      ))) err.playerSizes = "Roster berisi ukuran nonaktif atau belum terdaftar.";
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const orderNumber = "";
    const newId = draftOrderId;

    const newOrder: Order = {
      id: newId,
      orderNumber,
      salesChannel,
      externalOrderNumber: salesChannel === "Offline" ? "" : externalOrderNumber.trim(),
      customer: {
        name: customerName.trim().toUpperCase(),
        phone: phone.trim(),
        orderDate: getTodayDateString(),
        deadlineDate,
        orderNumber,
      },
      product: {
        productType,
        material,
        color: "",
        model: "Reguler Fit",
        sleeve: "Pendek",
        rib: enableCollarRib ? ribType : "Tidak Pakai Rib",
        totalQuantity: quantity,
        unitPrice,
        totalPrice,
        downPayment: Math.round(totalPrice * 0.5),
        remainingPayment: Math.round(totalPrice * 0.5),
      },
      inputMode,
      players: activeSizeRows,
      useTableThreshold: 5,
      printingMachines: [
        { id: "m1", name: "MESIN EPSON F7270" },
        { id: "m2", name: "MESIN EPSON F7270" },
      ],
      designs: enableDesigns ? designs : [],
      features: {
        designs: enableDesigns,
        collarRib: enableCollarRib,
        notes: enableCollarRib,
      },
      collar: enableCollarRib ? { ...collarSpec } : { modelName: "POLO KANCING 2" },
      notes: enableCollarRib ? (notes || "DATA TERPISAH DI HALAMAN BELAKANG") : "",
      productionStatus: "DRAFT",
      signoff: {
        designerName: "",
        designerInitial: "",
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
      // If user selected a collar image file, upload to Supabase Storage linked to this order ID
      if (enableCollarRib && pendingCollarFile) {
        try {
          const uploadRes = await supabaseStorageService.uploadCollarImage(
            newId,
            pendingCollarFile,
          );
          if (uploadRes.success && uploadRes.publicUrl) {
            newOrder.collar = {
              ...newOrder.collar,
              imageUrl: uploadRes.publicUrl,
              imagePath: uploadRes.imagePath,
              updatedAt: new Date().toISOString(),
            };
          }
        } catch (uploadErr) {
          console.warn("[QuickOrder] Collar upload warning:", uploadErr);
        }
      }

      await onOrderCreated(newOrder);
      // Reset draftOrderId for subsequent orders
      setDraftOrderId(generateUuid());
    } catch (saveErr: any) {
      console.error("[QuickOrder] Save failed:", saveErr);
      setSubmitError(
        saveErr.message ||
          "Gagal menyimpan pesanan ke database. Silakan periksa koneksi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewOrderNumber = "DIBUAT SAAT DISIMPAN";
  const previewTimestamp = new Date().toISOString();
  const previewOrder: Order = {
    id: draftOrderId,
    orderNumber: previewOrderNumber,
    salesChannel,
    externalOrderNumber,
    customer: {
      name: customerName.trim().toUpperCase(),
      phone: phone.trim(),
      orderDate: getTodayDateString(),
      deadlineDate,
      orderNumber: previewOrderNumber,
    },
    product: {
      productType,
      material,
      color: "",
      model: "Reguler Fit",
      sleeve: "Pendek",
      rib: enableCollarRib ? ribType : "Tidak Pakai Rib",
      totalQuantity: quantity,
      unitPrice,
      totalPrice,
      downPayment: Math.round(totalPrice * 0.5),
      remainingPayment: Math.round(totalPrice * 0.5),
    },
    inputMode,
    players: activeSizeRows,
    useTableThreshold: 5,
    printingMachines: [
      { id: "m1", name: "MESIN EPSON F7270" },
      { id: "m2", name: "MESIN EPSON F7270" },
    ],
    designs: enableDesigns ? designs : [],
    features: {
      designs: enableDesigns,
      collarRib: enableCollarRib,
      notes: enableCollarRib,
    },
    collar: enableCollarRib ? { ...collarSpec } : { modelName: "POLO KANCING 2" },
    notes: enableCollarRib ? (notes || "DATA TERPISAH DI HALAMAN BELAKANG") : "",
    productionStatus: "DRAFT",
    signoff: {
      designerName: "",
      designerInitial: "",
      pressSigned: false,
      cuttingSigned: false,
      jahitSigned: false,
    },
    createdAt: previewTimestamp,
    updatedAt: previewTimestamp,
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 pb-24 box-border">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D71920] text-white flex items-center justify-center shadow-xs">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                  Quick Order Produksi
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#D71920]">
                  Target: 30–60 Detik
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Input ringkas & otomatis. Isi data utama sekarang, sistem akan
                mengurus invoice dan PDF.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWaModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Import Chat WhatsApp</span>
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12"
      >
        <div className="min-w-0 space-y-6 xl:col-span-12">
          {/* SECTION 1: DATA UTAMA (Requirement #6: Nama, WhatsApp, Produk, Bahan, Jumlah) */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D71920]" />
                Data Wajib Pesanan
              </span>
              <span className="text-[11px] text-neutral-400">
                Minimal 5 field
              </span>
            </div>

            {/* Compact 2-column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Pemesan */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nama Pemesan <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value.toUpperCase())
                  }
                  placeholder="CONTOH: PASDAMAN / BUDI SANTOSO"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-2xl border outline-none font-bold uppercase transition-all ${
                    errors.customerName
                      ? "border-red-400 bg-red-50/40"
                      : "border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920]"
                  }`}
                />
                {errors.customerName && (
                  <p className="text-[10px] text-red-600 mt-1">
                    {errors.customerName}
                  </p>
                )}
              </div>

              {/* No WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  No. WhatsApp / HP <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 082128346174"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-2xl border font-mono font-bold outline-none transition-all ${
                    errors.phone
                      ? "border-red-400 bg-red-50/40"
                      : "border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-[#D71920]"
                  }`}
                />
                {errors.phone && (
                  <p className="text-[10px] text-red-600 mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>

              <SalesOrderFields
                salesChannel={salesChannel}
                orderNumber=""
                externalOrderNumber={externalOrderNumber}
                onChange={(channel, number) => {
                  setSalesChannel(channel);
                  setExternalOrderNumber(number);
                }}
              />
              {salesChannel !== "Offline" && errors.externalOrderNumber && (
                <p className="text-[11px] font-semibold text-red-600">{errors.externalOrderNumber}</p>
              )}
              {errors.masterData && <p className="text-[11px] font-semibold text-red-600">{errors.masterData}</p>}
              {errors.playerSizes && <p className="text-[11px] font-semibold text-red-600">{errors.playerSizes}</p>}

              {/* Jenis Produk */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Jenis Produk
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-bold cursor-pointer"
                >
                  {masterData.options("product_types", productType, false).map(item => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
                {errors.productType && <p className="mt-1 text-[10px] text-red-600">{errors.productType}</p>}
              </div>

              {/* Jenis Bahan */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Jenis Bahan Kain <span className="text-[#D71920]">*</span>
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-black text-[#D71920] cursor-pointer"
                >
                  {masterData.options("materials", material, false)
                    .filter(item => item.name !== "Custom")
                    .map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                {errors.material && <p className="mt-1 text-[10px] text-red-600">{errors.material}</p>}
                {masterData.error && <p className="mt-1 text-[10px] text-amber-700">{masterData.error}</p>}
              </div>

              {/* Total Jumlah Pcs & Harga */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Total PCS Otomatis</label>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-100 px-3.5 py-2.5 font-mono text-xs font-black text-neutral-900">{quantity} PCS</div>
                  {errors.quantity && <p className="mt-1 text-[10px] text-red-600">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={unitPrice || ""}
                    onChange={(e) =>
                      setUnitPrice(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 bg-neutral-50/50 focus:bg-white outline-none font-mono text-neutral-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional forms are rendered before their single activation card. */}
          {enablePlayers && (
            <div className="pt-4 border-t border-neutral-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">
                    Tabel Roster Pemain ({players.length} Data)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRosterImportModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Import Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPasteRosterModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold text-neutral-800"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Teks Cepat</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPlayerRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D71920] text-white rounded-xl text-xs font-bold hover:bg-[#b8141a]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Baris</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto rounded-2xl border border-neutral-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-100 text-neutral-600 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Nama Punggung</th>
                        <th className="py-2 px-3 w-24 text-center">Nomor</th>
                        <th className="py-2 px-3 w-28 text-center">Ukuran</th>
                        <th className="py-2 px-3 w-32 text-center">Lengan</th>
                        <th className="py-2 px-3 min-w-48">Catatan Khusus</th>
                        <th className="py-2 px-3 w-12 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 bg-white">
                      {players.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-6 text-center text-neutral-400"
                          >
                            Klik <strong>+ Baris</strong> atau{" "}
                            <strong>Paste Teks Cepat</strong> untuk mengisi
                            pemain.
                          </td>
                        </tr>
                      ) : (
                        players.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-neutral-50/70">
                            <td className="py-1.5 px-3 text-center text-neutral-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) =>
                                  handleUpdatePlayer(
                                    p.id,
                                    "name",
                                    e.target.value.toUpperCase(),
                                  )
                                }
                                placeholder="BUDI SANTOSO"
                                className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] outline-none font-bold uppercase"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={p.number}
                                onChange={(e) =>
                                  handleUpdatePlayer(
                                    p.id,
                                    "number",
                                    e.target.value,
                                  )
                                }
                                placeholder="10"
                                className="w-full text-center px-2 py-1 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] outline-none font-mono font-bold"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <select
                                value={p.size}
                                onChange={(e) =>
                                  handleUpdatePlayer(
                                    p.id,
                                    "size",
                                    e.target.value,
                                  )
                                }
                                className="w-full text-center px-2 py-1 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] outline-none font-bold text-[#D71920]"
                              >
                                {masterData.options("jersey_sizes", p.size, false).map(size => (
                                  <option key={size.id} value={size.code || size.name}>{size.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1 px-3">
                              <select
                                value={p.sleeve || ""}
                                onChange={(e) =>
                                  handleUpdatePlayer(
                                    p.id,
                                    "sleeve",
                                    e.target.value || undefined,
                                  )
                                }
                                aria-label={`Jenis lengan untuk ${p.name || `pemain ${idx + 1}`}`}
                                className="w-full text-center px-2 py-1 rounded-lg border border-transparent hover:border-neutral-200 focus:border-[#D71920] outline-none font-semibold"
                              >
                                <option value="">Default (Pendek)</option>
                                <option value="Pendek">Pendek</option>
                                <option value="Panjang">Panjang</option>
                              </select>
                            </td>
                            <td className="py-1 px-3">
                              <textarea
                                ref={(textarea) => {
                                  if (textarea) {
                                    textarea.style.height = "auto";
                                    textarea.style.height = `${textarea.scrollHeight}px`;
                                  }
                                }}
                                rows={1}
                                value={p.notes || ""}
                                onChange={(e) =>
                                  handleUpdatePlayer(
                                    p.id,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                                onInput={(e) => {
                                  const textarea = e.currentTarget;
                                  textarea.style.height = "auto";
                                  textarea.style.height = `${textarea.scrollHeight}px`;
                                }}
                                aria-label={`Catatan khusus untuk ${p.name || `pemain ${idx + 1}`}`}
                                placeholder="Opsional"
                                className="w-full min-w-40 resize-y rounded-lg border border-transparent px-2 py-1 hover:border-neutral-200 focus:border-[#D71920] outline-none"
                              />
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(p.id)}
                                className="text-neutral-400 hover:text-red-600 p-1 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <RosterSizeSummary players={players} />
              </div>
          )}
          {!enablePlayers && (
            <div className="pt-4 border-t border-neutral-100">
              <SizeQuantityTable rows={sizeQuantities} onChange={setSizeQuantities} />
            </div>
          )}

          {enableDesigns && (
            <div className="pt-4 border-t border-neutral-100">
                <DesignUploader
                  orderId={draftOrderId}
                  designs={designs}
                  onChange={setDesigns}
                  materialName={material}
                  disabled={isSubmitting}
                />
            </div>
          )}

          {enableCollarRib && (
            <div className="pt-4 border-t border-neutral-100 space-y-4">
                {/* Collar Model & Image Reference Upload */}
                <div className="p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200/80">
                  <CollarUploadControl
                    value={collarSpec}
                    onChange={(newCollar, pendingFile) => {
                      setCollarSpec(newCollar);
                      if (pendingFile) {
                        setPendingCollarFile(pendingFile);
                      } else if (!newCollar.imageUrl) {
                        setPendingCollarFile(undefined);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Finishing Rib Option */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Finishing Rib
                  </label>
                  <select
                    value={ribType}
                    onChange={(e) => setRibType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 bg-white font-semibold outline-none focus:border-[#D71920]"
                  >
                    <option value="Tidak Pakai Rib">Tidak Pakai Rib</option>
                    <option value="Rib Leher Saja">Rib Leher Saja</option>
                    <option value="Rib Leher + Tangan">
                      Rib Leher + Tangan
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Catatan Khusus Produksi
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruksi untuk operator cutting / jahit..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 outline-none uppercase"
                  />
                </div>
            </div>
          )}

          <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs sm:p-6">
            <header className="mb-6 border-b border-neutral-100 pb-4">
              <h2 className="text-base font-bold uppercase tracking-wide text-neutral-900">
                Fitur Tambahan (Hanya Buka Jika Diperlukan Order)
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                Tidak perlu mengisi jika order tidak membutuhkan data pemain atau desain khusus.
              </p>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex min-h-28 cursor-pointer items-start gap-4 rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5 transition-colors hover:bg-neutral-100">
                <input
                  type="checkbox"
                  checked={enablePlayers}
                  onChange={event => setEnablePlayers(event.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-[#D71920]"
                />
                <span>
                  <span className="block text-base font-semibold text-neutral-900">Data Nama / Nomor Punggung</span>
                  <span className="mt-2 block text-sm text-neutral-400">Roster ukuran &amp; personalisasi pemain</span>
                </span>
              </label>
              <label className="flex min-h-28 cursor-pointer items-start gap-4 rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5 transition-colors hover:bg-neutral-100">
                <input
                  type="checkbox"
                  checked={enableDesigns}
                  onChange={event => setEnableDesigns(event.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-[#D71920]"
                />
                <span>
                  <span className="block text-base font-semibold text-neutral-900">Upload Visual Desain</span>
                  <span className="mt-2 block text-sm text-neutral-400">File artwork sublimasi / referensi</span>
                </span>
              </label>
              <label className="flex min-h-28 cursor-pointer items-start gap-4 rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5 transition-colors hover:bg-neutral-100">
                <input
                  type="checkbox"
                  checked={enableCollarRib}
                  onChange={event => setEnableCollarRib(event.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-[#D71920]"
                />
                <span>
                  <span className="block text-base font-semibold text-neutral-900">Model Kerah &amp; Catatan</span>
                  <span className="mt-2 block text-sm text-neutral-400">Polo kancing, rib leher, instruksi kerja</span>
                </span>
              </label>
            </div>
          </section>

          {/* Submit Error Banner (Requirement: Don't lose user inputs on database error!) */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-3xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                <div>
                  <strong className="block text-red-900 font-bold">
                    Gagal Menyimpan ke Database Supabase
                  </strong>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    {submitError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-red-600 hover:text-red-900 font-bold px-2 py-1 text-xs shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {/* BOTTOM ACTION BAR */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral-500">
                Estimasi Tagihan:
              </span>
              <span className="text-xl font-mono font-black text-neutral-900">
                {formatRupiah(totalPrice)}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                ({quantity} pcs × {formatRupiah(unitPrice)})
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 disabled:opacity-50 rounded-xl"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-60 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-red-500/25 active:scale-[0.98]"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span>
                  {isSubmitting
                    ? "Menyimpan ke Supabase..."
                    : "Simpan & Buat Order"}
                </span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:col-span-12">
          <div className="box-border min-w-0 overflow-hidden rounded-3xl border border-neutral-200/90 bg-neutral-800/5 p-3 shadow-inner sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 pb-3">
              <div>
                <h3 className="text-xs font-bold tracking-tight text-neutral-800">
                  Preview Form Order A4
                </h3>
                <p className="mt-0.5 text-[10px] text-neutral-500">
                  Cek data dan artwork sebelum menyimpan pesanan.
                </p>
              </div>
              <span className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2 py-1 font-mono text-[10px] font-bold text-[#D71920]">
                #{previewOrder.orderNumber}
              </span>
            </div>
            <InvoicePreviewA4 order={previewOrder} mode="preview" />
          </div>
        </aside>
      </form>

      {/* WhatsApp Modal */}
      <WhatsAppParserModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        onApplyParsed={handleApplyWhatsApp}
      />

      {/* Fast Paste Roster Modal */}
      <PlayerFastPasteModal
        isOpen={isPasteRosterModalOpen}
        onClose={() => setIsPasteRosterModalOpen(false)}
        defaultSleeve="Pendek"
        onApply={handleApplyPastedRoster}
      />

      <ImportCsvModal
        isOpen={isRosterImportModalOpen}
        onClose={() => setIsRosterImportModalOpen(false)}
        onImport={handleApplyPastedRoster}
      />
    </div>
  );
};
