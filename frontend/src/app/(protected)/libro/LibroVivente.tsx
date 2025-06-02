'use client';

import { forwardRef, useEffect, useState, ChangeEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

type LibroEntry = {
  id: number;
  titolo: string;
  Sottotitolo: string;
  testo: string;
  timestamp?: string;
};

interface LibroViventeProps {
  user: User;
}

const LibroVivente = forwardRef<HTMLDivElement, LibroViventeProps>(({ user }, ref) => {
  const [entries, setEntries] = useState<LibroEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState<string>('copertina.jpg');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchLibroEntries = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('libro')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: true });

        if (error) {
          console.error('Errore nel recupero delle voci del libro:', error);
          setError('Errore nel caricamento del libro');
        } else if (data) {
          setEntries(data as LibroEntry[]);
        }
      } catch (err) {
        console.error('Errore inaspettato:', err);
        setError('Errore inaspettato nel caricamento');
      } finally {
        setLoading(false);
      }
    };

    fetchLibroEntries();
  }, [user, supabase]);

  // Raccogli tutte le frasi finali (qui usiamo Sottotitolo come esempio, adattare se necessario)
  const allFinalPhrases = entries
    .map(e => e.Sottotitolo)
    .filter(Boolean)
    .join(' ');

  // Funzione per chiamare l'API di generazione immagine (Gemini via backend Python)
  const generateCover = async () => {
    setGenerating(true);
    setCoverBase64(null);
    setCoverUrl(null);
    try {
      const prompt = `Crea una copertina evocativa per un libro che raccoglie queste frasi simboliche: ${allFinalPhrases}`;
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error('Errore generazione copertina');
      const data = await response.json();
      setCoverBase64(data.imageBase64);
      setCoverFileName('copertina_ai.jpg');
    } catch (err) {
      setCoverBase64(null);
      alert('Errore nella generazione della copertina.');
    } finally {
      setGenerating(false);
    }
  };

  // Gestione upload immagine utente
  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/jpeg')) {
      alert('Carica solo immagini JPEG');
      return;
    }
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        // Controlla proporzioni 2:3
        const ratio = img.width / img.height;
        if (Math.abs(ratio - 2 / 3) > 0.01) {
          alert('L\'immagine deve avere proporzioni 2:3 (es. 1024x1536)');
          return;
        }
        setCoverBase64((reader.result as string).split(',')[1]);
        setCoverFileName(file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Funzione per scaricare l'immagine
  const handleDownload = () => {
    if (!coverBase64) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${coverBase64}`;
    link.download = coverFileName;
    link.click();
  };

  // Placeholder per minting NFT
  const handleMint = async () => {
    setMinting(true);
    setMintStatus(null);
    // Qui dovrai:
    // 1. Collegare/mettere su wallet (MetaMask, wagmi, ecc.)
    // 2. Caricare PDF e copertina su IPFS
    // 3. Chiamare smart contract su Polygon (es. via Thirdweb, NFTPort, ecc.)
    // 4. Aggiornare mintStatus con successo/errore
    setTimeout(() => {
      setMinting(false);
      setMintStatus('Funzione di minting NFT da completare con le API e la logica di wallet.');
    }, 1500);
  };

  if (loading) {
    return (
      <div ref={ref} className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento del libro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={ref} className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <p className="text-muted-foreground">Riprova più tardi</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div ref={ref} className="text-center py-20">
        <p className="text-muted-foreground mb-2">Il tuo libro è ancora vuoto</p>
        <p className="text-sm text-gray-500">Inizia a scrivere per vedere qui i tuoi capitoli</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-12 mt-10 px-6 max-w-3xl mx-auto">
      {/* Copertina AI / Upload */}
      <div className="mb-8 text-center">
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-4">
          <button
            onClick={generateCover}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generazione in corso...' : 'Genera Copertina AI'}
          </button>
          <label className="px-4 py-2 bg-gray-200 text-gray-700 rounded cursor-pointer hover:bg-gray-300">
            Carica la tua foto
            <input type="file" accept="image/jpeg" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {coverBase64 && (
          <div className="my-4 flex flex-col items-center">
            <img
              src={`data:image/jpeg;base64,${coverBase64}`}
              alt="Copertina"
              width={320}
              height={480}
              className="rounded shadow-lg"
              style={{ aspectRatio: '2/3', objectFit: 'cover', maxHeight: 480 }}
            />
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Scarica Copertina
            </button>
          </div>
        )}
      </div>
      {/* Capitoli */}
      {entries.map((entry, index) => (
        <article key={entry.id} className="break-inside-avoid-page">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
              {entry.titolo}
            </h1>
            {entry.Sottotitolo && (
              <div className="border-l-4 border-primary pl-4 mb-4">
                <div className="text-lg text-gray-700 leading-relaxed">
                  {entry.Sottotitolo.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 italic">
                      {line.trim()}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 leading-relaxed whitespace-pre-line">
              {entry.testo}
            </div>
          </div>

          {index < entries.length - 1 && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center space-x-2">
                <div className="h-px bg-gray-300 w-16"></div>
                <span className="text-gray-400 text-2xl">❋</span>
                <div className="h-px bg-gray-300 w-16"></div>
              </div>
            </div>
          )}
        </article>
      ))}

      <footer className="text-center py-8 mt-16 border-t border-gray-200">
        <p className="text-sm text-gray-500 italic">
          Il tuo Libro Vivente - {entries.length} {entries.length === 1 ? 'capitolo' : 'capitoli'}
        </p>
      </footer>
    </div>
  );
});

LibroVivente.displayName = 'LibroVivente';
export default LibroVivente;
