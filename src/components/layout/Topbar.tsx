import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  User, 
  RotateCcw, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shirt,
  X,
  Radio,
  Database,
  RefreshCw,
  LoaderCircle,
  LogOut
} from 'lucide-react';
import { Order } from '../../types/order';
import { formatDateId } from '../../utils/formatters';
import { authRoleService, UserProfile, WORKSHOP_PROFILES } from '../../services/supabase/authRoleService';
import { AppRole } from '../../hooks/useSupabaseAuth';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  onGlobalSearch: (query: string) => void;
  orders: Order[];
  onSelectOrder: (orderId: string) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
  realtimeStatus?: 'connected' | 'connecting' | 'disconnected' | 'local_mode';
  onRefreshOrders?: () => void;
  isRefreshing?: boolean;
  onOpenSettingsDatabase?: () => void;
  authEmail?: string;
  authRole?: AppRole;
  onSignOut?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onOpenMobileSidebar,
  onGlobalSearch,
  orders,
  onSelectOrder,
  onResetDemo,
  onClearAll,
  realtimeStatus = 'local_mode',
  onRefreshOrders,
  isRefreshing = false,
  onOpenSettingsDatabase,
  authEmail,
  authRole,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(() => authRoleService.getCurrentProfile());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onGlobalSearch(val);
    setIsSearchOpen(Boolean(val.trim()));
  };

  const handleProfileSwitch = (p: UserProfile) => {
    authRoleService.setCurrentProfile(p);
    setActiveProfile(p);
    setIsProfileOpen(false);
  };

  // Search Results across Orders AND Players
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { matchedOrders: [], matchedPlayers: [] };
    const q = searchQuery.toLowerCase();

    const matchedOrders = orders.filter(
      o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        (o.customer.phone || '').toLowerCase().includes(q) ||
        (o.customer.teamName || '').toLowerCase().includes(q) ||
        (o.product.material || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedPlayers: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      playerName: string;
      number: string;
      size: string;
    }[] = [];

    for (const o of orders) {
      if (o.players && o.players.length > 0) {
        for (const p of o.players) {
          if (
            p.name.toLowerCase().includes(q) ||
            p.number.toLowerCase() === q ||
            `#${p.number}` === q
          ) {
            matchedPlayers.push({
              orderId: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customer.name,
              playerName: p.name,
              number: p.number,
              size: p.size,
            });
            if (matchedPlayers.length >= 6) break;
          }
        }
      }
      if (matchedPlayers.length >= 6) break;
    }

    return { matchedOrders, matchedPlayers };
  }, [orders, searchQuery]);

  const urgentOrders = orders.filter(
    o => o.productionStatus !== 'SELESAI' && o.productionStatus !== 'DRAFT'
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
      {/* Left: Mobile hamburger & Page Breadcrumb Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Universal Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative" ref={searchContainerRef}>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchOpen(Boolean(searchQuery.trim()))}
            placeholder="Cari order, pelanggan, WA, atau nama pemain (e.g. Budi)..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-100 hover:bg-neutral-200/60 focus:bg-white border border-transparent focus:border-neutral-300 rounded-xl outline-none transition-all placeholder:text-neutral-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
                onGlobalSearch('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Popup */}
        {isSearchOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {/* Matched Orders */}
            {searchResults.matchedOrders.length > 0 && (
              <div className="p-2 border-b border-neutral-100">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider px-2 py-1 block">
                  Order Ditemukan ({searchResults.matchedOrders.length})
                </span>
                {searchResults.matchedOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => {
                      onSelectOrder(o.id);
                      setIsSearchOpen(false);
                    }}
                    className="p-2 rounded-xl hover:bg-neutral-50 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#D71920]">#{o.orderNumber}</span>{' '}
                      <span className="font-bold text-neutral-900">{o.customer.name}</span>
                      {o.customer.teamName && (
                        <span className="text-[10px] text-neutral-400"> ({o.customer.teamName})</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {o.product.totalQuantity} pcs · {o.product.material}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Matched Players */}
            {searchResults.matchedPlayers.length > 0 && (
              <div className="p-2">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider px-2 py-1 block flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#D71920]" />
                  <span>Pemain / Nomor Punggung Terdeteksi ({searchResults.matchedPlayers.length})</span>
                </span>
                {searchResults.matchedPlayers.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onSelectOrder(p.orderId);
                      setIsSearchOpen(false);
                    }}
                    className="p-2 rounded-xl hover:bg-red-50/60 cursor-pointer flex items-center justify-between text-xs group"
                  >
                    <div>
                      <span className="font-bold text-neutral-900 group-hover:text-[#D71920]">
                        {p.playerName}
                      </span>{' '}
                      <span className="font-mono font-black text-neutral-700 bg-neutral-100 px-1 py-0.2 rounded text-[11px]">
                        #{p.number}
                      </span>{' '}
                      <span className="text-[10px] text-neutral-400 font-mono">({p.size})</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      Order <strong className="font-mono">#{p.orderNumber}</strong> ({p.customerName})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.matchedOrders.length === 0 && searchResults.matchedPlayers.length === 0 && (
              <div className="p-6 text-center text-xs text-neutral-400">
                Tidak ada order atau nama pemain yang cocok dengan &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Realtime Status Pill */}
        <button
          onClick={onOpenSettingsDatabase}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
            realtimeStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : realtimeStatus === 'connecting'
              ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title={
            realtimeStatus === 'connected'
              ? 'Terhubung realtime ke database Supabase (Sinkron Multi-Admin)'
              : 'Mode Offline / LocalStorage (Klik untuk buka koneksi Supabase)'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              realtimeStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : realtimeStatus === 'connecting'
                ? 'bg-blue-500 animate-ping'
                : 'bg-amber-500'
            }`}
          />
          <span>
            {realtimeStatus === 'connected'
              ? 'Realtime Supabase'
              : realtimeStatus === 'connecting'
              ? 'Menghubungkan...'
              : 'Local / Offline'}
          </span>
        </button>
        {onRefreshOrders && (
          <button
            type="button"
            onClick={onRefreshOrders}
            disabled={isRefreshing}
            title="Muat ulang data dari Supabase"
            aria-label="Muat ulang data order"
            className="rounded-xl p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-wait disabled:opacity-50"
          >
            {isRefreshing
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            aria-label="Notifikasi Produksi"
          >
            <Bell className="w-4 h-4" />
            {urgentOrders.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D71920]" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-neutral-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-neutral-50/80 border-b border-neutral-200/70 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">Antrian Produksi Berjalan</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                  {urgentOrders.length} order
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
                {urgentOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">
                    Tidak ada order yang sedang antri produksi.
                  </div>
                ) : (
                  urgentOrders.map(o => (
                    <div
                      key={o.id}
                      onClick={() => {
                        onSelectOrder(o.id);
                        setIsNotifOpen(false);
                      }}
                      className="p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-neutral-900">
                          #{o.orderNumber}
                        </span>
                        <span className="text-[10px] font-bold text-[#D71920] px-1.5 py-0.5 bg-red-50 rounded">
                          {o.productionStatus}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-800 truncate">
                        {o.customer.name} {o.customer.teamName ? `(${o.customer.teamName})` : ''}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                        <span>{o.product.totalQuantity} pcs · {o.product.material}</span>
                        <span>Deadline: {formatDateId(o.customer.deadlineDate)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Supabase session identity; local role switch is only used in offline/demo mode. */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 hover:bg-neutral-100 rounded-xl transition-colors border border-transparent hover:border-neutral-200 text-left"
          >
            <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs ${
              (authRole || activeProfile.role) === 'owner' ? 'bg-[#D71920]' : 'bg-neutral-900'
            }`}>
              {authEmail ? authEmail.slice(0, 2).toUpperCase() : activeProfile.avatarInitial}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-neutral-900 leading-tight truncate max-w-[120px]">
                {authEmail || activeProfile.name}
              </div>
              <div className="text-[10px] text-neutral-400 font-medium">
                {authEmail ? (authRole === 'owner' ? 'Owner' : authRole === 'admin' ? 'Admin' : 'Belum diberi role') : activeProfile.roleLabel}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-neutral-200/90 shadow-xl overflow-hidden z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              {authEmail ? (
                <>
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-neutral-900">{authEmail}</p>
                    <p className="mt-1 text-[10px] text-neutral-500">Akses berdasarkan app_metadata.role: {authRole}</p>
                  </div>
                  <button type="button" onClick={onSignOut} className="flex w-full items-center gap-2.5 border-t border-neutral-100 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <LogOut className="h-3.5 w-3.5" /> Keluar dari Supabase
                  </button>
                </>
              ) : (
                <>
              <div className="px-4 py-2 border-b border-neutral-100">
                <p className="text-xs font-bold text-neutral-900">Ganti Akun Operator (Multi-Admin)</p>
                <p className="text-[10px] text-neutral-400">Pilih role untuk testing alur kerja workshop</p>
              </div>

              {/* Profiles list */}
              <div className="py-1 max-h-56 overflow-y-auto">
                {WORKSHOP_PROFILES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProfileSwitch(p)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                      activeProfile.id === p.id
                        ? 'bg-red-50 text-[#D71920] font-bold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left">
                      <span className="w-6 h-6 rounded-md bg-neutral-200 text-neutral-800 text-[10px] font-bold flex items-center justify-center">
                        {p.avatarInitial}
                      </span>
                      <div>
                        <div className="text-xs leading-tight">{p.name}</div>
                        <div className="text-[10px] text-neutral-400 font-normal">{p.roleLabel}</div>
                      </div>
                    </div>
                    {activeProfile.id === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#D71920]" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-neutral-100 py-1">
                <button
                  onClick={() => {
                    if (onOpenSettingsDatabase) onOpenSettingsDatabase();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Koneksi Supabase Database</span>
                </button>

                <button
                  onClick={() => {
                    onResetDemo();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Reset Demo Data (PDF Pasdama)</span>
                </button>

                <button
                  onClick={() => {
                    onClearAll();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Kosongkan Semua Order</span>
                </button>
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
