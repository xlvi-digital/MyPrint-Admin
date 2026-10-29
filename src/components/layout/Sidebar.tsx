import React from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  Layers, 
  Sliders, 
  Shirt, 
  Printer, 
  Users, 
  CheckCircle2, 
  Settings, 
  ChevronRight,
  X,
  MessageSquare,
  Database,
} from 'lucide-react';

export type NavItemKey = 
  | 'dashboard' 
  | 'quick-order' 
  | 'all-orders' 
  | 'production' 
  | 'size-recap' 
  | 'printing-queue' 
  | 'player-roster' 
  | 'completed' 
  | 'master-data'
  | 'settings';

interface SidebarProps {
  currentView: NavItemKey;
  onNavigate: (view: NavItemKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenQuickModal: () => void;
  onOpenWhatsAppModal: () => void;
  counts: {
    total: number;
    inProduction: number;
    completed: number;
    drafts: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenQuickModal,
  onOpenWhatsAppModal,
  counts,
}) => {
  const navItems: { key: NavItemKey; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      key: 'quick-order',
      label: 'Quick Order',
      icon: <Zap className="w-4 h-4 text-[#D71920]" />,
    },
    {
      key: 'all-orders',
      label: 'Semua Order',
      icon: <Layers className="w-4 h-4" />,
      count: counts.total,
    },
    {
      key: 'production',
      label: 'Papan Produksi',
      icon: <Sliders className="w-4 h-4 text-amber-500" />,
      count: counts.inProduction,
    },
    {
      key: 'size-recap',
      label: 'Rekap Ukuran',
      icon: <Shirt className="w-4 h-4 text-indigo-500" />,
    },
    {
      key: 'printing-queue',
      label: 'Rekap Printing',
      icon: <Printer className="w-4 h-4 text-blue-500" />,
    },
    {
      key: 'player-roster',
      label: 'Rekap Nama & Nomor',
      icon: <Users className="w-4 h-4 text-teal-500" />,
    },
    {
      key: 'completed',
      label: 'Order Selesai',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      count: counts.completed,
    },
    {
      key: 'master-data',
      label: 'Data Master',
      icon: <Database className="w-4 h-4 text-violet-500" />,
    },
    {
      key: 'settings',
      label: 'Pengaturan',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleSelect = (key: NavItemKey) => {
    onNavigate(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden no-print"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-neutral-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 no-print ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-neutral-200/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D71920] flex items-center justify-center text-white font-black text-lg tracking-tighter shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-neutral-900 text-lg tracking-tight">myprintin</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 text-[#D71920] uppercase tracking-wider">
                  admin
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Production Order System</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Fast Action CTAs */}
        <div className="p-4 pb-2 space-y-2">
          <button
            onClick={() => {
              onOpenQuickModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-red-500/20 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            <span>+ ORDER BARU (30s)</span>
          </button>

          <button
            onClick={() => {
              onOpenWhatsAppModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-xl font-semibold text-xs transition-all active:scale-[0.98]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Chat WhatsApp</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            Menu Operasional
          </div>

          {navItems.map(item => {
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-200'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Production Footer Badge */}
        <div className="p-4 border-t border-neutral-200/70 bg-neutral-50/70">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
            <span className="font-semibold text-neutral-700">Input Once</span>
            <span className="font-mono text-[#D71920] font-bold">Use Everywhere</span>
          </div>
          <div className="text-[10px] text-neutral-400 leading-tight">
            Epson & Mimaki Sublimation Ready
          </div>
        </div>
      </aside>
    </>
  );
};
