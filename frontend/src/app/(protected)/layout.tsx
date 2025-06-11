'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import TutorialModal from '@/components/TutorialModal'; // Import TutorialModal

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false); // State for tutorial visibility

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Errore nel recupero della sessione:', error);
          router.push('/login');
          return;
        }
        
        if (data?.session) {
          setSession(data.session);
        } else {
          console.log('Nessuna sessione trovata, redirect a login');
          router.push('/login');
        }
      } catch (err) {
        console.error('Errore durante il controllo della sessione:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    getSession();

    // Check for tutorial viewed status
    if (typeof window !== 'undefined') {
      const tutorialViewed = localStorage.getItem('prometheus_tutorial_viewed');
      if (!tutorialViewed) {
        setShowTutorial(true);
      }
    }
  }, [router, supabase.auth]);

  const handleCloseTutorial = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prometheus_tutorial_viewed', 'true');
    }
    setShowTutorial(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50">
        <div className="text-center">
          <div className="text-4xl mb-4">🌿</div>
          <div className="text-gray-600">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Or redirect, which getSession already does
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50">
      <Header session={session} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
    </div>
  );
}
