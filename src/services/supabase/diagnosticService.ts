import { getSupabaseClient, isSupabaseConfigured, getSupabaseConfig, sanitizeSupabaseUrl } from './client';
import { generateUuid } from '../../utils/uuid';

export interface DiagnosticStep {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  durationMs?: number;
  errorCode?: string;
  suggestion?: string;
  details?: Record<string, any>;
}

export interface DiagnosticReport {
  overallStatus: 'healthy' | 'warning' | 'error' | 'not_configured';
  timestamp: string;
  maskedUrl: string;
  maskedKey: string;
  projectRef: string;
  isServiceRoleDetected: boolean;
  tokenRole: string;
  steps: DiagnosticStep[];
}

// Safely mask URL: https://abc123xyz.supabase.co -> https://abc12***.supabase.co
export const maskUrl = (url: string): string => {
  if (!url) return '(kosong)';
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length >= 2) {
      const proj = hostParts[0];
      const maskedProj = proj.length > 6 ? `${proj.substring(0, 4)}***${proj.substring(proj.length - 2)}` : `${proj.substring(0, 2)}***`;
      return `${parsed.protocol}//${maskedProj}.${hostParts.slice(1).join('.')}`;
    }
    return `${parsed.protocol}//${parsed.hostname.substring(0, 5)}***`;
  } catch {
    return `${url.substring(0, 8)}***`;
  }
};

// Safely mask key: eyJhbGci... -> eyJhbGci...****...881
export const maskKey = (key: string): string => {
  if (!key) return '(kosong)';
  if (key.length <= 16) return '****';
  return `${key.substring(0, 8)}...****...${key.substring(key.length - 4)}`;
};

// Parse JWT payload safely without external dependencies
export const parseJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const runSupabaseDiagnostics = async (): Promise<DiagnosticReport> => {
  const config = getSupabaseConfig();
  const rawUrl = sanitizeSupabaseUrl(config.url);
  const rawKey = config.key.trim();
  const timestamp = new Date().toISOString();

  const steps: DiagnosticStep[] = [];

  if (!rawUrl || !rawKey) {
    return {
      overallStatus: 'not_configured',
      timestamp,
      maskedUrl: maskUrl(rawUrl),
      maskedKey: maskKey(rawKey),
      projectRef: '-',
      isServiceRoleDetected: false,
      tokenRole: '-',
      steps: [
        {
          name: 'Konfigurasi URL & API Key',
          status: 'fail',
          message: 'VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum diisi.',
          suggestion: 'Isi URL dan Publishable Key di .env.local atau input formulir di bawah ini.',
        },
      ],
    };
  }

  // 1. Audit URL and Project Reference
  let projectRef = '';
  try {
    const parsed = new URL(rawUrl);
    projectRef = parsed.hostname.split('.')[0] || '';
    if (!parsed.protocol.startsWith('http')) {
      steps.push({
        name: 'Format URL Supabase',
        status: 'fail',
        message: 'Protokol URL harus diawali dengan https:// atau http://',
        suggestion: 'Pastikan URL berformat seperti: https://xyzcompany.supabase.co',
      });
    } else {
      steps.push({
        name: 'Format URL Supabase',
        status: 'pass',
        message: `URL valid dengan project ref: [${projectRef}]`,
        details: { host: parsed.host },
      });
    }
  } catch (err: any) {
    steps.push({
      name: 'Format URL Supabase',
      status: 'fail',
      message: `Format URL tidak valid: ${err.message}`,
      suggestion: 'Salin URL dari Supabase Project Settings -> API -> Project URL.',
    });
  }

  // 2. Audit API Key & Token Safety
  const tokenPayload = parseJwtPayload(rawKey);
  let isServiceRole = false;
  let tokenRole = 'unknown';

  if (!tokenPayload) {
    steps.push({
      name: 'Verifikasi Token / API Key',
      status: 'fail',
      message: 'Format API Key bukan JWT token yang valid dari Supabase.',
      suggestion: 'Gunakan Anon / Publishable API Key dari Supabase Project Settings -> API.',
    });
  } else {
    tokenRole = tokenPayload.role || 'anon';
    isServiceRole = tokenRole === 'service_role';

    if (isServiceRole) {
      steps.push({
        name: 'Verifikasi Token / API Key',
        status: 'fail',
        message: 'PERINGATAN KEAMANAN: Anda menggunakan SERVICE_ROLE key!',
        suggestion:
          'JANGAN PERNAH gunakan service_role secret key di frontend. Ganti segera dengan anon/public key untuk mencegah akses bypass database.',
      });
    } else {
      // Check project ref match if present in JWT
      const tokenRef = tokenPayload.ref || tokenPayload.app_metadata?.project_ref || '';
      const isRefMatching = !tokenRef || !projectRef || tokenRef === projectRef;

      if (!isRefMatching) {
        steps.push({
          name: 'Verifikasi Token / API Key',
          status: 'warn',
          message: `Ketidakcocokan project ref: URL [${projectRef}] vs Key [${tokenRef}]`,
          suggestion: 'Pastikan URL dan API Key berasal dari project Supabase yang SAMA.',
        });
      } else {
        steps.push({
          name: 'Verifikasi Token / API Key',
          status: 'pass',
          message: `API Key valid (Role: ${tokenRole}, Client Safe)`,
          details: { iss: tokenPayload.iss, role: tokenRole },
        });
      }
    }
  }

  // 3. Network REST Ping
  const pingStart = performance.now();
  try {
    const pingRes = await fetch(`${rawUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: rawKey,
        Authorization: `Bearer ${rawKey}`,
      },
    });
    const pingDuration = Math.round(performance.now() - pingStart);

    if (pingRes.ok || pingRes.status === 200 || pingRes.status === 404) {
      steps.push({
        name: 'Koneksi REST API Gateway',
        status: 'pass',
        message: `Terhubung dalam ${pingDuration}ms (Status: ${pingRes.status})`,
        durationMs: pingDuration,
      });
    } else if (pingRes.status === 401) {
      steps.push({
        name: 'Koneksi REST API Gateway',
        status: 'fail',
        errorCode: '401',
        message: '401 Unauthorized: API Key ditolak oleh Supabase Gateway.',
        suggestion: 'Periksa kembali apakah API Key sudah benar dan belum di-revoke.',
      });
    } else {
      steps.push({
        name: 'Koneksi REST API Gateway',
        status: 'warn',
        errorCode: String(pingRes.status),
        message: `HTTP Status ${pingRes.status}: ${pingRes.statusText}`,
      });
    }
  } catch (err: any) {
    steps.push({
      name: 'Koneksi REST API Gateway',
      status: 'fail',
      message: `Koneksi jaringan gagal: ${err.message || 'Network Error'}`,
      suggestion: 'Pastikan project Supabase aktif (tidak paused) dan periksa koneksi internet.',
    });
  }

  // 4. Test Query Table `orders`
  const client = getSupabaseClient();
  if (client) {
    const readStart = performance.now();
    try {
      const { data, count, error } = await client
        .from('orders')
        .select('id', { count: 'exact', head: false })
        .limit(5);

      const readDuration = Math.round(performance.now() - readStart);

      if (error) {
        let suggestion = 'Jalankan skrip schema.sql di Supabase SQL Editor.';
        if (error.code === '42P01') {
          suggestion = 'Tabel "orders" belum dibuat! Buka Supabase SQL Editor lalu jalankan script dari tombol "Salin SQL Schema".';
        } else if (error.code === '42501') {
          suggestion = 'RLS Policy menolak SELECT untuk user anonim. Pastikan policy "Allow all operations for orders" aktif.';
        }

        steps.push({
          name: 'Pembacaan Tabel Orders',
          status: 'fail',
          errorCode: error.code || 'UNKNOWN',
          message: `Gagal membaca tabel: ${error.message}`,
          suggestion,
          durationMs: readDuration,
        });
      } else {
        const orderCount = count !== null ? count : (data ? data.length : 0);
        steps.push({
          name: 'Pembacaan Tabel Orders',
          status: 'pass',
          message: `Berhasil membaca tabel orders (${orderCount} record ditemukan) dalam ${readDuration}ms`,
          durationMs: readDuration,
          details: { count: orderCount },
        });
      }
    } catch (err: any) {
      steps.push({
        name: 'Pembacaan Tabel Orders',
        status: 'fail',
        message: `Eksepsi saat query: ${err.message}`,
      });
    }

    // 5. Safe Roundtrip Write & Clean Probe (Inserts a temporary ping record and deletes it immediately)
    const probeId = generateUuid();
    const probeOrderNumber = `PROBE-${Date.now().toString().slice(-6)}`;
    const writeStart = performance.now();

    try {
      // Insert probe
      const { error: insertErr } = await client.from('orders').insert({
        id: probeId,
        order_number: probeOrderNumber,
        customer_name: '__DIAGNOSTIC_PROBE__',
        customer_phone: '0800000000',
        order_date: new Date().toISOString().split('T')[0],
        product_type: 'Test Probe',
        material: 'Milano',
        total_quantity: 1,
        production_status: 'DRAFT',
        notes: 'Pemeriksaan diagnostic koneksi otomatis. Dihapus langsung.',
      });

      if (insertErr) {
        let suggestion = 'Periksa RLS INSERT policy atau tipe kolom pada tabel orders.';
        if (insertErr.code === '42501') {
          suggestion = 'RLS policy menolak INSERT untuk user saat ini. Pastikan policy WITH CHECK (true) telah diatur.';
        }

        steps.push({
          name: 'Pengujian Simpan Data Uji (Write Probe)',
          status: 'fail',
          errorCode: insertErr.code,
          message: `Gagal menyimpan data uji: ${insertErr.message}`,
          suggestion,
        });
      } else {
        // Probe was inserted! Now delete it to leave zero garbage
        const { error: deleteErr } = await client.from('orders').delete().eq('id', probeId);
        const writeDuration = Math.round(performance.now() - writeStart);

        if (deleteErr) {
          steps.push({
            name: 'Pengujian Simpan Data Uji (Write Probe)',
            status: 'warn',
            message: `Insert berhasil, namun pembersihan gagal (${deleteErr.message}). Harap periksa DELETE RLS policy.`,
            durationMs: writeDuration,
          });
        } else {
          steps.push({
            name: 'Pengujian Simpan Data Uji (Write Probe)',
            status: 'pass',
            message: `Insert & Delete data uji berhasil sempurna dalam ${writeDuration}ms (RLS Terverifikasi)`,
            durationMs: writeDuration,
          });
        }
      }
    } catch (err: any) {
      steps.push({
        name: 'Pengujian Simpan Data Uji (Write Probe)',
        status: 'fail',
        message: `Eksepsi saat pengujian write: ${err.message}`,
      });
    }

    // 6. Realtime Subscription Channel Verification
    try {
      const channelName = `diagnostic-ping-${Date.now()}`;
      let channelSubscribed = false;
      const chan = client.channel(channelName);

      const channelPromise = new Promise<'pass' | 'warn'>((resolve) => {
        const timeout = setTimeout(() => {
          resolve('warn');
        }, 3500);

        chan.subscribe((subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            channelSubscribed = true;
            clearTimeout(timeout);
            resolve('pass');
          }
        });
      });

      const chanResult = await channelPromise;
      client.removeChannel(chan);

      if (chanResult === 'pass') {
        steps.push({
          name: 'Saluran Realtime WebSocket',
          status: 'pass',
          message: 'Supabase Realtime channel aktif & berhasil menerima handshake',
        });
      } else {
        steps.push({
          name: 'Saluran Realtime WebSocket',
          status: 'warn',
          message: 'Realtime WebSocket handshake timeout (Polling fallback aktif)',
          suggestion: 'Pastikan opsi Realtime Replication aktif di Supabase Dashboard -> Database -> Publications.',
        });
      }
    } catch (err: any) {
      steps.push({
        name: 'Saluran Realtime WebSocket',
        status: 'warn',
        message: `Realtime test warning: ${err.message}`,
      });
    }
  }

  // Calculate Overall Status
  const hasFail = steps.some(s => s.status === 'fail');
  const hasWarn = steps.some(s => s.status === 'warn');

  const overallStatus = hasFail ? 'error' : hasWarn ? 'warning' : 'healthy';

  return {
    overallStatus,
    timestamp,
    maskedUrl: maskUrl(rawUrl),
    maskedKey: maskKey(rawKey),
    projectRef,
    isServiceRoleDetected: isServiceRole,
    tokenRole,
    steps,
  };
};
