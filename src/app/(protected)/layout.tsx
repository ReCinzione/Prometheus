'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
      } else {
        router.push('/');
      }
      setLoading(false);
    };
    getSession();
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Caricamento...</div>;
  }

  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
