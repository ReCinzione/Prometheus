'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js'; // For potential use, though not strictly needed for read-only view
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCircle, CalendarDays, Loader2, AlertTriangle, BookOpenText } from 'lucide-react';

interface SharedChapterDetails {
  id: string; // shared_chapter_id
  chapter_id: string;
  original_user_id: string;
  shared_at: string;
  title: string;
  // content_preview is not needed here, we'll fetch full content
  original_author_name: string | null;
  // Full content from 'capitoli' table
  full_content: string | null;
}

export default function SharedChapterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sharedChapterId = params.shared_chapter_id as string;

  const [chapterDetails, setChapterDetails] = useState<SharedChapterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User state, mainly to ensure this page is accessed within an authenticated context if needed
  // or to potentially personalize aspects later, though not used for core data fetching here.
  const [user, setUser] = useState<User | null>(null);


  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSharedChapterDetails = useCallback(async () => {
    if (!sharedChapterId) {
      setError("ID del capitolo condiviso non specificato.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the shared_chapter record
      const { data: sharedInfo, error: sharedError } = await supabase
        .from('shared_chapters')
        .select('*')
        .eq('id', sharedChapterId)
        .eq('allow_view_by_others', true) // Ensure it's publicly viewable
        .single();

      if (sharedError) throw sharedError;
      if (!sharedInfo) {
        throw new Error("Capitolo condiviso non trovato o non accessibile.");
      }

      // 2. Fetch the full content from 'capitoli' table using chapter_id from sharedInfo
      // RLS on 'capitoli' must allow this read if the chapter is shared.
      const { data: originalChapter, error: chapterContentError } = await supabase
        .from('capitoli')
        .select('contenuto, titolo') // Fetch 'titolo' as well for consistency, though sharedInfo has it
        .eq('id', sharedInfo.chapter_id)
        .single();

      if (chapterContentError) throw chapterContentError;
      if (!originalChapter) {
        throw new Error("Contenuto originale del capitolo non trovato.");
      }

      setChapterDetails({
        id: sharedInfo.id,
        chapter_id: sharedInfo.chapter_id,
        original_user_id: sharedInfo.original_user_id,
        shared_at: sharedInfo.shared_at,
        title: sharedInfo.title || originalChapter.titolo, // Prefer shared title, fallback to original
        original_author_name: sharedInfo.original_author_name,
        full_content: originalChapter.contenuto,
      });

    } catch (err: any) {
      console.error("Errore nel caricamento dei dettagli del capitolo condiviso:", err);
      setError(`Impossibile caricare il capitolo: ${err.message}`);
      setChapterDetails(null);
    } finally {
      setLoading(false);
    }
  }, [sharedChapterId, supabase]);

  useEffect(() => {
    // Fetch user for context, though not strictly needed for fetching public shared chapter
    const getCurrentUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
    };
    getCurrentUser();
    fetchSharedChapterDetails();
  }, [fetchSharedChapterDetails, supabase.auth]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Caricamento capitolo condiviso...</p>
      </div>
    );
  }

  if (error || !chapterDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Errore nel Caricamento</h2>
        <p className="text-muted-foreground mb-4">{error || "Dettagli del capitolo non disponibili."}</p>
        <Button onClick={() => router.push('/mondi-paralleli')} variant="outline" size="default" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Torna a Mondi Paralleli
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button onClick={() => router.back()} variant="outline" size="default" className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" /> Torna Indietro
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
            {chapterDetails.title}
          </CardTitle>
          <CardDescription className="pt-2 space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <UserCircle className="h-4 w-4 mr-2" />
              Condiviso da: {chapterDetails.original_author_name || 'Autore Anonimo'}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 mr-2" />
              Data Condivisione: {new Date(chapterDetails.shared_at).toLocaleDateString()}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <div
              className="whitespace-pre-line text-gray-800 dark:text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: chapterDetails.full_content || "" }} // Assuming content might be HTML or just text
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
         <Button onClick={() => router.push('/mondi-paralleli')} variant="default" size="default" className="gap-2">
            <BookOpenText className="h-4 w-4" /> Esplora Altri Mondi
          </Button>
      </div>
    </div>
  );
}
