import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { frasi, descrizione, nome } = body;

    // Se frasi è già una stringa, usala, altrimenti concatena
    const userInput = Array.isArray(frasi) ? frasi.join(' • ') : frasi;
    const semeId = `archetipo_${nome.toLowerCase().replace(/\s+/g, '_')}`;

    const payload = {
      user_input: userInput,
      seme_id: semeId,
      is_eco_request: true,
      history: [],
      interaction_number: 0,
      last_assistant_question: null,
      descrizione, // opzionale, se vuoi passarla al backend Python
      nome,        // opzionale, se vuoi passarla al backend Python
    };

    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();

    // Fallback: se non c'è titolo/testo, prova a ricavare da output/frase_finale
    if (!data.titolo || !data.testo) {
      let titolo = '';
      let testo = '';
      if (data.frase_finale) titolo = data.frase_finale;
      if (Array.isArray(data.output)) testo = data.output.join(' ');
      else if (typeof data.output === 'string') testo = data.output;
      // Se almeno uno dei due è presente, restituisci in formato atteso
      if (titolo && testo) {
        return NextResponse.json({ titolo, testo });
      }
      // Altrimenti errore
      return NextResponse.json({ error: 'Risposta AI non valida', raw: data }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Errore nella route /api/archetipo-gemini:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
} 