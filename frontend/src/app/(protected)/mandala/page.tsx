// src/app/(protected)/mandala/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import MandalaPage from '@/components/MandalaPage';
import { fetchCapitoli } from '@/lib/supabaseHelpers'; // Import direttamente la funzione

export default async function MandalaServerPage() {
  const cookieStore = await cookies(); // Aggiungi await qui
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Ottieni l'utente autenticato
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Errore nel recupero dell\'utente:', authError);
    redirect('/login');
  }

  let initialArchivio: Record<string, boolean> = {};
  
  try {
    // Recupera i capitoli associati all'utente
    const capitoli = await fetchCapitoli(supabase, user.id);
    if (capitoli && capitoli.length > 0) {
      // Popola initialArchivio con i semi_id dei capitoli
      capitoli.forEach((c) => {
        if (c.seme_id) {
          initialArchivio[c.seme_id] = true;
        }
      });
    } else {
      console.warn('Nessun capitolo trovato per l\'utente:', user.id);
    }
  } catch (error) {
    console.error('Errore nel pre-fetching dei capitoli:', error);
  }

  // Restituisci il componente MandalaPage con i dati iniziali
  return (
    <MandalaPage
      user={user}
      initialArchivio={initialArchivio}
    />
  );
}