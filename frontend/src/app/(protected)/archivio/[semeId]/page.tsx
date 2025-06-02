'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { semi } from '@/lib/semi';
import { Card, CardContent } from '@/components/ui/card';

export default function ArchivioSemePage() {
  const { semeId } = useParams();
  const [capitolo, setCapitolo] = useState<any>(null);

  useEffect(() => {
    const dati = localStorage.getItem('capitoli_prometheus');
    if (dati) {
      const archivio = JSON.parse(dati);
      const trovato = archivio.find((c: any) => c.semeId === semeId);
      setCapitolo(trovato);
    }
  }, [semeId]);

  const seme = semi.find((s) => s.id === semeId);
  if (!seme || !capitolo) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4 text-center">
        <p className="text-gray-600">Questo Seme non ha ancora generato un capitolo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-5xl text-center mb-2">{seme.icona}</div>
          <h2 className="text-2xl font-bold text-center mb-2">{seme.nome}</h2>
          <p className="text-center text-gray-600">{seme.prompt_base}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Risposta</p>
          <p>{capitolo.testo}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Eco simbolica</p>
          <ul className="list-disc list-inside text-gray-700">
            {capitolo.eco.map((r: string, idx: number) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
          <p className="mt-4 italic text-right text-primary">{capitolo.frase_finale}</p>
        </CardContent>
      </Card>
    </div>
  );
}
