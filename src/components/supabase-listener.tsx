'use client';

import { createClient } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SupabaseListener({
  accessToken,
  serverSession,
}: {
  accessToken?: string;
  serverSession: Session | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== accessToken) {
        router.refresh();
      }
    });
  }, [accessToken, supabase, router]);

  return null;
}
