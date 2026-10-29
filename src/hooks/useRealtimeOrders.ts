import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { supabaseOrderService } from '../services/supabase/orderService';
import { Order } from '../types/order';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'local_mode';

interface UseRealtimeOrdersResult {
  orders: Order[];
  status: RealtimeStatus;
  refreshOrders: () => Promise<void>;
  lastSyncedAt: Date | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export const useRealtimeOrders = (
  initialOrders: Order[],
  canConnect = true,
): UseRealtimeOrdersResult => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [status, setStatus] = useState<RealtimeStatus>(
    isSupabaseConfigured() ? 'connecting' : 'local_mode'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured() && canConnect);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestRef = useRef<Promise<void> | null>(null);
  const hasLoadedRef = useRef(!isSupabaseConfigured());

  const fetchLatest = useCallback((initial = false): Promise<void> => {
    if (requestRef.current) return requestRef.current;
    const showInitialLoading = initial || !hasLoadedRef.current;
    if (showInitialLoading) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    const request = (async () => {
      try {
        const latest = await supabaseOrderService.getOrders({ fallbackToLocal: false });
        hasLoadedRef.current = true;
        if (isMountedRef.current) {
          setOrders(latest);
          setLastSyncedAt(new Date());
          setStatus('connected');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memuat data order dari Supabase.';
        console.warn('Order fetch failed:', message);
        hasLoadedRef.current = true;
        if (isMountedRef.current) {
          setError(message);
          setStatus('disconnected');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        requestRef.current = null;
      }
    })();
    requestRef.current = request;
    return request;
  }, []);
  const refreshOrders = useCallback(() => fetchLatest(false), [fetchLatest]);

  useEffect(() => {
    isMountedRef.current = true;
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      setStatus('local_mode');
      setIsLoading(false);
      return;
    }

    if (!canConnect) {
      setStatus('disconnected');
      setIsLoading(false);
      return;
    }

    setStatus('connecting');
    void fetchLatest(true);

    // Setup Supabase Realtime channel
    const channel = client
      .channel('myprintin-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          console.log('[Supabase Realtime] Order event received:', payload.eventType);
          void refreshOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        payload => {
          console.log('[Supabase Realtime] Item event received:', payload.eventType);
          void refreshOrders();
        }
      )
      .subscribe((subStatus, err) => {
        if (!isMountedRef.current) return;
        if (subStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Channel status:', subStatus, err);
          setStatus('disconnected');
        }
      });

    return () => {
      isMountedRef.current = false;
      client.removeChannel(channel);
    };
  }, [canConnect, fetchLatest, refreshOrders]);

  return {
    orders,
    status,
    refreshOrders,
    lastSyncedAt,
    isLoading,
    isRefreshing,
    error,
  };
};
