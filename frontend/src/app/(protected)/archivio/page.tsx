import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import ArchivioClient from '@/components/ArchivioClient';
import { fetchCapitoli } from '@/lib/supabaseHelpers';

export default async function ArchivioPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          // Server components can't set cookies
        },
        remove(name, options) {
          // Server components can't remove cookies
        },
      },
    }
  );

  // Ottieni l'utente autenticato
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Errore nel recupero dell\'utente:', authError);
    redirect('/login');
  }

  // Pre-fetch dei capitoli
  try {
    const capitoli = await fetchCapitoli(supabase, user.id);
    console.log('Server-side fetched chapters:', capitoli);
  } catch (error) {
    console.error('Error pre-fetching chapters:', error);
  }

  return <ArchivioClient user={user} />;
}