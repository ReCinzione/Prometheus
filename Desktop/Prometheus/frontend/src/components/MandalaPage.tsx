'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import { fetchCapitoli } from '@/lib/supabaseHelpers';
import { semi } from '@/lib/semi';

interface MandalaPageProps {
  user: User | null;
  initialArchivio?: Record<string, boolean>;
}

export default function MandalaPage({ user, initialArchivio = {} }: MandalaPageProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [archivio, setArchivio] = useState<Record<string, boolean>>(initialArchivio);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (Object.keys(initialArchivio).length > 0) {
      setLoading(false);
      return;
    }

    const loadCapitoli = async () => {
      try {
        const capitoli = await fetchCapitoli(supabase, user.id);
        const map: Record<string, boolean> = {};
        capitoli.forEach((c) => {
          map[c.seme_id] = true;
        });
        setArchivio(map);
      } catch (error) {
        console.error('Errore nel caricamento dei capitoli:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCapitoli();
  }, [user, supabase, initialArchivio]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accesso richiesto</h1>
          <p className="mb-4">Devi essere autenticato per accedere al Mandala</p>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mb-4"></div>
          <p>Caricamento del tuo Mandala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Il Tuo Mandala dei Semi</h1>
          <p className="text-purple-200 text-lg">
            Esplora i semi della scrittura e coltiva la tua creatività
          </p>
        </div>

        {/* Griglia dei Semi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {semi
            .filter(seme => {
              // Mostra tutti i semi regolari
              if (!seme.id.startsWith('archetipo_')) return true;
              // Mostra gli archetipi solo se sono stati completati
              return archivio[seme.id];
            })
            .map((seme) => {
            const isCompleted = archivio[seme.id];
            
            return (
              <div
                key={seme.id}
                className={`
                  relative rounded-xl p-6 transition-all duration-300 hover:scale-105
                  ${isCompleted 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-purple-600 hover:to-purple-700'
                  }
                `}
              >
                {/* Icona del Seme */}
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{seme.icona}</div>
                  <h3 className="text-white font-semibold text-lg leading-tight">
                    {seme.nome}
                  </h3>
                </div>

                {/* Prompt Base (preview) */}
                <p className="text-gray-200 text-sm mb-4 line-clamp-3">
                  {seme.prompt_base.substring(0, 100)}...
                </p>

                {/* Sigillo Info */}
                <div className="mb-4">
                  <div 
                    className="w-full h-2 rounded-full opacity-60"
                    style={{ backgroundColor: seme.sigillo.colore }}
                  ></div>
                  <p className="text-xs text-gray-300 mt-1 text-center">
                    {seme.sigillo.codice_sigillo}
                  </p>
                </div>

                {/* Status e Azione */}
                <div className="flex items-center justify-between">
                  {isCompleted ? (
                    <span className="flex items-center text-green-200 text-sm">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Completato
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Da esplorare</span>
                  )}
                  
                  <Link
                    href={`/scrivi?seme=${seme.id}`}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                      ${isCompleted
                        ? 'bg-white text-green-700 hover:bg-gray-100'
                        : 'bg-purple-500 text-white hover:bg-purple-400'
                      }
                    `}
                  >
                    {isCompleted ? 'Rivedi' : 'Scrivi'}
                  </Link>
                </div>

                {/* Overlay per completati */}
                {isCompleted && (
                  <div className="absolute top-2 right-2">
                    <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Statistiche */}
        <div className="mt-12 bg-black/20 rounded-xl p-6">
          <div className="text-center">
            <h3 className="text-white text-xl font-semibold mb-4">Il Tuo Progresso</h3>
            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {Object.keys(archivio).length}
                </div>
                <div className="text-gray-300 text-sm">Semi Esplorati</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {semi.length - Object.keys(archivio).length}
                </div>
                <div className="text-gray-300 text-sm">Da Esplorare</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {Math.round((Object.keys(archivio).length / semi.length) * 100)}%
                </div>
                <div className="text-gray-300 text-sm">Completamento</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 