// src/lib/supabaseHelpers.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

/**
 * Salva un nuovo capitolo nel database usando il client passato
 */
export async function salvaCapitolo(
  supabase: SupabaseClient,
  {
    userId,
    semeId,
    titolo,
    icona,
    testo,
    eco,
    fraseFinale,
    // NUOVI CAMPI DA AGGIUNGERE AI PARAMETRI DELLA FUNZIONE:
    stato,
    rawInteractionSessionId
  }: {
    userId: string;
    semeId: string;
    titolo: string; // Titolo del capitolo (che sarà la frase_finale dell'AI)
    icona: string;
    testo: string;  // Contenuto principale del capitolo
    eco: string[];
    fraseFinale: string; // Frase finale dell'AI (che stiamo usando anche come titolo)
    // NUOVE PROPRIETÀ DEL TIPO:
    stato: string;
    rawInteractionSessionId: string | null; // Può essere null se non c'è sessione grezza associata
  }
) {
  const { data, error } = await supabase
    .from('capitoli')
    .insert([
      {
        user_id: userId,
        seme_id: semeId,
        titolo: titolo, // Titolo del capitolo (frase_finale dell'AI)
        icona: icona,
        testo: testo,   // Contenuto principale
        eco: eco,
        frase_finale: fraseFinale, // Frase finale dell'AI (stessa del titolo in questo caso)
        // NUOVI CAMPI DA INSERIRE:
        stato: stato,
        raw_interaction_session_id: rawInteractionSessionId,
      },
    ]);

  if (error) {
    console.error('Errore salvaCapitolo:', error);
    throw error;
  }
  return data;
}

/**
 * Recupera tutti i capitoli di un utente usando il client passato
 */
export async function fetchCapitoli(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('capitoli')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Errore fetchCapitoli:', error);
    throw error;
  }
  return data;
}
