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
  }: {
    userId: string;
    semeId: string;
    titolo: string;
    icona: string;
    testo: string;
    eco: string[];
    fraseFinale: string;
  }
) {
  const { data, error } = await supabase
    .from('capitoli')
    .insert([
      {
        user_id: userId,
        seme_id: semeId,
        titolo,
        icona,
        testo,
        eco,
        frase_finale: fraseFinale,
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
