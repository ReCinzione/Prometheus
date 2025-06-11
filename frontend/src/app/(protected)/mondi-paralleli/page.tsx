'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Eye, MessageCircle, UserCircle, CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';


interface SharedChapter {
  id: string; // shared_chapter_id
  chapter_id: string; // original chapter_id from 'capitoli'
  original_user_id: string;
  shared_at: string;
  title: string;
  content_preview: string;
  original_author_name: string | null;
}

export default function MondiParalleliPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sharedChapters, setSharedChapters] = useState<SharedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSharedChapters = useCallback(async (currentUserId: string | undefined) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('shared_chapters')
        .select('*')
        .eq('allow_view_by_others', true)
        .order('shared_at', { ascending: false });

      // Exclude chapters shared by the current user, if a user is logged in
      if (currentUserId) {
        query = query.not('original_user_id', 'eq', currentUserId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setSharedChapters(data || []);
    } catch (err: any) {
      console.error("Errore nel caricamento dei capitoli condivisi:", err);
      setError(`Impossibile caricare i Mondi Paralleli: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getCurrentUserAndFetch = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        // Handle case where user might not be logged in, but page is accessible
        // For protected routes, layout would typically redirect.
        // If this page ISN'T protected, then fetch all. If it IS, user should exist.
        console.log("Nessun utente loggato, o errore sessione. Carico tutti i capitoli condivisi pubblicamente.");
        setUser(null); // Explicitly set user to null
        fetchSharedChapters(undefined); // Fetch all public chapters
      } else {
        setUser(session.user);
        fetchSharedChapters(session.user.id);
      }
    };
    getCurrentUserAndFetch();
  }, [fetchSharedChapters, supabase.auth]);

  const handleViewChapter = (sharedChapterId: string) => {
    router.push(`/mondi-paralleli/${sharedChapterId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Caricamento dei Mondi Paralleli...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Oops! Qualcosa è andato storto.</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="default" size="default" className="" onClick={() => user ? fetchSharedChapters(user.id) : fetchSharedChapters(undefined)}>
          Riprova Caricamento
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">🌌 Mondi Paralleli</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Esplora i capitoli condivisi da altri viaggiatori dell'introspezione. Ogni storia è un universo a sé.
        </p>
      </div>

      {sharedChapters.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Nessun Mondo da Esplorare (Ancora)</h2>
          <p className="text-muted-foreground">
            Al momento non ci sono capitoli condivisi da altri utenti.
            {user && " Condividi uno dei tuoi capitoli dalla sezione 'Libro' per arricchire questo spazio!"}
            {!user && " Accedi e condividi i tuoi capitoli per popolare questo universo!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedChapters.map((chapter) => (
            <Card key={chapter.id} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary group-hover:text-primary-focus line-clamp-2">
                  {chapter.title}
                </CardTitle>
                <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
                  <UserCircle className="h-4 w-4 mr-1.5" />
                  Di: {chapter.original_author_name || 'Autore Anonimo'}
                  <span className="mx-1.5">·</span>
                  <CalendarDays className="h-4 w-4 mr-1.5" />
                  {new Date(chapter.shared_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                  {chapter.content_preview}
                </p>
              </CardContent>
              <div className="p-4 pt-0 mt-auto">
                <Button
                  onClick={() => handleViewChapter(chapter.id)}
                  className="w-full gap-2"
                  variant="outline"
                  size="default" // Added size
                >
                  <Eye className="h-4 w-4" /> Leggi Capitolo Completo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
