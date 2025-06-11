'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Session } from '@supabase/supabase-js';

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  };

  const userDisplayName = session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';

  return (
    <header className="w-full py-4 px-6 bg-white/80 backdrop-blur-sm shadow-md flex flex-wrap justify-between items-center">
      <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 sm:mb-0">
        Prometheus
      </div>
      <nav className="flex flex-wrap justify-center space-x-0 sm:space-x-2 md:space-x-6 order-3 sm:order-2 w-full sm:w-auto mt-4 sm:mt-0">
        <Link href="/home" className="hover:text-purple-600 transition-colors px-2 py-1">Home</Link>
        <Link href="/mandala" className="hover:text-purple-600 transition-colors px-2 py-1">Mandala</Link>
        <Link href="/archivio" className="hover:text-purple-600 transition-colors px-2 py-1">Archivio</Link>
        <Link href="/libro" className="hover:text-purple-600 transition-colors px-2 py-1">Libro</Link>
        <Link href="/percorsi" className="hover:text-purple-600 transition-colors px-2 py-1">Percorsi</Link>
      </nav>
      <div className="flex items-center space-x-2 md:space-x-4 order-2 sm:order-3">
        <span className="text-sm text-gray-600">
          {userDisplayName}
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Esci
        </button>
      </div>
    </header>
  );
}
