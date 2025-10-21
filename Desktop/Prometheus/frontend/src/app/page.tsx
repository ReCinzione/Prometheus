// src/app/(protected)/home/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HomePageClient from '@/components/HomePageClient';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Errore nel recupero dell\'utente:', authError);
    redirect('/login');
  }

  return <HomePageClient user={user} />;
}