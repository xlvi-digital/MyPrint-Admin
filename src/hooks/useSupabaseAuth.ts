import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';

export type AppRole = 'owner' | 'admin' | 'unassigned';

export const getSessionRole = (session: Session | null): AppRole => {
  const role = session?.user.app_metadata?.role;
  return role === 'owner' || role === 'admin' ? role : 'unassigned';
};

export const useSupabaseAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => {};
    const initializeSession = () => {
      unsubscribe();
      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setError(null);
          setIsLoading(false);
        }
      });
      unsubscribe = () => subscription.subscription.unsubscribe();

      void client.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(`Gagal memulihkan sesi Supabase: ${sessionError.message}`);
        setSession(data.session);
        setIsLoading(false);
      }).catch(sessionError => {
        if (!active) return;
        setError(sessionError instanceof Error ? sessionError.message : 'Gagal memulihkan sesi Supabase.');
        setIsLoading(false);
      });
    };

    initializeSession();
    window.addEventListener('myprintin:supabase-config-change', initializeSession);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('myprintin:supabase-config-change', initializeSession);
    };
  }, []);

  return {
    session,
    isLoading,
    error,
    role: getSessionRole(session),
    signOut: async () => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase belum dikonfigurasi.');
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw new Error(`Gagal keluar: ${signOutError.message}`);
    },
  };
};
