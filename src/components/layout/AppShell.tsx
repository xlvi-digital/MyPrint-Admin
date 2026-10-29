import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Topbar } from './Topbar';
import { Order } from '../../types/order';
import { AppRole } from '../../hooks/useSupabaseAuth';

interface AppShellProps {
  currentView: NavItemKey;
  onNavigate: (view: NavItemKey) => void;
  pageTitle: string;
  pageSubtitle?: string;
  orders: Order[];
  onGlobalSearch: (q: string) => void;
  onSelectOrder: (orderId: string) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
  onOpenQuickModal: () => void;
  onOpenWhatsAppModal: () => void;
  realtimeStatus?: 'connected' | 'connecting' | 'disconnected' | 'local_mode';
  onRefreshOrders?: () => void;
  isRefreshing?: boolean;
  refreshError?: string | null;
  authEmail?: string;
  authRole?: AppRole;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  pageTitle,
  pageSubtitle,
  orders,
  onGlobalSearch,
  onSelectOrder,
  onResetDemo,
  onClearAll,
  onOpenQuickModal,
  onOpenWhatsAppModal,
  realtimeStatus = 'local_mode',
  onRefreshOrders,
  isRefreshing,
  refreshError,
  authEmail,
  authRole,
  onSignOut,
  children,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Compute counts for sidebar
  const counts = {
    total: orders.length,
    inProduction: orders.filter(o => o.productionStatus !== 'DRAFT' && o.productionStatus !== 'SELESAI').length,
    completed: orders.filter(o => o.productionStatus === 'SELESAI').length,
    drafts: orders.filter(o => o.productionStatus === 'DRAFT').length,
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex text-[#111111]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenQuickModal={onOpenQuickModal}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Topbar */}
        <Topbar
          title={pageTitle}
          subtitle={pageSubtitle}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onGlobalSearch={onGlobalSearch}
          orders={orders}
          onSelectOrder={onSelectOrder}
          onResetDemo={onResetDemo}
          onClearAll={onClearAll}
          realtimeStatus={realtimeStatus}
          onRefreshOrders={onRefreshOrders}
          isRefreshing={isRefreshing}
          onOpenSettingsDatabase={() => onNavigate('settings')}
          authEmail={authEmail}
          authRole={authRole}
          onSignOut={onSignOut}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto no-print">
          {refreshError && currentView !== 'all-orders' && currentView !== 'completed' && (
            <div role="alert" className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Koneksi Supabase bermasalah: {refreshError}</span>
              <button type="button" onClick={onRefreshOrders} disabled={isRefreshing}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-3 py-2 font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:self-auto">
                {isRefreshing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-700 border-t-transparent" /> : null}
                {isRefreshing ? 'Mencoba...' : 'Coba lagi'}
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
