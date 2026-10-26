import React, { useState } from 'react';
import { Order, ProductionStatus } from '../types/order';
import { 
  Zap, 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Shirt, 
  Layers, 
  Eye, 
  Printer, 
  ArrowRight, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateId, formatRupiah } from '../utils/formatters';
import { getOrderCompleteness } from '../utils/calculations';

interface DashboardProps {
  orders: Order[];
  onOpenQuickOrder: () => void;
  onOpenWhatsAppImport: () => void;
  onViewOrder: (id: string) => void;
  onPrintOrder: (order: Order) => void;
  onNavigateTab: (tabKey: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  onOpenQuickOrder,
  onOpenWhatsAppImport,
  onViewOrder,
  onPrintOrder,
  onNavigateTab,
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'NEW' | 'INCOMPLETE' | 'IN_PRODUCTION' | 'COMPLETED' | 'ALL'>('NEW');

  // Compute answers to the 5 critical questions:
  // 1. Berapa order baru?
  const newOrders = orders.filter(o => o.productionStatus === 'DRAFT');

  // 2. Order mana yang harus diproses? (Dalam produksi)
  const inProductionOrders = orders.filter(
    o => o.productionStatus !== 'DRAFT' && o.productionStatus !== 'SELESAI'
  );

  // 3. Order mana yang belum lengkap?
  const incompleteOrders = orders.filter(o => {
    const { isComplete } = getOrderCompleteness(o);
    return !isComplete && o.productionStatus !== 'SELESAI';
  });

  // 4. Berapa total pcs yang sedang diproduksi?
  const inProductionPcs = inProductionOrders.reduce(
    (sum, o) => sum + (o.product.totalQuantity || 0),
    0
  );

  // 5. Order yang selesai
  const completedOrders = orders.filter(o => o.productionStatus === 'SELESAI');

  // Total Pcs Overall
  const totalAllPcs = orders.reduce((sum, o) => sum + (o.product.totalQuantity || 0), 0);

  // Select list to display based on active filter
  const displayedOrders = {
    NEW: newOrders,
    INCOMPLETE: incompleteOrders,
    IN_PRODUCTION: inProductionOrders,
    COMPLETED: completedOrders,
    ALL: orders,
  }[activeFilterTab];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Action Bar: Input Once -> Use Everywhere */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-3 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#D71920]" />
            <span>Digital Order System · Input Once → Use Everywhere</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Pusat Kontrol Produksi <span className="text-[#D71920]">myprintin</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1.5 leading-relaxed">
            Buat order dalam 30 detik atau paste chat WhatsApp pelanggan. Dokumen SPK Form Sublime, rekap ukuran, dan alur mesin langsung siap otomatis.
          </p>
        </div>

        {/* Global Fast Action CTAs */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenWhatsAppImport}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Import WhatsApp</span>
          </button>

          <button
            onClick={onOpenQuickOrder}
            className="flex items-center gap-2 px-5 py-3 bg-[#D71920] hover:bg-[#b8141a] text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-red-500/25 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            <span>+ Quick Order Baru</span>
          </button>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#D71920]/15 to-transparent pointer-events-none" />
      </div>

      {/* 5 CRITICAL WORKSHOP QUESTION CARDS (Requirement #5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. ORDER BARU */}
        <div
          onClick={() => setActiveFilterTab('NEW')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            activeFilterTab === 'NEW'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-red-500/20'
              : 'bg-white border-neutral-200/80 hover:border-neutral-300 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={activeFilterTab === 'NEW' ? 'text-neutral-300' : 'text-neutral-400'}>
              ORDER BARU
            </span>
            <Clock className={`w-4 h-4 ${activeFilterTab === 'NEW' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className="text-3xl font-mono font-black tabular-nums">
            {newOrders.length}
          </div>
          <p className={`text-[10px] mt-1 ${activeFilterTab === 'NEW' ? 'text-neutral-400' : 'text-neutral-400'}`}>
            Perlu diverifikasi & diproses
          </p>
        </div>

        {/* 2. PERLU DILENGKAPI */}
        <div
          onClick={() => setActiveFilterTab('INCOMPLETE')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            activeFilterTab === 'INCOMPLETE'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-red-500/20'
              : 'bg-white border-neutral-200/80 hover:border-neutral-300 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={activeFilterTab === 'INCOMPLETE' ? 'text-neutral-300' : 'text-amber-700'}>
              PERLU DILENGKAPI
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-mono font-black text-amber-500 tabular-nums">
            {incompleteOrders.length}
          </div>
          <p className={`text-[10px] mt-1 ${activeFilterTab === 'INCOMPLETE' ? 'text-neutral-400' : 'text-neutral-400'}`}>
            Roster ukuran / desain kurang
          </p>
        </div>

        {/* 3. DALAM PRODUKSI */}
        <div
          onClick={() => setActiveFilterTab('IN_PRODUCTION')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            activeFilterTab === 'IN_PRODUCTION'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-red-500/20'
              : 'bg-white border-neutral-200/80 hover:border-neutral-300 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={activeFilterTab === 'IN_PRODUCTION' ? 'text-neutral-300' : 'text-neutral-400'}>
              DALAM PRODUKSI
            </span>
            <Flame className="w-4 h-4 text-[#D71920]" />
          </div>
          <div className="text-3xl font-mono font-black text-[#D71920] tabular-nums">
            {inProductionOrders.length}
          </div>
          <p className={`text-[10px] mt-1 ${activeFilterTab === 'IN_PRODUCTION' ? 'text-neutral-400' : 'text-neutral-400'}`}>
            Print, press, cutting, jahit
          </p>
        </div>

        {/* 4. TOTAL PCS PRODUKSI */}
        <div
          onClick={() => onNavigateTab('size-recap')}
          className="p-4 rounded-3xl bg-white border border-neutral-200/80 hover:border-neutral-300 text-neutral-900 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-neutral-400">TOTAL PCS DIKERJAKAN</span>
            <Shirt className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-3xl font-mono font-black text-neutral-900 tabular-nums">
            {inProductionPcs} <span className="text-xs font-sans font-bold text-neutral-400">pcs</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            Klik untuk buka Rekap Ukuran
          </p>
        </div>

        {/* 5. SELESAI */}
        <div
          onClick={() => setActiveFilterTab('COMPLETED')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilterTab === 'COMPLETED'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-red-500/20'
              : 'bg-white border-neutral-200/80 hover:border-neutral-300 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={activeFilterTab === 'COMPLETED' ? 'text-neutral-300' : 'text-neutral-400'}>
              SELESAI
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-mono font-black text-emerald-600 tabular-nums">
            {completedOrders.length}
          </div>
          <p className={`text-[10px] mt-1 ${activeFilterTab === 'COMPLETED' ? 'text-neutral-400' : 'text-neutral-400'}`}>
            Lolos QC & siap ambil
          </p>
        </div>
      </div>

      {/* Actionable List Section */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs">
        {/* Section Header & Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-neutral-100 gap-3">
          <div>
            <h3 className="text-sm font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Daftar Order:</span>
              <span className="text-[#D71920] uppercase font-mono">
                {activeFilterTab === 'NEW' && 'Order Baru Masuk'}
                {activeFilterTab === 'INCOMPLETE' && 'Perlu Dilengkapi'}
                {activeFilterTab === 'IN_PRODUCTION' && 'Sedang Berjalan di Bengkel'}
                {activeFilterTab === 'COMPLETED' && 'Selesai Diproduksi'}
                {activeFilterTab === 'ALL' && 'Semua Order'}
              </span>
              <span className="text-xs text-neutral-400 font-mono font-normal">
                ({displayedOrders.length} pesanan)
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Klik nama pemesan untuk membuka berkas order atau lengkapi data yang kurang.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveFilterTab('NEW')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'NEW' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Baru ({newOrders.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('INCOMPLETE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'INCOMPLETE' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-neutral-600'
              }`}
            >
              Kurang Lengkap ({incompleteOrders.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('IN_PRODUCTION')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'IN_PRODUCTION' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Produksi ({inProductionOrders.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'ALL' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Semua ({orders.length})
            </button>
          </div>
        </div>

        {/* Order Cards / Rows */}
        {displayedOrders.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-xs">
            Tidak ada order pada kategori ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedOrders.map(order => {
              const { isComplete, issues } = getOrderCompleteness(order);

              return (
                <div
                  key={order.id}
                  onClick={() => onViewOrder(order.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-neutral-200/70 hover:border-neutral-300 hover:shadow-xs bg-white transition-all gap-3 cursor-pointer group"
                >
                  {/* Left: Identifiers */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center font-mono font-black text-xs text-neutral-800 shrink-0 group-hover:bg-[#D71920] group-hover:text-white transition-colors">
                      #{order.orderNumber.replace(/ORD-\d{4}-/, '')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 truncate">
                          {order.customer.name}
                        </span>
                        {order.customer.teamName && (
                          <span className="text-xs text-neutral-400 font-medium truncate">
                            · {order.customer.teamName}
                          </span>
                        )}
                        <StatusBadge status={order.productionStatus} size="sm" />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5 flex-wrap">
                        <span className="font-semibold text-[#D71920]">{order.product.material}</span>
                        <span>·</span>
                        <span>{order.product.productType}</span>
                        <span>·</span>
                        <span className="font-mono font-bold text-neutral-800">{order.product.totalQuantity} pcs</span>
                        <span>·</span>
                        <span>WA: {order.customer.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center / Right: Completeness Issues Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {!isComplete && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate max-w-[180px]">{issues[0]}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onViewOrder(order.id)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors"
                      >
                        Buka Dossier
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintOrder(order)}
                        className="p-1.5 text-neutral-400 hover:text-[#D71920] hover:bg-red-50 rounded-xl transition-colors"
                        title="Cetak SPK Form Sublime"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workshop Work Distribution Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Quick Shortcut to Production Kanban */}
        <div
          onClick={() => onNavigateTab('production')}
          className="bg-white p-5 rounded-3xl border border-neutral-200/80 hover:border-neutral-300 shadow-2xs cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-neutral-900 group-hover:text-[#D71920] transition-colors">
                Papan Kanban Produksi
              </h4>
              <p className="text-[11px] text-neutral-400">
                Pindahkan status order antar pos cetak & jahit
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Quick Shortcut to Size Recap */}
        <div
          onClick={() => onNavigateTab('size-recap')}
          className="bg-white p-5 rounded-3xl border border-neutral-200/80 hover:border-neutral-300 shadow-2xs cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D71920] flex items-center justify-center font-bold">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-neutral-900 group-hover:text-[#D71920] transition-colors">
                Rekap Akumulasi Ukuran
              </h4>
              <p className="text-[11px] text-neutral-400">
                Hitungan total pola potong XS s/d 4XL
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Quick Shortcut to Printing Queue */}
        <div
          onClick={() => onNavigateTab('printing-queue')}
          className="bg-white p-5 rounded-3xl border border-neutral-200/80 hover:border-neutral-300 shadow-2xs cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-neutral-900 group-hover:text-[#D71920] transition-colors">
                Antrian Mesin Printing
              </h4>
              <p className="text-[11px] text-neutral-400">
                Monitoring operator mesin Epson & Mimaki
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};
