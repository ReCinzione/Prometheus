'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function Header() {
  const [session, setSession] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session || null);
    };
    fetchSession();
  }, [supabase.auth]);

  if (!session) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="w-full py-4 px-6 bg-white shadow-md flex justify-between items-center">
      <div className="text-xl font-bold">Prometheus</div>
      <nav className="space-x-6">
        <Link href="/home" className="hover:underline">Home</Link>
        <Link href="/mandala" className="hover:underline">Mandala</Link>
        <Link href="/archivio" className="hover:underline">Archivio</Link>
        <Link href="/libro" className="hover:underline">Libro</Link>
        <Link href="/percorsi" className="hover:underline">Percorsi</Link>
      </nav>
      <button onClick={handleLogout} className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Esci</button>
    </header>
  );
}
