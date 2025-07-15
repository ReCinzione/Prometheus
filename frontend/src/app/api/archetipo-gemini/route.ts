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

    if (response.status !== 202) {
      const err = await response.text();
      console.error(`[API Route] Errore iniziale dal backend: Status ${response.status}`, err);
      return NextResponse.json({ error: `Errore iniziale dal backend: ${err}` }, { status: response.status });
    }

    const { task_id } = await response.json();
    if (!task_id) {
      return NextResponse.json({ error: 'ID del task non ricevuto dal backend.' }, { status: 500 });
    }

    // --- Inizio Polling ---
    const startTime = Date.now();
    const timeout = 55000; // 55 secondi di timeout per il polling

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Attendi 3 secondi

      const resultResponse = await fetch(`${backendUrl}/api/get-task-result/${task_id}`);

      if (!resultResponse.ok) {
        // Se l'endpoint di polling stesso dà errore, interrompi e segnala
        const errText = await resultResponse.text();
        console.error(`[API Route Polling] Errore durante il polling del task ${task_id}. Status: ${resultResponse.status}`, errText);
        return NextResponse.json({ error: `Errore durante il recupero del risultato: ${errText}` }, { status: resultResponse.status });
      }

      const result = await resultResponse.json();

      if (result.status === 'completed') {
        console.log(`[API Route Polling] Task ${task_id} completato. Dati ricevuti:`, result.data);
        // I dati finali sono in result.data
        return NextResponse.json(result.data);
      }

      if (result.status === 'failed') {
        console.error(`[API Route Polling] Task ${task_id} fallito. Errore:`, result.error);
        return NextResponse.json({ error: `Il task è fallito: ${result.error}` }, { status: result.status_code || 500 });
      }

      // Se lo stato è 'processing', il loop continua
      console.log(`[API Route Polling] Task ${task_id} ancora in elaborazione...`);
    }

    // Se usciamo dal loop a causa del timeout
    console.error(`[API Route Polling] Timeout per il task ${task_id}.`);
    return NextResponse.json({ error: 'La richiesta ha impiegato troppo tempo per essere elaborata.' }, { status: 504 });
  } catch (error) {
    console.error('Errore nella route /api/archetipo-gemini:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}