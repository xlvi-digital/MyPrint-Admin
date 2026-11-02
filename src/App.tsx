import React, { useState, useEffect } from "react";
import { Order, ProductionStatus, WhatsAppParseResult } from "./types/order";
import { storageService } from "./services/storageService";
import { supabaseOrderService } from "./services/supabase/orderService";
import { supabaseStorageService } from "./services/supabase/storageService";
import { useRealtimeOrders } from "./hooks/useRealtimeOrders";
import { AppShell } from "./components/layout/AppShell";
import { NavItemKey } from "./components/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { QuickOrder } from "./pages/QuickOrder";
import { OrderList } from "./pages/OrderList";
import { OrderDetail } from "./pages/OrderDetail";
import { Production } from "./pages/Production";
import { SizeRecap } from "./pages/SizeRecap";
import { PrintingQueue } from "./pages/PrintingQueue";
import { PlayerRosterRecap } from "./pages/PlayerRosterRecap";
import { Settings } from "./pages/Settings";
import { MasterData } from "./pages/MasterData";
import { ToastContainer, ToastMessage } from "./components/common/Toast";
import { PrintableOrderDocument } from "./components/print/PrintableOrderDocument";
import { PrintPreviewModal } from "./components/print/PrintPreviewModal";
import { QuickOrderModal } from "./components/layout/QuickOrderModal";
import { WhatsAppParserModal } from "./components/order/WhatsAppParserModal";
import { generateOrderPdf } from "./services/pdfService";
import { Login } from "./pages/Login";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { isSupabaseConfigured } from "./services/supabase/client";

type ViewMode = NavItemKey | "order-detail";

async function waitForPrintDocument(): Promise<void> {
  const timeoutAt = Date.now() + 10000;
  let printDocument: HTMLElement | null = null;

  while (Date.now() < timeoutAt) {
    printDocument = document.querySelector<HTMLElement>(
      '#print-root [data-pagination-ready="true"]',
    );
    if (printDocument) break;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  if (!printDocument) {
    throw new Error("Dokumen cetak belum siap. Silakan coba kembali.");
  }

  await document.fonts.ready;
  await Promise.all(
    Array.from(printDocument.querySelectorAll("img")).map(async image => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error(`Gambar ${image.alt || "Form Order"} gagal dimuat sebelum dicetak.`));
          }, 10000);
          const cleanup = () => {
            window.clearTimeout(timeout);
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
          };
          const onLoad = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error(`Gambar ${image.alt || "Form Order"} gagal dimuat sebelum dicetak.`));
          };
          image.addEventListener("load", onLoad, { once: true });
          image.addEventListener("error", onError, { once: true });
          if (image.complete) {
            if (image.naturalWidth > 0) onLoad();
            else onError();
          }
        });
      }

      if (image.naturalWidth <= 0) {
        throw new Error(`Gambar ${image.alt || "Form Order"} gagal dimuat sebelum dicetak.`);
      }
      await image.decode();
    }),
  );
}

export default function App() {
  const auth = useSupabaseAuth();
  const initialOrders = isSupabaseConfigured() ? [] : storageService.getOrders();
  const {
    orders,
    status: realtimeStatus,
    refreshOrders,
    isLoading: isOrdersLoading,
    isRefreshing: isOrdersRefreshing,
    error: ordersError,
  } = useRealtimeOrders(
    initialOrders,
    !isSupabaseConfigured() || Boolean(auth.session && auth.role !== "unassigned"),
  );

  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Global Quick Action Modals
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [pendingWhatsAppData, setPendingWhatsAppData] = useState<WhatsAppParseResult | null>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + N or Cmd + N: Quick Order Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsQuickOrderModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Toast Helper
  const showToast = (
    type: ToastMessage["type"],
    message: string,
    title?: string,
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Navigation handlers
  const handleNavigate = (view: NavItemKey) => {
    setCurrentView(view);
  };

  const handleViewOrder = (id: string) => {
    setSelectedOrderId(id);
    setCurrentView("order-detail");
  };

  const handleDuplicateOrder = async (id: string) => {
    const duplicated = storageService.duplicateOrder(id);
    if (duplicated) {
      const res = await supabaseOrderService.saveOrder(duplicated);
      if (!res.success) {
        const persistedOrder = (await supabaseOrderService.getOrders())
          .find(order => order.id === res.order.id);
        if (persistedOrder) {
          refreshOrders();
          handleViewOrder(persistedOrder.id);
        }
        showToast(
          "error",
          res.error || "Gagal membuat duplikat order di database.",
          "Gagal Duplikat",
        );
        return;
      }
      refreshOrders();
      showToast(
        "success",
        `Order duplikat berhasil dibuat dengan nomor #${res.order.orderNumber}`,
        "Duplikat Selesai",
      );
      if (res.designsError) {
        showToast("error", res.designsError, "Desain Duplikat Gagal");
      }
      if (res.assetsError) {
        showToast("error", res.assetsError, "Gambar Duplikat Belum Tersimpan");
      }
      handleViewOrder(res.order.id);
    }
  };

  const handleDeleteOrder = async (id: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === id);
    const res = await supabaseOrderService.deleteOrder(id);
    if (!res.success) {
      showToast(
        "error",
        res.error || "Gagal menghapus order dari database.",
        "Gagal Hapus",
      );
      return false;
    }
    refreshOrders();
    showToast("info", `Order #${target?.orderNumber || ""} berhasil dihapus.`);
    if (currentView === "order-detail") {
      setCurrentView("all-orders");
    }
    return true;
  };

  const handleStatusChange = async (
    id: string,
    newStatus: ProductionStatus,
  ) => {
    const res = await supabaseOrderService.updateProductionStatus(
      id,
      newStatus,
    );
    if (!res.success) {
      showToast(
        "error",
        res.error || "Gagal memperbarui status order di database.",
        "Gagal Update Status",
      );
      return;
    }
    refreshOrders();
    showToast(
      "success",
      `Status order diubah ke ${newStatus}`,
      "Status Diperbarui",
    );
  };

  const handlePrintOrder = (order: Order) => {
    setPrintingOrder(order);
    setPreviewOrder(order);
    setIsPreviewModalOpen(true);
  };

  const handleExecutePrint = async () => {
    if (!printingOrder) {
      showToast("error", "Pilih order terlebih dahulu sebelum mencetak.", "Dokumen Cetak Tidak Tersedia");
      return;
    }

    try {
      if (printingOrder.collar?.imageUrl) {
        await supabaseStorageService.preloadImage(printingOrder.collar.imageUrl);
      }
      if (printingOrder.designs?.length) {
        await Promise.all(
          printingOrder.designs.map((design) =>
            supabaseStorageService.preloadImage(design.dataUrl),
          ),
        );
      }
      await waitForPrintDocument();
      window.print();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Gagal menyiapkan dokumen untuk dicetak.",
        "Gagal Mencetak Form Order",
      );
    }
  };

  const handleDownloadOrderPdf = async (order: Order) => {
    showToast(
      "info",
      `Menyusun dokumen PDF Form Order #${order.orderNumber}...`,
      "Membuat PDF",
    );
    const result = await generateOrderPdf(order);
    if (result.success) {
      showToast(
        "success",
        `File ${result.fileName} berhasil diunduh ke perangkat Anda!`,
        "Download Selesai",
      );
    } else {
      showToast(
        "error",
        result.error || "Terjadi kesalahan saat menghasilkan file PDF.",
        "Gagal Buat PDF",
      );
    }
  };

  const handleOrderCreated = async (newOrder: Order): Promise<Order> => {
    const result = await supabaseOrderService.saveOrder(newOrder);
    if (!result.success) {
      showToast(
        "error",
        result.error || "Gagal menyimpan pesanan ke database Supabase.",
        "Database Error",
      );
      throw new Error(
        result.error || "Operasi penyimpanan ditolak oleh database.",
      );
    }

    refreshOrders();
    showToast(
      "success",
      `Order #${result.order.orderNumber} untuk ${result.order.customer.name} berhasil disimpan!`,
      result.source === "supabase"
        ? "Tersimpan di Supabase"
        : "Tersimpan Lokal",
    );
    if (result.designsError) {
      showToast("error", result.designsError, "Order Tersimpan, Desain Gagal");
    }
    if (result.assetsError) {
      showToast("error", result.assetsError, "Order Tersimpan, Gambar Belum Tersimpan");
    }
    handleViewOrder(result.order.id);
    return result.order;
  };

  // WhatsApp parsing handler from Global Modal
  const handleApplyWhatsAppGlobal = (parsed: WhatsAppParseResult) => {
    setIsWhatsAppModalOpen(false);
    setPendingWhatsAppData(parsed);
    setCurrentView("quick-order");
    showToast(
      "info",
      "Data chat WhatsApp berhasil diekstrak ke formulir Quick Order.",
    );
  };

  // Calculate Page Titles
  const getPageInfo = (): { title: string; subtitle: string } => {
    switch (currentView) {
      case "dashboard":
        return {
          title: "Dashboard Kontrol Produksi",
          subtitle:
            "Pusat informasi status pengerjaan, antrian mesin, dan rekap ukuran",
        };
      case "quick-order":
        return {
          title: "Quick Order Baru",
          subtitle:
            "Pembuatan pesanan cepat 30–60 detik dengan progressive disclosure",
        };
      case "all-orders":
        return {
          title: "Semua Order Produksi",
          subtitle:
            "Arsip buku besar dan riwayat pemesanan jersey seluruh pelanggan",
        };
      case "production":
        return {
          title: "Papan Alur Produksi (Kanban)",
          subtitle:
            "Alur kerja workshop: Desain → Printing → Press → Cutting → Jahit → Selesai",
        };
      case "size-recap":
        return {
          title: "Rekap Akumulasi Ukuran",
          subtitle:
            "Kalkulasi otomatis kebutuhan pola potong kain XS s/d 4XL untuk operator cutting",
        };
      case "printing-queue":
        return {
          title: "Antrian Mesin Printing Sublim",
          subtitle:
            "Daftar kerja operator mesin cetak Epson & Mimaki tanpa buka invoice manual",
        };
      case "player-roster":
        return {
          title: "Rekap Nama & Nomor Pemain",
          subtitle:
            "Direktori pencarian cepat nama punggung seluruh tim untuk QC dan finishing",
        };
      case "completed":
        return {
          title: "Order Selesai",
          subtitle:
            "Pesanan yang telah lolos quality control dan siap kirim / ambil",
        };
      case "master-data":
        return {
          title: "Data Master",
          subtitle: "Kelola pilihan bahan, ukuran jersey, produk, dan model kerah",
        };
      case "order-detail": {
        const order = orders.find((o) => o.id === selectedOrderId);
        return {
          title: order ? `Dossier Order #${order.orderNumber}` : "Detail Order",
          subtitle:
            order?.customer.name || "Pusat data tunggal pesanan produksi",
        };
      }
      case "settings":
        return {
          title: "Pengaturan Workshop & Supabase",
          subtitle:
            "Pencadangan database, sinkronisasi realtime multi-admin, dan audit log",
        };
      default:
        return {
          title: "myprintin admin",
          subtitle: "Production Order System",
        };
    }
  };

  const { title, subtitle } = getPageInfo();
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const activePrintTarget = printingOrder;

  if (isSupabaseConfigured() && auth.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-sm font-semibold text-neutral-600">Memulihkan sesi Supabase...</main>;
  }
  if (isSupabaseConfigured() && !auth.session) {
    return <Login sessionError={auth.error} />;
  }
  if (isSupabaseConfigured() && auth.role === "unassigned") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
        <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-xl sm:p-8">
          <h1 className="text-xl font-black text-neutral-900">Akses belum diberikan</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Akun {auth.session?.user.email} belum memiliki role <code>owner</code> atau <code>admin</code> pada <code>app_metadata</code>.
            Minta pemilik project mengatur role melalui Supabase sebelum menggunakan aplikasi.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await auth.signOut();
              } catch (signOutError) {
                showToast(
                  "error",
                  signOutError instanceof Error ? signOutError.message : "Gagal mengakhiri sesi Supabase.",
                );
              }
            }}
            className="mt-5 rounded-xl bg-[#D71920] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#b8141a]"
          >
            Keluar
          </button>
          <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        </section>
      </main>
    );
  }

  return (
    <>
      <AppShell
        currentView={currentView as NavItemKey}
        onNavigate={handleNavigate}
        pageTitle={title}
        pageSubtitle={subtitle}
        orders={orders}
        onGlobalSearch={(q) => {
          if (
            q &&
            currentView !== "all-orders" &&
            currentView !== "player-roster"
          ) {
            // popup handles it
          }
        }}
        onSelectOrder={handleViewOrder}
        onResetDemo={() => {
          storageService.resetToDemoData();
          refreshOrders();
          showToast(
            "success",
            "Demo data Form Order Sublime Pasdama (#366) berhasil dimuat kembali.",
          );
        }}
        onClearAll={() => {
          storageService.clearAllOrders();
          refreshOrders();
          showToast("info", "Semua data pesanan telah dibersihkan.");
        }}
        onOpenQuickModal={() => setIsQuickOrderModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        realtimeStatus={realtimeStatus}
        onRefreshOrders={refreshOrders}
        isRefreshing={isOrdersRefreshing}
        refreshError={ordersError}
        authEmail={auth.session?.user.email || undefined}
        authRole={auth.role}
        onSignOut={async () => {
          try {
            await auth.signOut();
            showToast("success", "Sesi Supabase berhasil diakhiri.");
          } catch (signOutError) {
            showToast("error", signOutError instanceof Error ? signOutError.message : "Gagal mengakhiri sesi Supabase.");
          }
        }}
      >
        {currentView === "dashboard" && (
          <Dashboard
            orders={orders}
            onOpenQuickOrder={() => handleNavigate("quick-order")}
            onOpenWhatsAppImport={() => setIsWhatsAppModalOpen(true)}
            onViewOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
            onNavigateTab={handleNavigate}
          />
        )}

        {currentView === "quick-order" && (
          <QuickOrder
            onOrderCreated={handleOrderCreated}
            onCancel={() => setCurrentView("dashboard")}
            initialWhatsAppData={pendingWhatsAppData}
            onInitialWhatsAppDataApplied={() => setPendingWhatsAppData(null)}
          />
        )}

        {currentView === "all-orders" && (
          <OrderList
            orders={orders}
            onViewOrder={handleViewOrder}
            onEditOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
            onDuplicateOrder={handleDuplicateOrder}
            onDeleteOrder={handleDeleteOrder}
            onCreateNew={() => setIsQuickOrderModalOpen(true)}
            initialFilterStatus="ALL"
            isLoading={isOrdersLoading}
            isRefreshing={isOrdersRefreshing}
            loadError={ordersError}
            onRefresh={() => void refreshOrders()}
          />
        )}

        {currentView === "production" && (
          <Production
            orders={orders}
            onUpdateStatus={handleStatusChange}
            onViewOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
          />
        )}

        {currentView === "size-recap" && (
          <SizeRecap
            orders={orders}
            onViewOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
          />
        )}

        {currentView === "printing-queue" && (
          <PrintingQueue
            orders={orders}
            onViewOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
            onUpdateStatus={handleStatusChange}
          />
        )}

        {currentView === "player-roster" && (
          <PlayerRosterRecap orders={orders} onViewOrder={handleViewOrder} />
        )}

        {currentView === "completed" && (
          <OrderList
            orders={orders.filter((o) => o.productionStatus === "SELESAI")}
            onViewOrder={handleViewOrder}
            onEditOrder={handleViewOrder}
            onPrintOrder={handlePrintOrder}
            onDuplicateOrder={handleDuplicateOrder}
            onDeleteOrder={handleDeleteOrder}
            onCreateNew={() => setIsQuickOrderModalOpen(true)}
            initialFilterStatus="SELESAI"
            isLoading={isOrdersLoading}
            isRefreshing={isOrdersRefreshing}
            loadError={ordersError}
            onRefresh={() => void refreshOrders()}
          />
        )}

        {currentView === "order-detail" && !isOrdersLoading && selectedOrder && (
          <OrderDetail
            key={selectedOrder.id}
            order={selectedOrder}
            onBack={() => setCurrentView("all-orders")}
            onEdit={() => {}}
            onPrint={handlePrintOrder}
            onDownloadPdf={handleDownloadOrderPdf}
            onDuplicate={handleDuplicateOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            onOrderUpdated={async (updated) => {
              const res = await supabaseOrderService.saveOrder(updated);
              if (!res.success) {
                showToast(
                  "error",
                  res.error || "Gagal memperbarui order di database.",
                  "Gagal Update",
                );
                return false;
              } else {
                refreshOrders();
                if (res.designsError) {
                  showToast("error", res.designsError, "Order Tersimpan, Desain Gagal");
                  return false;
                }
                if (res.assetsError) {
                  showToast("error", res.assetsError, "Order Tersimpan, Gambar Belum Tersimpan");
                }
                showToast(
                  "success",
                  "Data order berhasil diperbarui di database.",
                  res.source === "supabase"
                    ? "Tersimpan ke Supabase"
                    : "Tersimpan Lokal",
                );
                return true;
              }
            }}
          />
        )}
        {currentView === "order-detail" && isOrdersLoading && (
          <section className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="animate-pulse space-y-4" aria-label="Memuat detail order">
              <div className="h-7 w-48 rounded bg-neutral-200" />
              <div className="h-20 rounded-xl bg-neutral-100" />
              <div className="h-48 rounded-xl bg-neutral-100" />
              <div className="h-32 rounded-xl bg-neutral-100" />
            </div>
          </section>
        )}
        {currentView === "order-detail" && !isOrdersLoading && !selectedOrder && (
          <section className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-neutral-700">
                {ordersError ? `Detail order belum dapat dimuat: ${ordersError}` : "Order tidak ditemukan."}
              </p>
              <button type="button" onClick={() => void refreshOrders()} disabled={isOrdersRefreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D71920] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {isOrdersRefreshing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {isOrdersRefreshing ? "Memuat..." : "Coba muat ulang"}
              </button>
            </div>
          </section>
        )}

        {currentView === "settings" && (
          <Settings
            orders={orders}
            onReloadOrders={refreshOrders}
            onShowToast={showToast}
          />
        )}

        {currentView === "master-data" && <MasterData />}
      </AppShell>

      {/* Global Quick Order Modal */}
      <QuickOrderModal
        isOpen={isQuickOrderModalOpen}
        onClose={() => setIsQuickOrderModalOpen(false)}
        onCreated={handleOrderCreated}
      />

      {/* Global WhatsApp Parser Modal */}
      <WhatsAppParserModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onApplyParsed={handleApplyWhatsAppGlobal}
      />

      {/* Interactive Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        order={previewOrder}
        onPrintNow={handleExecutePrint}
        onDownloadPdf={handleDownloadOrderPdf}
      />

      {/* Dedicated Print Portal Container (Only visible during window.print()) */}
      <PrintableOrderDocument order={activePrintTarget} />

      {/* Global Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </>
  );
}
