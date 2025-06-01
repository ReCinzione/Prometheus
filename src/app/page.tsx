// src/app/(protected)/home/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import HomePageClient from '@/components/HomePageClient';

export default async function HomePage() {
  const cookieStore = await cookies();
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

  // Restituisci il componente client con i dati dell'utente
  return <HomePageClient user={user} />;
}