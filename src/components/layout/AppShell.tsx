import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Topbar } from './Topbar';
import { Order } from '../../types/order';

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
          onOpenSettingsDatabase={() => onNavigate('settings')}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto no-print">
          {children}
        </main>
      </div>
    </div>
  );
};
