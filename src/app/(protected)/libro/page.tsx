'use client';

import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import LibroVivente from './LibroVivente';

interface LibroPageProps {
  user?: User | null;
}

export default function LibroPage({ user: initialUser }: LibroPageProps = {}) {
  const componenteLibro = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Errore nel recupero utente:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [initialUser, supabase]);

  const handleStampa = useReactToPrint({
    contentRef: componenteLibro,
    documentTitle: 'Libro Vivente',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accesso richiesto</h1>
          <p className="mb-4">Devi essere autenticato per accedere al tuo Libro Vivente</p>
          <Link 
            href="/login" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Vai al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">📖 Il Libro Vivente</h1>
      <div className="flex justify-center">
        <Button 
          onClick={handleStampa}
          variant="default"
          size="default"
          className="bg-purple-500 hover:bg-purple-600"
        >
          📄 Esporta in PDF
        </Button>
      </div>
      <LibroVivente ref={componenteLibro} user={user} />
    </div>
  );
}