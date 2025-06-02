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

  return (
    <header className="w-full py-4 px-6 bg-white/80 backdrop-blur-sm shadow-md flex justify-between items-center">
      <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Prometheus
      </div>
      <nav className="space-x-6">
        <Link href="/home" className="hover:text-purple-600 transition-colors">Home</Link>
        <Link href="/mandala" className="hover:text-purple-600 transition-colors">Mandala</Link>
        <Link href="/archivio" className="hover:text-purple-600 transition-colors">Archivio</Link>
        <Link href="/libro" className="hover:text-purple-600 transition-colors">Libro</Link>
        <Link href="/percorsi" className="hover:text-purple-600 transition-colors">Percorsi</Link>
      </nav>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">
          {session.user.email?.split('@')[0]}
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
