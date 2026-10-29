import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  RotateCcw, 
  Trash2, 
  Download, 
  Upload, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  Database,
  Building,
  Key,
  Globe,
  Radio,
  Copy,
  Check,
  AlertTriangle,
  History,
  Activity,
  Users
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Order } from '../types/order';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { 
  getSupabaseConfig, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  testSupabaseConnection, 
  isSupabaseConfigured,
  sanitizeSupabaseUrl 
} from '../services/supabase/client';
import { supabaseOrderService, ActivityLog } from '../services/supabase/orderService';
import { formatDateId } from '../utils/formatters';
import { SupabaseDiagnosticPanel } from '../components/settings/SupabaseDiagnosticPanel';

interface SettingsProps {
  orders: Order[];
  onReloadOrders: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  orders,
  onReloadOrders,
  onShowToast,
}) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearLegacyModalOpen, setIsClearLegacyModalOpen] = useState(false);
  const [legacyOrdersExported, setLegacyOrdersExported] = useState(false);

  // Supabase Configuration State
  const initialConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(initialConfig.key);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [hasCopiedSchema, setHasCopiedSchema] = useState(false);

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await supabaseOrderService.getActivityLogs();
      setActivityLogs(logs);
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveSupabase = async () => {
    const cleanUrl = sanitizeSupabaseUrl(supabaseUrl);
    setSupabaseUrl(cleanUrl);
    saveSupabaseCredentials(cleanUrl, supabaseKey);
    onShowToast('info', 'Menyimpan konfigurasi dan mencoba menghubungkan ke database...');
    
    setIsTestingConn(true);
    const result = await testSupabaseConnection();
    setIsTestingConn(false);
    setConnResult(result);

    if (result.success) {
      onShowToast('success', result.message, 'Supabase Terhubung');
      onReloadOrders();
    } else {
      onShowToast('warning', result.message, 'Verifikasi Supabase');
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnResult(null);
    const result = await testSupabaseConnection();
    setIsTestingConn(false);
    setConnResult(result);

    if (result.success) {
      onShowToast('success', result.message, 'Koneksi Berhasil');
    } else {
      onShowToast('error', result.message, 'Gagal Terhubung');
    }
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseCredentials();
    setSupabaseUrl('');
    setSupabaseKey('');
    setConnResult(null);
    onShowToast('info', 'Konfigurasi Supabase dihapus. Sistem beralih ke local storage mode.');
  };

  const handleCopySchemaSql = () => {
    const schemaSql = `-- MYPRINTIN ADMIN SUPABASE SCHEMA (Paste di Supabase SQL Editor)
-- Lihat file /supabase/schema.sql untuk script lengkap
-- Setelah schema dasar tersedia, jalankan supabase/migration_order_channels_and_master_data.sql secara terpisah.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  team_name TEXT,
  customer_address TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline_date DATE,
  product_type TEXT NOT NULL DEFAULT 'Jersey Sublime',
  material TEXT NOT NULL DEFAULT 'Milano',
  color TEXT DEFAULT 'Custom Sublime',
  model TEXT DEFAULT 'Reguler Fit',
  sleeve TEXT DEFAULT 'Pendek',
  rib TEXT DEFAULT 'Tidak Pakai Rib',
  total_quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  use_table_threshold INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  production_status TEXT NOT NULL DEFAULT 'DRAFT',
  designer_name TEXT,
  designer_initial TEXT,
  press_signed BOOLEAN NOT NULL DEFAULT false,
  cutting_signed BOOLEAN NOT NULL DEFAULT false,
  jahit_signed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT DEFAULT '',
  size TEXT NOT NULL DEFAULT 'L',
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Desain Utama',
  data_url TEXT NOT NULL,
  file_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_printing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_collar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL DEFAULT 'POLO KANCING 2',
  image_url TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrasi aman jika tabel sudah ada:
ALTER TABLE order_collar ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE order_collar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS order_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT 'Admin Workshop',
  actor_role TEXT NOT NULL DEFAULT 'admin',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_printing ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_collar ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all designs" ON order_designs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all printing" ON order_printing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all collar" ON order_collar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all logs" ON order_activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Supabase Storage Buckets & Policies
INSERT INTO storage.buckets (id, name, public) VALUES ('collar-references', 'collar-references', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('order-designs', 'order-designs', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Collar Public" ON storage.objects;
CREATE POLICY "Collar Public" ON storage.objects FOR SELECT USING (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Collar Upload" ON storage.objects;
CREATE POLICY "Collar Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Collar Update" ON storage.objects;
CREATE POLICY "Collar Update" ON storage.objects FOR UPDATE USING (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Collar Delete" ON storage.objects;
CREATE POLICY "Collar Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('collar-references', 'order-designs'));

ALTER PUBLICATION supabase_realtime ADD TABLE orders, order_items, order_activity_logs;`;

    navigator.clipboard.writeText(schemaSql);
    setHasCopiedSchema(true);
    setTimeout(() => setHasCopiedSchema(false), 3000);
    onShowToast('success', 'Script SQL telah disalin ke clipboard! Tempelkan di Supabase SQL Editor.');
  };

  const handleResetDemo = () => {
    if (isSupabaseConfigured()) {
      onShowToast('warning', 'Data demo lokal tidak dapat mengganti data pesanan Supabase.');
      setIsResetModalOpen(false);
      return;
    }
    storageService.resetToDemoData();
    onReloadOrders();
    setIsResetModalOpen(false);
    onShowToast('success', 'Demo data Form Order Sublime (Pasdama #366) berhasil direset.');
  };

  const handleClearAll = () => {
    if (isSupabaseConfigured()) {
      onShowToast('warning', 'Pengosongan lokal dinonaktifkan saat menggunakan Supabase; data database tidak dihapus.');
      setIsClearAllModalOpen(false);
      return;
    }
    storageService.clearAllOrders();
    onReloadOrders();
    setIsClearAllModalOpen(false);
    onShowToast('info', 'Semua data order telah dikosongkan.');
  };

  const handleBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `myprintin_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('success', 'File backup JSON berhasil didownload.');
  };

  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const importedOrders: unknown = JSON.parse(await file.text());
      if (!Array.isArray(importedOrders)) {
        onShowToast('error', 'Format file JSON tidak valid.');
        return;
      }
      let restoredCount = 0;
      const failures: string[] = [];
      for (const importedOrder of importedOrders as Order[]) {
        if (!importedOrder?.customer || !importedOrder?.product) {
          failures.push('Ada data order dengan format tidak lengkap.');
          continue;
        }
        const result = await supabaseOrderService.saveOrder(importedOrder);
        if (result.success) {
          restoredCount += 1;
          if (result.designsError || result.assetsError) {
            failures.push(`#${importedOrder.orderNumber || result.order.orderNumber}: ${result.designsError || result.assetsError}`);
          }
        } else {
          failures.push(`#${importedOrder.orderNumber || 'baru'}: ${result.error || 'gagal disimpan'}`);
        }
      }
      await onReloadOrders();
      if (failures.length > 0) {
        onShowToast(
          restoredCount > 0 ? 'warning' : 'error',
          `${restoredCount} dari ${importedOrders.length} order tersimpan. ${failures.slice(0, 3).join(' | ')}`,
          'Pemulihan Sebagian',
        );
      } else {
        onShowToast('success', `Berhasil memulihkan ${restoredCount} order ke Supabase.`);
      }
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? `Gagal memulihkan backup: ${error.message}` : 'Gagal membaca file JSON backup.',
      );
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleExportLegacyOrders = () => {
    const legacyOrders = storageService.getLegacyOrders();
    if (!legacyOrders?.length) {
      onShowToast('info', 'Tidak ditemukan data pada cache browser lama.');
      return;
    }
    const blob = new Blob([JSON.stringify(legacyOrders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `myprintin_legacy_browser_orders_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    setLegacyOrdersExported(true);
    onShowToast('success', `${legacyOrders.length} order lokal lama diekspor. Periksa file sebelum memulihkannya ke Supabase.`);
  };

  const handleClearLegacyOrders = () => {
    if (!legacyOrdersExported) {
      onShowToast('warning', 'Ekspor cache lokal lama terlebih dahulu sebelum menghapusnya.');
      return;
    }
    if (storageService.clearLegacyOrders()) {
      setLegacyOrdersExported(false);
      setIsClearLegacyModalOpen(false);
      onShowToast('success', 'Cache order lama di browser telah dibersihkan. Data Supabase tidak berubah.');
    } else {
      onShowToast('error', 'Cache lama gagal dihapus. Data tidak diubah; coba lagi setelah ekspor.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D71920] flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Pengaturan Sistem & Database Produksi
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Integrasi Supabase Multi-Admin Realtime, format cetak A4, dan audit log pengerjaan order.
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Database Connection Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Integrasi Database Supabase (Multi-Admin Realtime)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Hubungkan project Supabase agar semua operator, admin, dan owner menggunakan database yang sama secara real-time.
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              Untuk Metode Pesanan dan Data Master, jalankan file <code>supabase/migration_order_channels_and_master_data.sql</code> setelah schema dasar.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopySchemaSql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors"
              title="Salin SQL Schema untuk di-paste di Supabase SQL Editor"
            >
              {hasCopiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopiedSchema ? 'Tersalin!' : 'Salin SQL Schema'}</span>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <span>Project URL Supabase (VITE_SUPABASE_URL)</span>
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 rounded-xl text-xs font-mono outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-neutral-400" />
              <span>Anon / Publishable API Key (VITE_SUPABASE_PUBLISHABLE_KEY)</span>
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={e => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 rounded-xl text-xs font-mono outline-none transition-colors"
            />
          </div>
        </div>

        {/* Connection Result Banner */}
        {connResult && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              connResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {connResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{connResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-neutral-400">
            {isSupabaseConfigured() ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Supabase tersambung. Sinkronisasi realtime aktif antar admin.</span>
              </span>
            ) : (
              <span>Menggunakan local browser storage sementara. Data tidak hilang saat refresh.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConfigured() && (
              <button
                onClick={handleDisconnectSupabase}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-red-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Putuskan
              </button>
            )}

            <button
              onClick={handleTestConnection}
              disabled={isTestingConn || !supabaseUrl || !supabaseKey}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-800 rounded-xl text-xs font-bold transition-colors"
            >
              {isTestingConn ? 'Menguji...' : 'Uji Koneksi'}
            </button>

            <button
              onClick={handleSaveSupabase}
              disabled={isTestingConn || !supabaseUrl || !supabaseKey}
              className="px-4 py-2 bg-[#D71920] hover:bg-[#b8141a] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Simpan & Hubungkan
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Connection Diagnostic & Safety Audit Panel */}
      <SupabaseDiagnosticPanel onRefreshOrders={onReloadOrders} />

      {/* Multi-Admin Audit Trail & Activity Log */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D71920]" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Audit Trail & Log Aktivitas Multi-Admin
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Riwayat perubahan status produksi, pembuatan order, dan paraf teknis oleh tim workshop.
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            disabled={isLoadingLogs}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            title="Refresh Log"
          >
            <RotateCcw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Aktivitas</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 bg-white font-mono text-[11px]">
              {activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400 font-sans text-xs">
                    Belum ada log aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                activityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-50/70">
                    <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                      {formatDateId(log.createdAt)}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#D71920]">
                      #{log.orderNumber}
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-neutral-900">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 font-sans text-neutral-700">
                      <strong>{log.actorName}</strong> ({log.actorRole})
                    </td>
                    <td className="py-2 px-3 text-neutral-500 truncate max-w-xs font-sans">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printing & Layout Guide */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Printer className="w-4 h-4 text-neutral-700" />
          <span>Panduan Cetak Browser & Form Order Sublime (A4 Ready)</span>
        </h3>

        <div className="space-y-3 text-xs text-neutral-600 leading-relaxed bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/60">
          <p>
            Aplikasi ini telah menggunakan arsitektur pencetakan khusus dengan container terisolasi <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 font-mono text-neutral-800">#print-root</code>:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-700">
            <li>Kertas: <strong>A4 Portrait</strong> (Margin 8mm - 10mm).</li>
            <li>Centang opsi <strong>&quot;Background Graphics&quot;</strong> di jendela print browser agar warna desain, latar belakang tabel, dan header hitam tercetak jelas.</li>
            <li>Header tabel roster pemain (<code className="font-mono">thead</code>) otomatis berulang di setiap halaman jika daftar nama melebihi batas 1 lembar.</li>
            <li>Baris tabel dilindungi dengan <code className="font-mono">break-inside: avoid</code> untuk mencegah teks terbelah dua.</li>
          </ul>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Cadangan & Pemulihan Data (JSON Backup)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Backup Button */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-neutral-900 mb-1">Download Backup Database</h4>
              <p className="text-[11px] text-neutral-500 mb-3">
                Simpan seluruh data {orders.length} order dalam file JSON untuk dicadangkan.
              </p>
            </div>
            <button
              onClick={handleBackupJson}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup JSON</span>
            </button>
          </div>

          {/* Restore Button */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-neutral-900 mb-1">Restore Database</h4>
              <p className="text-[11px] text-neutral-500 mb-3">
                Pulihkan file JSON cadangan order langsung ke Supabase.
              </p>
            </div>
            <label className={`flex items-center justify-center gap-2 px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${isRestoring ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <Upload className="w-3.5 h-3.5" />
              <span>{isRestoring ? 'Memulihkan...' : 'Pilih File Backup JSON'}</span>
              <input type="file" accept=".json,application/json" onChange={handleRestoreJson} disabled={isRestoring} className="hidden" />
            </label>
          </div>

          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-neutral-900 mb-1">Cache Browser Versi Lama</h4>
              <p className="text-[11px] text-neutral-500 mb-3">
                Ekspor cache lama untuk memeriksa order yang mungkin belum tersinkron. Cache tidak akan dihapus otomatis.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportLegacyOrders}
                className="flex flex-1 items-center justify-center gap-2 px-3 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-neutral-800 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Data</span>
              </button>
              <button
                onClick={() => setIsClearLegacyModalOpen(true)}
                disabled={!legacyOrdersExported}
                title={!legacyOrdersExported ? 'Ekspor cache lama terlebih dahulu' : undefined}
                className="flex flex-1 items-center justify-center gap-2 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Cache</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Data Management */}
        <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-xs text-neutral-900">Kelola Contoh Data Bawaan (Demo Pasdama)</h4>
            <p className="text-[11px] text-neutral-400">
              Hanya tersedia dalam mode lokal. Pengaturan ini tidak mengubah data Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsResetModalOpen(true)}
              disabled={isSupabaseConfigured()}
              title={isSupabaseConfigured() ? 'Tidak tersedia saat Supabase aktif' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Demo</span>
            </button>

            <button
              onClick={() => setIsClearAllModalOpen(true)}
              disabled={isSupabaseConfigured()}
              title={isSupabaseConfigured() ? 'Tidak tersedia saat Supabase aktif' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Data Demo Bawaan?"
        subtitle="Data order akan dikembalikan ke data demo template awal (termasuk Pasdama Milano #366)."
        type="warning"
        confirmText="Ya, Reset Demo"
        cancelText="Batal"
        onConfirm={handleResetDemo}
        onCancel={() => setIsResetModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearAllModalOpen}
        title="Hapus Seluruh Data Order?"
        subtitle="Tindakan ini akan mengosongkan seluruh riwayat order di sistem ini."
        type="danger"
        confirmText="Kosongkan Semua"
        cancelText="Batal"
        onConfirm={handleClearAll}
        onCancel={() => setIsClearAllModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearLegacyModalOpen}
        title="Bersihkan Cache Order Browser Lama?"
        subtitle="Pastikan file ekspor telah tersimpan dan data yang belum tersinkron sudah dipulihkan. Tindakan ini hanya menghapus salinan browser, bukan data Supabase."
        type="warning"
        confirmText="Bersihkan Cache Lama"
        cancelText="Batal"
        onConfirm={handleClearLegacyOrders}
        onCancel={() => setIsClearLegacyModalOpen(false)}
      />
    </div>
  );
};
