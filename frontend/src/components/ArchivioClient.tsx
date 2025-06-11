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
// fetchCapitoli might be removed or adapted if this page no longer directly shows 'capitoli'
// import { fetchCapitoli } from '@/lib/supabaseHelpers';
import { useRouter } from 'next/navigation'; // For navigation

// Define types for raw seed interactions
type RawInteractionStep = {
  id: string; // UUID of the step itself
  user_id: string;
  session_id: string;
  seed_archetype_id: string;
  interaction_step: number;
  interaction_type: string;
  data: any; // JSONB, structure depends on interaction_type
  created_at: string;
  seed_title_generated: string | null;
  status: string;
};

type RawInteractionSessionSummary = {
  sessionId: string;
  seedArchetypeId: string;
  seedTitleGenerated: string | null;
  lastInteractionDate: string;
  interactionCount: number;
  isInBook?: boolean; // New field
  isDeletedFromBook?: boolean; // New field
};

export default function ArchivioClient({ user }: { user: User }) {
  const router = useRouter();
  const [rawSessions, setRawSessions] = useState<RawInteractionSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // const [authLoading, setAuthLoading] = useState(false); // Kept if needed for other auth actions
  // Editing and transfer states might be removed or re-purposed if editing happens on a different page
  // const [editingId, setEditingId] = useState<number | null>(null);
  // const [editForm, setEditForm] = useState<EditingCapitolo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set()); // Use sessionId (string)
  const [promotingToChapter, setPromotingToChapter] = useState<string | null>(null); // Store sessionId being promoted

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadRawInteractionSessions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all raw interactions for the user
      const { data: rawInteractionsData, error: fetchError } = await supabase
        .from('raw_seed_interactions')
        .select('session_id, seed_archetype_id, seed_title_generated, created_at, interaction_step')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (!rawInteractionsData) {
        setRawSessions([]);
        setLoading(false);
        return;
      }

      // 2. Fetch 'capitoli' that are linked to raw_interaction_session_id
      const { data: bookChapters, error: chaptersError } = await supabase
        .from('capitoli')
        .select('raw_interaction_session_id, stato')
        .eq('user_id', userId)
        .in('stato', ['nel_libro', 'archivio_cancellato'])
        .isnot('raw_interaction_session_id', null);

      if (chaptersError) throw chaptersError;

      const inBookSessionIds = new Set<string>();
      const deletedFromBookSessionIds = new Set<string>();

      if (bookChapters) {
        bookChapters.forEach(chapter => {
          if (chapter.raw_interaction_session_id) {
            if (chapter.stato === 'nel_libro') {
              inBookSessionIds.add(chapter.raw_interaction_session_id);
            } else if (chapter.stato === 'archivio_cancellato') {
              deletedFromBookSessionIds.add(chapter.raw_interaction_session_id);
            }
          }
        });
      }

      // 3. Process raw interactions into session summaries
      const sessionsMap = new Map<string, RawInteractionSessionSummary>();
      rawInteractionsData.forEach(item => {
        let sessionSummary = sessionsMap.get(item.session_id);
        if (!sessionSummary) {
          sessionSummary = {
            sessionId: item.session_id,
            seedArchetypeId: item.seed_archetype_id,
            seedTitleGenerated: item.seed_title_generated,
            lastInteractionDate: item.created_at,
            interactionCount: 0, // Will be incremented
            isInBook: inBookSessionIds.has(item.session_id) && !deletedFromBookSessionIds.has(item.session_id),
            isDeletedFromBook: deletedFromBookSessionIds.has(item.session_id),
          };
        }

        sessionSummary.interactionCount += 1;
        // Update last interaction date if this item is newer
        if (new Date(item.created_at) > new Date(sessionSummary.lastInteractionDate)) {
          sessionSummary.lastInteractionDate = item.created_at;
        }
        // Update title if this item has one and current summary doesn't, or if this item is later and has a title
        if (item.seed_title_generated && (!sessionSummary.seedTitleGenerated || new Date(item.created_at) >= new Date(sessionSummary.lastInteractionDate))) {
          sessionSummary.seedTitleGenerated = item.seed_title_generated;
        }
        // Ensure flags are updated if processing multiple items for the same session
        sessionSummary.isInBook = inBookSessionIds.has(item.session_id) && !deletedFromBookSessionIds.has(item.session_id);
        sessionSummary.isDeletedFromBook = deletedFromBookSessionIds.has(item.session_id);

        sessionsMap.set(item.session_id, sessionSummary);
      });

      const sortedSessions = Array.from(sessionsMap.values()).sort(
        (a, b) => new Date(b.lastInteractionDate).getTime() - new Date(a.lastInteractionDate).getTime()
      );
      setRawSessions(sortedSessions);

    } catch (err) {
      console.error('Error loading raw interaction sessions or chapters:', err);
      const supabaseError = err as any;
      setError(`Errore nel caricamento dell'archivio: ${supabaseError.message || 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]); // Removed user from dependencies as it's passed directly

  useEffect(() => {
    if (user?.id) {
      loadRawInteractionSessions(user.id);
    }
  }, [user, loadRawInteractionSessions]);

  const toggleCardExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedCards(newExpanded);
  };

  const handleViewSessionDetails = (sessionId: string) => {
    // For now, just log. Later, navigate to a detail page:
    // router.push(`/archivio/${sessionId}`);
    console.log("View details for session:", sessionId);
    // As a quick way to see details, we can expand the card or show a modal here too.
    // For this step, clicking the card title area will serve as "view details" by expanding it.
    toggleCardExpansion(sessionId);
  };

  const handleCreateChapterFromSession = async (session: RawInteractionSessionSummary) => {
    if (!user) return;
    setPromotingToChapter(session.sessionId);
    setError(null);

    try {
      // 1. Fetch all interactions for this session to get the final content
      const { data: interactions, error: fetchError } = await supabase
        .from('raw_seed_interactions')
        .select('interaction_type, data, seed_title_generated')
        .eq('user_id', user.id)
        .eq('session_id', session.sessionId)
        .order('interaction_step', { ascending: true }); // Important to get steps in order

      if (fetchError) throw fetchError;
      if (!interactions || interactions.length === 0) {
        throw new Error("Nessuna interazione trovata per questa sessione.");
      }

      // 2. Extract title and final content
      // Title is from summary, or find the last one set in the interactions.
      let finalTitle = session.seedTitleGenerated;
      let finalContent = "";

      // Iterate backwards to find the last gemini_response with content and potentially a title
      for (let i = interactions.length - 1; i >= 0; i--) {
        const step = interactions[i];
        if (step.interaction_type.startsWith('gemini_response_')) {
          if (step.data?.parsed_output) {
            finalContent = Array.isArray(step.data.parsed_output)
              ? step.data.parsed_output.join('\n\n')
              : step.data.parsed_output;
          }
          if (step.seed_title_generated && !finalTitle) { // Prioritize title from the step if summary didn't have one
            finalTitle = step.seed_title_generated;
          }
          if (finalContent) break; // Found the main content
        }
      }
      
      if (!finalTitle) {
         // Fallback title if none was explicitly generated/found
        finalTitle = `Capitolo da ${session.seedArchetypeId}`;
      }
      if (!finalContent) {
        // Fallback content if no Gemini output found (should not happen in normal flow)
        finalContent = "Contenuto non ancora generato o sessione incompleta.";
      }

      // Fetch current max 'ordine' for this user's chapters
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('capitoli')
        .select('ordine')
        .eq('user_id', user.id)
        .is('ordine', 'not.null') // Ensure we only consider rows where ordine is set
        .order('ordine', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxOrderError) {
        // Log the error but proceed, newOrder will be 0 in this case
        console.warn('Could not reliably determine max order for chapters, defaulting new chapter order. Error:', maxOrderError.message);
      }
      const newOrder = (maxOrderData?.ordine ?? -1) + 1;

      // 3. Create new chapter in 'capitoli' table
      const { error: insertError } = await supabase
        .from('capitoli')
        .insert({
          user_id: user.id,
          titolo: finalTitle,
          contenuto: finalContent,
          seme_id: session.seedArchetypeId,
          icona: '📖',
          stato: 'bozza_da_archivio',
          raw_interaction_session_id: session.sessionId,
          eco: [],
          frase_finale: finalTitle,
          ordine: newOrder, // Set the new order
        });

      if (insertError) throw insertError;

      // 4. Optionally, update status of raw_seed_interactions
      // This is a nice-to-have, can be skipped if complex due to RLS or policies
      // await supabase.from('raw_seed_interactions').update({ status: 'copied_to_capitoli' })
      //   .eq('session_id', session.sessionId);

      alert(`Capitolo "${finalTitle}" creato e pronto per la modifica nel Libro!`);
      // Optionally, redirect to the book editing page or refresh current list
      // router.push(`/libro?editingChapterId=${newChapterId}`); // if newChapterId is returned

    } catch (err: any) {
      console.error('Errore durante la creazione del capitolo:', err);
      setError(`Errore creazione capitolo: ${err.message || 'Sconosciuto'}`);
    } finally {
      setPromotingToChapter(null);
    }
  };



  const sessionsInBook = rawSessions.filter(s => s.isInBook && !s.isDeletedFromBook);
  const otherArchivedSessions = rawSessions.filter(s => !s.isInBook || s.isDeletedFromBook);

  // Apply search term to both lists
  const filterLogic = (session: RawInteractionSessionSummary) =>
    (session.seedArchetypeId && session.seedArchetypeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (session.seedTitleGenerated && session.seedTitleGenerated.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredSessionsInBook = sessionsInBook.filter(filterLogic);
  const filteredOtherArchivedSessions = otherArchivedSessions.filter(filterLogic);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Caricamento archivio interazioni...</p>
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
            <Button variant="default" onClick={() => user?.id && loadRawInteractionSessions(user.id)}>
              Riprova Caricamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderSessionCard = (session: RawInteractionSessionSummary, isBookContext: boolean) => {
    const isExpanded = expandedCards.has(session.sessionId);
    const buttonDisabled = (isBookContext && !session.isDeletedFromBook) || promotingToChapter === session.sessionId;
    let buttonText = "Crea Capitolo da questa Interazione";
    if (isBookContext && !session.isDeletedFromBook) {
      buttonText = "Già nel Libro";
    } else if (session.isDeletedFromBook) {
      buttonText = "Ricrea Capitolo (da sessione archiviata)";
    }


    return (
      <Card key={session.sessionId} className={`overflow-hidden transition-all duration-200 ${isBookContext && !session.isDeletedFromBook ? 'border-green-500' : (session.isDeletedFromBook ? 'border-orange-400' : '')}`}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => handleViewSessionDetails(session.sessionId)}>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-3 flex-1 group">
              <span className="text-2xl">💬</span>
              <span className="group-hover:text-primary transition-colors">
                {session.seedTitleGenerated || session.seedArchetypeId}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {session.isDeletedFromBook && <Badge variant="outline" className="border-orange-400 text-orange-500">Rimosso dal Libro</Badge>}
                {isBookContext && !session.isDeletedFromBook && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Nel Libro</Badge>}
                <Badge variant="outline">Interazioni: {session.interactionCount}</Badge>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(session.lastInteractionDate).toLocaleDateString()}
                </Badge>
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
            <p className="text-sm text-muted-foreground">
              ID Sessione: {session.sessionId} <br />
              Archetipo Seme: {session.seedArchetypeId}
            </p>
            <Button
              onClick={() => handleCreateChapterFromSession(session)}
              disabled={buttonDisabled}
              variant={isBookContext && !session.isDeletedFromBook ? "secondary" : "default"}
              size="sm"
              className="gap-2"
            >
              {promotingToChapter === session.sessionId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CopyPlus className="h-4 w-4" />
              )}
              {buttonText}
            </Button>
            <p className="text-xs text-center italic mt-2">
              (La visualizzazione dettagliata dei passaggi dell'interazione sarà implementata qui o in una pagina dedicata.)
            </p>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">📜 Archivio Interazioni Grezze</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Rivedi le tue sessioni di interazione con i semi e promuovile a capitoli del tuo libro.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            placeholder="🔍 Cerca per ID Seme o Titolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Summary Cards - can be re-enabled or adjusted as needed */}
      {/* ... */}

      {/* Section for Sessions Already in Book */}
      {filteredSessionsInBook.length > 0 && (
        <div className="space-y-4 mt-8 pt-6 border-t">
          <h2 className="text-2xl font-semibold">Sessioni Già nel Libro</h2>
          {filteredSessionsInBook.map(session => renderSessionCard(session, true))}
        </div>
      )}

      {/* Section for Other Archived Sessions */}
      <div className="space-y-4 mt-8 pt-6 border-t">
         <h2 className="text-2xl font-semibold">Altre Sessioni Archiviate</h2>
        {filteredOtherArchivedSessions.length === 0 && rawSessions.length > 0 && !loading && (
           <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <ArchiveX className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">Nessuna altra sessione archiviata</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nessun risultato per la ricerca attuale in questa sezione.' : 'Tutte le sessioni sono visualizzate sopra o non ci sono altre sessioni.'}
              </p>
            </CardContent>
          </Card>
        )}
        {filteredOtherArchivedSessions.length > 0 &&
          filteredOtherArchivedSessions.map(session => renderSessionCard(session, false))
        }
      </div>


      {(rawSessions.length === 0 && !loading) && (
         <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <ArchiveX className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">Nessuna interazione trovata</h3>
              <p className="text-muted-foreground">
                Non hai ancora sessioni di interazione registrate. Inizia un dialogo con un seme!
              </p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
        )}
      </div>
    </div>
  );
}