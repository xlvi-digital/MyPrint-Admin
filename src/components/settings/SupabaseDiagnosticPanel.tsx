import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Database, 
  Radio, 
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { runSupabaseDiagnostics, DiagnosticReport } from '../../services/supabase/diagnosticService';

interface SupabaseDiagnosticPanelProps {
  onRefreshOrders?: () => void;
}

export const SupabaseDiagnosticPanel: React.FC<SupabaseDiagnosticPanelProps> = ({
  onRefreshOrders,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await runSupabaseDiagnostics();
      setReport(result);
      if (result.overallStatus === 'healthy' && onRefreshOrders) {
        onRefreshOrders();
      }
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleDetail = (index: number) => {
    setExpandedDetails(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
              Diagnostic Mode & Audit Koneksi Supabase
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Uji menyeluruh gateway REST, izin RLS tabel, pengujian write probe, dan status token.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunDiagnostics}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Menjalankan Audit...' : 'Jalankan Pemeriksaan Koneksi'}</span>
        </button>
      </div>

      {/* When no report has been run yet */}
      {!report && !isRunning && (
        <div className="p-6 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <Database className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-neutral-700">
            Klik tombol &quot;Jalankan Pemeriksaan Koneksi&quot; di atas untuk memulai uji diagnostik.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Pemeriksaan aman dan tidak akan menghapus atau mengubah data produksi Anda.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isRunning && (
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 animate-pulse">
            <RotateCcw className="w-4 h-4 animate-spin" />
            <span>Memeriksa gateway API, tabel orders, dan izin keamanan RLS...</span>
          </div>
          <div className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />
          <div className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Diagnostic Report Display */}
      {report && !isRunning && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Overall Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              report.overallStatus === 'healthy'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : report.overallStatus === 'warning'
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : report.overallStatus === 'not_configured'
                ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                : 'bg-red-50/80 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {report.overallStatus === 'healthy' ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : report.overallStatus === 'warning' ? (
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {report.overallStatus === 'healthy'
                    ? 'Koneksi Database Optimal & Siap Produksi'
                    : report.overallStatus === 'warning'
                    ? 'Terhubung dengan Catatan (Peringatan)'
                    : report.overallStatus === 'not_configured'
                    ? 'Koneksi Belum Dikonfigurasi'
                    : 'Masalah Koneksi Terdeteksi'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5 font-medium">
                  {report.overallStatus === 'healthy'
                    ? 'Seluruh pengujian REST, pembacaan tabel, izin write probe, dan token lolos verifikasi.'
                    : 'Beberapa pemeriksaan membutuhkan perhatian sebelum order dapat disinkronkan secara aman.'}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono opacity-60 shrink-0">
              {new Date(report.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Secure Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Project URL (Masked)</span>
              <span className="font-mono font-bold text-neutral-800 truncate block">
                {report.maskedUrl}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">API Key (Masked)</span>
              <span className="font-mono font-bold text-neutral-800 truncate block">
                {report.maskedKey}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Token Role / Keamanan</span>
              <span className={`inline-flex items-center gap-1 font-bold font-mono text-[11px] ${
                report.isServiceRoleDetected ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {report.isServiceRoleDetected ? (
                  <>
                    <ShieldAlert className="w-3 h-3" />
                    <span>SERVICE_ROLE (BAHAYA!)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    <span>Role: {report.tokenRole} (Aman)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Detailed Audit Steps */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1 block">
              Hasil 6 Langkah Pengujian Audit:
            </span>

            {report.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 transition-colors text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {step.status === 'pass' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : step.status === 'warn' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{step.name}</span>
                        {step.errorCode && (
                          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold">
                            Kode: {step.errorCode}
                          </span>
                        )}
                        {step.durationMs !== undefined && (
                          <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {step.durationMs}ms
                          </span>
                        )}
                      </div>

                      <p className="text-neutral-600 mt-0.5 text-[11px] leading-relaxed">
                        {step.message}
                      </p>

                      {step.suggestion && (
                        <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 font-medium">
                          <strong>Saran Perbaikan: </strong> {step.suggestion}
                        </div>
                      )}
                    </div>
                  </div>

                  {step.details && (
                    <button
                      onClick={() => toggleDetail(idx)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
                      title="Lihat Detail Teknis"
                    >
                      {expandedDetails[idx] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {expandedDetails[idx] && step.details && (
                  <div className="mt-2 pt-2 border-t border-neutral-100 font-mono text-[10px] text-neutral-600 bg-neutral-50 p-2 rounded-lg overflow-x-auto">
                    <pre>{JSON.stringify(step.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
