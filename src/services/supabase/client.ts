import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Strips any trailing slashes or accidentally appended REST/Auth/Realtime paths (/rest/v1, /rest/v1/, etc.)
 * Ensures the client always connects to the root project URL: https://<project-ref>.supabase.co
 */
export const sanitizeSupabaseUrl = (rawUrl?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip trailing /rest/v1 or /auth/v1 or /realtime/v1
  url = url.replace(/\/(rest|auth|realtime)\/v1\/?$/i, '');
  // Strip trailing slashes once more
  url = url.replace(/\/+$/, '');
  return url;
};

// Keys from env or custom runtime localStorage configuration
const getStoredUrl = (): string => {
  const local = localStorage.getItem('myprintin_supabase_url');
  if (local && local.trim()) {
    const cleanLocal = sanitizeSupabaseUrl(local);
    // Auto-heal localStorage if it was previously poisoned with /rest/v1
    if (cleanLocal !== local.trim()) {
      localStorage.setItem('myprintin_supabase_url', cleanLocal);
    }
    return cleanLocal;
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return sanitizeSupabaseUrl(envUrl);
  }

  return '';
};

const getStoredKey = (): string => {
  const local = localStorage.getItem('myprintin_supabase_key');
  if (local && local.trim()) return local.trim();

  const envKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();

  return '';
};

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';
let hasLoggedSafeDiagnostics = false;

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getStoredUrl();
  const key = getStoredKey();

  if (!url || !key) {
    return null;
  }

  // If credentials haven't changed, reuse existing client
  if (cachedClient && url === lastUrl && key === lastKey) {
    return cachedClient;
  }

  try {
    // Validate URL syntax before initializing
    const parsed = new URL(url);

    // Safe diagnostic log (NEVER prints key or secrets)
    if (!hasLoggedSafeDiagnostics) {
      console.log('[Supabase Config]', {
        host: parsed.hostname,
        hasPublishableKey: Boolean(key && key.length > 20),
        ordersTable: 'orders',
      });
      hasLoggedSafeDiagnostics = true;
    }

    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

/**
 * Direct exported singleton instance for convenience
 */
export const supabase = getSupabaseClient();

export const isSupabaseConfigured = (): boolean => {
  const url = getStoredUrl();
  const key = getStoredKey();
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.protocol.startsWith('http') && key.length > 20);
  } catch {
    return false;
  }
};

export const saveSupabaseCredentials = (url: string, key: string): boolean => {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = key.trim();

    localStorage.setItem('myprintin_supabase_url', cleanUrl);
    localStorage.setItem('myprintin_supabase_key', cleanKey);
    cachedClient = null; // force recreate next time getSupabaseClient() is called
    hasLoggedSafeDiagnostics = false;
    return true;
  } catch {
    return false;
  }
};

export const clearSupabaseCredentials = (): void => {
  localStorage.removeItem('myprintin_supabase_url');
  localStorage.removeItem('myprintin_supabase_key');
  cachedClient = null;
  lastUrl = '';
  lastKey = '';
  hasLoggedSafeDiagnostics = false;
};

export const getSupabaseConfig = () => {
  const url = getStoredUrl();
  const key = getStoredKey();
  const isEnvDefined = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
  );

  return {
    url,
    key,
    isEnvDefined,
  };
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; code?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL atau API Key Supabase belum diisi atau tidak valid.' };
  }

  try {
    const { error } = await client.from('orders').select('id').limit(1);
    if (error) {
      return { 
        success: false, 
        message: `Koneksi gagal: ${error.message}`, 
        code: error.code || 'UNKNOWN' 
      };
    }
    return { success: true, message: 'Koneksi ke Supabase database berhasil dan tabel orders terverifikasi!' };
  } catch (err: any) {
    return { success: false, message: `Error koneksi: ${err.message || 'Unknown network error'}` };
  }
};
