import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      frasi,
      effective_seme_id, // Nuovo campo da ScriviPage.tsx
      readable_seme_name, // Nuovo campo opzionale
      session_id,
      user_id,
      interaction_number,
      history,
      is_eco_request,
      is_first_interaction,
      last_assistant_question
    } = body;

    if (!session_id || !user_id || typeof interaction_number === 'undefined' || !effective_seme_id) {
      return NextResponse.json({ error: 'session_id, user_id, interaction_number, and effective_seme_id are required' }, { status: 400 });
    }

    // Se frasi è già una stringa, usala, altrimenti concatena
    const userInput = Array.isArray(frasi) ? frasi.join(' • ') : frasi;
    // const semeId = `archetipo_${nome.toLowerCase().replace(/\s+/g, '_')}`; // RIMOSSA QUESTA RIGA

    // TODO: The backend's `req.seme_id` is used as `seed_archetype_id`.
    // effective_seme_id (es. "sem_04") è ora usato direttamente.
    // La logica di costruzione `archetipo_...` se ancora necessaria per qualche seme specifico,
    // dovrebbe essere gestita qui o nel backend Python in base a `effective_seme_id`.
    // Per ora, si assume che `effective_seme_id` sia l'ID che il backend Python si aspetta.

    const payload = {
      user_input: userInput, // userInput viene ancora da 'frasi'
      seme_id: effective_seme_id, // << USA effective_seme_id QUI
      history: history || [],
      is_eco_request: is_eco_request || false,
      is_first_interaction: is_first_interaction !== undefined ? is_first_interaction : true,
      interaction_number: interaction_number,
      last_assistant_question: last_assistant_question || null,
      session_id: session_id,
      user_id: user_id
      // readable_seme_name può essere aggiunto qui se il backend Python lo gestisce,
      // altrimenti non è necessario inviarlo. Per ora non lo includiamo.
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

    // Log per vedere cosa arriva dal backend Python
    console.log("[API Route /api/archetipo-gemini] Dati ricevuti dal backend Python:", JSON.stringify(data, null, 2));

    // Controllo essenziale che i campi attesi dal frontend (ScriviPage) siano presenti.
    // Il backend Python (ChatResponse) dovrebbe garantirli se la risposta è 200 OK.
    if (data.output === undefined || data.eco === undefined || data.frase_finale === undefined) {
      console.error("[API Route /api/archetipo-gemini] ERRORE: Risposta dal backend Python non contiene i campi attesi (output, eco, frase_finale). Dati ricevuti:", JSON.stringify(data, null, 2));
      return NextResponse.json({ error: 'Risposta interna dal server AI non valida o incompleta.', received_data: data }, { status: 500 });
    }

    // Inoltra direttamente la risposta completa del backend Python al client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Errore nella route /api/archetipo-gemini:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}