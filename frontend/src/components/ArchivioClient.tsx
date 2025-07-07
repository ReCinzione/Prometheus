'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Edit3, 
  Save, 
  X, 
  BookOpen, 
  Trash2, 
  Plus,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CopyPlus, // Icon for "Create Chapter"
  ArchiveX // Icon for no sessions
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // For navigation
import { Capitolo as CapitoloType } from '@/app/(protected)/libro/LibroVivente'; // Import CapitoloType

// Remove RawInteractionStep and RawInteractionSessionSummary types (or comment out)
/*
type RawInteractionStep = {
  // ... (definition)
};

type RawInteractionSessionSummary = {
 // ... (definition)
};
*/

export default function ArchivioClient({ user }: { user: User }) {
  const router = useRouter();
  // const [rawSessions, setRawSessions] = useState<RawInteractionSessionSummary[]>([]); // OLD STATE
  const [archiveChapters, setArchiveChapters] = useState<CapitoloType[]>([]); // NEW STATE
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set()); // Use chapter.id (string)
  // const [promotingToChapter, setPromotingToChapter] = useState<string | null>(null); // For new "Manda al Libro" logic
  const [processingChapterId, setProcessingChapterId] = useState<string | null>(null); // General processing state

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Renamed and refactored function
  const loadArchiveChapters = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: chapterData, error: fetchError } = await supabase
        .from('capitoli')
        .select('*') // Select all fields, or specific ones matching CapitoloType + created_at/updated_at
        .eq('user_id', userId)
        .in('stato', ['bozza_in_archivio', 'promosso_al_libro'])
        .order('created_at', { ascending: false }); // Assuming 'created_at' for ordering

      if (fetchError) throw fetchError;

      setArchiveChapters(chapterData || []);

    } catch (err) {
      console.error('Error loading archive chapters:', err);
      const supabaseError = err as any;
      setError(`Errore nel caricamento dell'archivio: ${supabaseError.message || 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (user?.id) {
      loadArchiveChapters(user.id);
    }
  }, [user, loadArchiveChapters]);

  const toggleCardExpansion = (chapterId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedCards(newExpanded);
  };

  // Temporarily comment out or simplify handleCreateChapterFromSession
  /*
  const handleCreateChapterFromSession = async (session: RawInteractionSessionSummary) => {
    // ... (old logic) ...
  };
  */

  const handleSendChapterToBook = async (chapter: CapitoloType) => {
    if (!user) {
      toast.error("Utente non autenticato.");
      return;
    }
    setProcessingChapterId(chapter.id);
    try {
      // 1. Insert into 'libro' table
      const libroInsertData = {
        user_id: chapter.user_id,
        seme_id: chapter.seme_id || null, // Handle optional seme_id
        titolo: chapter.titolo,
        testo: chapter.testo,
        sottotitolo: (chapter.eco && chapter.eco.length > 0) ? chapter.eco.join(', ') : '',
        timestamp: new Date().toISOString(),
        // ordine: undefined, // Omit for now
      };

      const { error: insertLibroError } = await supabase
        .from('libro') // Target table for the main book
        .insert(libroInsertData);

      if (insertLibroError) {
        console.error("Errore inserimento in 'libro':", insertLibroError);
        toast.error(`Errore durante l'invio al libro: ${insertLibroError.message}`);
        return; // Stop if this fails
      }

      // 2. Update 'capitoli' table
      const { error: updateCapitoloError } = await supabase
        .from('capitoli')
        .update({
          stato: 'promosso_al_libro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapter.id);

      if (updateCapitoloError) {
        console.error("Errore aggiornamento 'capitoli':", updateCapitoloError);
        toast.error(`Errore durante l'aggiornamento dello stato del capitolo: ${updateCapitoloError.message}`);
        // Consider a rollback or compensating action for the 'libro' insert if critical
        return;
      }

      toast.success(`Capitolo "${chapter.titolo}" inviato al libro con successo!`);
      loadArchiveChapters(user.id); // Refresh the list

    } catch (err: any) {
      console.error('Errore generico in handleSendChapterToBook:', err);
      toast.error(`Si è verificato un errore imprevisto: ${err.message || 'Sconosciuto'}`);
    } finally {
      setProcessingChapterId(null);
    }
  };

  // Filtering logic based on new state 'archiveChapters'
  const filteredArchiveChapters = archiveChapters.filter(chapter =>
    (chapter.titolo && chapter.titolo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (chapter.testo && chapter.testo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (chapter.seme_id && chapter.seme_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Caricamento archivio capitoli...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Errore Archivio</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="default" size="default" onClick={() => user?.id && loadArchiveChapters(user.id)}>
              Riprova Caricamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renamed and refactored card rendering function
  const renderArchiveChapterCard = (chapter: CapitoloType) => {
    const isExpanded = expandedCards.has(chapter.id);
    const isPromoted = chapter.stato === 'promosso_al_libro';
    // const isProcessing = promotingToChapter === chapter.id; // For future "Manda al Libro"
    const isProcessing = processingChapterId === chapter.id;

    return (
      <Card key={chapter.id} className={`overflow-hidden transition-all duration-200 ${isPromoted ? 'border-green-500' : ''}`}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleCardExpansion(chapter.id)}>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-3 flex-1 group">
              <span className="text-2xl">{chapter.icona || '📖'}</span>
              <span className="group-hover:text-primary transition-colors">
                {chapter.titolo}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {isPromoted && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Nel Libro</Badge>}
                {!isPromoted && <Badge variant="outline">Bozza ({chapter.stato})</Badge>}
                {chapter.seme_id && <Badge variant="secondary">{chapter.seme_id}</Badge>}
                {chapter.created_at && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(chapter.created_at).toLocaleDateString()}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 animate-in slide-in-from-top-2 duration-200">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {chapter.testo}
            </p>
            {chapter.raw_interaction_session_id && (
              <p className="text-xs text-muted-foreground">ID Sessione Originale: {chapter.raw_interaction_session_id}</p>
            )}

            {!isPromoted && chapter.stato === 'bozza_in_archivio' ? (
              <Button
                onClick={() => handleSendChapterToBook(chapter)}
                disabled={isProcessing} // Disable if this specific chapter is being processed
                size="sm"
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Manda al Libro
              </Button>
            ) : (
              <p className="text-sm font-medium text-green-600">Questo capitolo è già nel tuo libro.</p>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">📜 Archivio Bozze Capitoli</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Rivedi le tue bozze generate automaticamente e promuovile al tuo libro principale.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            placeholder="🔍 Cerca per Titolo, Testo o ID Seme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-4 mt-8 pt-6 border-t">
        {filteredArchiveChapters.length === 0 && !loading && (
           <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <ArchiveX className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">Nessun capitolo archiviato trovato</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nessun risultato per la ricerca attuale.' : 'Non hai ancora capitoli in stato di bozza o promossi al libro.'}
              </p>
            </CardContent>
          </Card>
        )}
        {filteredArchiveChapters.map(chapter => renderArchiveChapterCard(chapter))}
      </div>
    </div>
  );
}