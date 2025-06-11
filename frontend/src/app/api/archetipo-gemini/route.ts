import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      frasi,
      descrizione,
      nome,
      session_id, // Added
      user_id,    // Added
      interaction_number // Expecting this from frontend now
    } = body;

    if (!session_id || !user_id || typeof interaction_number === 'undefined') {
      return NextResponse.json({ error: 'session_id, user_id, and interaction_number are required' }, { status: 400 });
    }

    // Se frasi è già una stringa, usala, altrimenti concatena
    const userInput = Array.isArray(frasi) ? frasi.join(' • ') : frasi;
    const semeId = `archetipo_${nome.toLowerCase().replace(/\s+/g, '_')}`; // This seems specific to "archetipo" seeds

    // TODO: The backend's `req.seme_id` is used as `seed_archetype_id`.
    // Ensure this `semeId` is what's intended for general seed logging, or adapt if different seeds have different ID schemes.
    // For now, assuming `nome` (e.g. "Seme 01") is transformed into `archetipo_seme_01` and used.
    // The backend also expects `is_eco_request` and `history` etc.

    const payload = {
      user_input: userInput,
      seme_id: semeId, // This is used as seed_archetype_id in backend
      is_eco_request: body.is_eco_request || false, // Pass through or default
      history: body.history || [],                 // Pass through or default
      interaction_number: interaction_number,      // Pass through
      last_assistant_question: body.last_assistant_question || null, // Pass through

      // Add new IDs for logging
      session_id: session_id,
      user_id: user_id,

      // Optional fields from original body, pass them if they exist
      ...(descrizione && { descrizione }),
      ...(nome && { nome_archetipo: nome }), // Renamed to avoid conflict if backend also has a 'nome'
    };

    // Usa la variabile d'ambiente o fallback su localhost per lo sviluppo
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/chat`, {
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