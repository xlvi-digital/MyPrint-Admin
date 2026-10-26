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
}

export const useRealtimeOrders = (initialOrders: Order[]): UseRealtimeOrdersResult => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [status, setStatus] = useState<RealtimeStatus>(
    isSupabaseConfigured() ? 'connecting' : 'local_mode'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const isMountedRef = useRef(true);

  const fetchLatest = useCallback(async () => {
    try {
      const latest = await supabaseOrderService.getOrders();
      if (isMountedRef.current) {
        setOrders(latest);
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.warn('Realtime fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      setStatus('local_mode');
      return;
    }

    setStatus('connecting');

    // Initial fetch from Supabase
    fetchLatest().then(() => {
      if (isMountedRef.current) setStatus('connected');
    });

    // Setup Supabase Realtime channel
    const channel = client
      .channel('myprintin-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          console.log('[Supabase Realtime] Order event received:', payload.eventType);
          fetchLatest();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        payload => {
          console.log('[Supabase Realtime] Item event received:', payload.eventType);
          fetchLatest();
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
  }, [fetchLatest]);

  return {
    orders,
    status,
    refreshOrders: fetchLatest,
    lastSyncedAt,
  };
};
