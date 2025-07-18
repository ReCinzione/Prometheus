'use client';

import Link from 'next/link';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import CoverUploadClient from './CoverUploadClient'; // Import the new component
import { Card, CardContent } from '@/components/ui/card'; // For styling
import { Badge } from '@/components/ui/badge'; // Added missing Badge import
import { Image as ImageIcon, BookHeart } from 'lucide-react'; // Icons
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import LibroVivente, { Capitolo as CapitoloType } from './LibroVivente'; // Import CapitoloType
// Ensure react-beautiful-dnd types are correctly installed if issues arise:
// npm install --save-dev @types/react-beautiful-dnd
import { DragDropContext, Droppable, Draggable, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { GripVertical, Edit, Trash2, PlusCircle, Save, Share2, Loader2 as ActionLoader, Loader2 } from 'lucide-react'; // Added Loader2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming ShadCN Dialog
import { Input } from "@/components/ui/input"; // For edit form
import { Textarea } from "@/components/ui/textarea"; // For edit form
import { toast } from "sonner"; // For notifications


interface LibroPageProps {
  user?: User | null;
}

interface Book {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Definiamo un tipo specifico per i capitoli caricati dalla tabella 'libro'
interface LibroCapitolo {
  id: string;
  user_id: string;
  titolo: string;
  sottotitolo?: string | null;
  testo: string;
  seme_id?: string | null;
  icona?: string | null;
  raw_interaction_session_id?: string | null;
  ordine: number;
  created_at: string;
  updated_at: string;
  // Non includiamo 'stato' o 'eco' specifici di 'capitoli'
}


export default function LibroPage({ user: initialUser }: LibroPageProps = {}) {
  const componenteLibro = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<LibroCapitolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  // const [sharedChapterIds, setSharedChapterIds] = useState<Set<string>>(new Set()); // Temporaneamente commentato

  // State for editing and deleting chapters
  const [editingChapter, setEditingChapter] = useState<LibroCapitolo | null>(null);
  const [editFormData, setEditFormData] = useState<{ titolo: string; testo: string }>({ titolo: '', testo: '' });
  const [showEditModal, setShowEditModal] = useState(false);

  const [deletingChapter, setDeletingChapter] = useState<LibroCapitolo | null>(null); // MODIFICATO
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);


  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchUserAndBook = useCallback(async () => {
    setLoading(true);
    let currentUser = initialUser;
    if (!currentUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      currentUser = authUser;
    }
    setUser(currentUser);

    if (currentUser) {
      // Fetch book for the user. Assuming one book per user for now, or the first one.
      // In a multi-book scenario, you'd need a way to select which book.
      let { data: bookData, error: bookError } = await supabase
        .from('libro')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle(); // Use maybeSingle if one book per user, or order/limit(1) for first

      if (bookError) {
        console.error('Errore nel recupero del libro:', bookError);
      }

      if (!bookData && !bookError) { // No book exists, create one
        const { data: newBook, error: createError } = await supabase
          .from('libro')
          .insert({ user_id: currentUser.id, title: 'Il Mio Libro Vivente' }) // Default title
          .select()
          .single();

        if (createError) {
          console.error('Errore nella creazione del libro:', createError);
        } else {
          bookData = newBook;
        }
      }
      setCurrentBook(bookData);

      // Fetch chapters from 'libro' table
      const { data: chapterData, error: chapterError } = await supabase
        .from('libro') // MODIFICATO: leggere da 'libro'
        .select('*')
        .eq('user_id', currentUser.id)
        .order('ordine', { ascending: true });

      // DIAGNOSTIC LOG
      console.log('[LIBRO PAGE] Fetching chapters from "libro" table:', chapterData, 'Error:', chapterError);

      if (chapterError) {
        console.error('Errore nel recupero dei capitoli del libro:', chapterError);
        setChapters([]);
      } else {
        // Assicurati che CapitoloType sia compatibile con i dati da 'libro'
        // Potrebbe essere necessario un mapping se i nomi dei campi differiscono significativamente
        // o se CapitoloType si aspetta campi non presenti in 'libro' (es. 'stato')
        // Per ora, assumiamo una compatibilità di base per titolo, testo, id, ordine.
        // Il campo 'stato' non sarà presente nei dati da 'libro', quindi CapitoloType dovrà permetterlo come opzionale
        // o dovremo adattare CapitoloType.
        // Idealmente, CapitoloType dovrebbe essere flessibile o avremmo tipi distinti.
        // Ora usiamo LibroCapitolo
        const loadedChapters: LibroCapitolo[] = (chapterData || []).map(dbRow => ({
          id: dbRow.id, // Assumendo che dbRow.id sia string
          titolo: dbRow.titolo,
          testo: dbRow.testo,
          sottotitolo: dbRow.sottotitolo,
          ordine: dbRow.ordine,
          // Mappa altri campi da CapitoloType se presenti in dbRow e necessari in LibroCapitolo
          // Ad esempio, se CapitoloType (e quindi LibroCapitolo via Omit) ha seme_id, icona, etc.
          seme_id: dbRow.seme_id,
          icona: dbRow.icona,
          created_at: dbRow.created_at, // Assumendo che CapitoloType abbia created_at
          updated_at: dbRow.updated_at, // Assumendo che CapitoloType abbia updated_at
          user_id: dbRow.user_id, // Assumendo che CapitoloType abbia user_id
          raw_interaction_session_id: dbRow.raw_interaction_session_id, // Assumendo
        }));
        setChapters(loadedChapters);
      }

      // Fetch shared status for these chapters (IDs from 'libro' table) - TEMPORANEAMENTE COMMENTATO
      // if (currentUser && chapterData && chapterData.length > 0) {
      //   const chapterIdsFromLibro = chapterData.map(ch => ch.id);
      //   if (chapterIdsFromLibro.length > 0) {
      //     const { data: sharedData, error: sharedError } = await supabase
      //       .from('shared_chapters')
      //       .select('chapter_id')
      //       .eq('original_user_id', currentUser.id)
      //       .in('chapter_id', chapterIdsFromLibro);
      //     if (sharedError) {
      //       console.error('Errore nel recupero stato condivisione capitoli (da libro):', sharedError);
      //     } else {
      //       // setSharedChapterIds(new Set(sharedData?.map(s => s.chapter_id as string) || [])); // COMMENTATO
      //     }
      //   } else {
      //     // setSharedChapterIds(new Set()); // COMMENTATO
      //   }
      // } else {
      //   // setSharedChapterIds(new Set());  // COMMENTATO
      // }
    }
    setLoading(false);
  }, [supabase, initialUser]);

  useEffect(() => {
    fetchUserAndBook();
  }, [fetchUserAndBook]);

  const handleCoverUploadSuccess = (newCoverUrl: string) => {
    setCurrentBook(prevBook => prevBook ? { ...prevBook, cover_image_url: newCoverUrl, updated_at: new Date().toISOString() } : null);
    setShowCoverUpload(false);
  };

  const handleOpenEditModal = (chapter: LibroCapitolo) => { // MODIFICATO: parametro ora è LibroCapitolo
    setEditingChapter(chapter);
    setEditFormData({ titolo: chapter.titolo, testo: chapter.testo });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingChapter(null);
    setEditFormData({ titolo: '', testo: '' });
  };

  const handleSaveChapterChanges = async () => {
    if (!editingChapter || !editFormData) return;
    setIsProcessingAction(true);
    try {
      const { error } = await supabase
        .from('libro') // MODIFICATO: tabella 'libro'
        .update({
          titolo: editFormData.titolo,
          testo: editFormData.testo,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingChapter.id) // Assumendo che l'ID sia lo stesso tra 'capitoli' e 'libro' per lo stesso contenuto
        .eq('user_id', user?.id);

      if (error) throw error;

      setChapters(prev => prev.map(ch =>
        ch.id === editingChapter.id ? { ...ch,
                                        titolo: editFormData.titolo,
                                        testo: editFormData.testo,
                                        updated_at: new Date().toISOString()
                                      } : ch
      ));
      toast.success("Capitolo aggiornato con successo nel libro!");
      handleCloseEditModal();
    } catch (err: any) {
      console.error("Errore aggiornamento capitolo nel libro:", err);
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenDeleteModal = (chapter: LibroCapitolo) => { // MODIFICATO: parametro ora è LibroCapitolo
    setDeletingChapter(chapter);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingChapter(null);
  };

  const handleConfirmDeleteChapter = async () => {
    if (!deletingChapter) return;
    setIsProcessingAction(true);
    try {
      // Elimina il capitolo dalla tabella 'libro'
      const { error } = await supabase
        .from('libro') // MODIFICATO: tabella 'libro'
        .delete()
        .eq('id', deletingChapter.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // TODO: Decidere cosa fare con il record in 'capitoli'
      // Opzione: aggiornare lo stato in 'capitoli' a 'bozza_in_archivio' o un nuovo stato 'rimosso_dal_libro'
      // Per ora, non facciamo nulla con 'capitoli', il record lì rimane 'promosso_al_libro'
      // Questo potrebbe portare a incoerenze se si prova a ri-promuovere senza logica aggiuntiva.
      // console.log(`Capitolo ${deletingChapter.id} eliminato da 'libro'. Stato in 'capitoli' non modificato.`);

      setChapters(prev => prev.filter(ch => ch.id !== deletingChapter.id));
      toast.success("Capitolo rimosso dal libro con successo.");
      handleCloseDeleteModal();
    } catch (err: any) {
      console.error("Errore rimozione capitolo dal libro:", err);
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleShareChapter = async (chapter: CapitoloType) => {
    if (!user || !chapter) return;
    setIsProcessingAction(true); // Use general processing flag for share button too
    try {
      // Attempt to get a more descriptive name, fallback to email part or generic
      const authorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Autore Anonimo';
      const preview = chapter.testo.substring(0, 200) + (chapter.testo.length > 200 ? '...' : '');

      const { error } = await supabase
        .from('shared_chapters')
        .insert({
          chapter_id: chapter.id,
          original_user_id: user.id,
          title: chapter.titolo,
          content_preview: preview,
          original_author_name: authorName,
          allow_view_by_others: true
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation (chapter_id)
          toast.info("Questo capitolo è già stato condiviso o c'è un conflitto.");
          // Ensure local state reflects it's shared if DB says so
          // setSharedChapterIds(prev => new Set(prev).add(chapter.id)); // TEMPORANEAMENTE COMMENTATO
        } else {
          throw error; // Rethrow other errors
        }
      } else {
        // setSharedChapterIds(prev => new Set(prev).add(chapter.id)); // TEMPORANEAMENTE COMMENTATO
        toast.success(`Capitolo "${chapter.titolo}" condiviso con successo! Sarà visibile in "Mondi Paralleli".`);
      }
    } catch (err: any) {
      console.error("Errore condivisione capitolo:", err);
      toast.error(`Condivisione fallita: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };


  const handleDragEnd = async (result: DropResult, provided: ResponderProvided) => {
    if (!result.destination) return; // Dropped outside the list
    if (result.destination.index === result.source.index) return; // Dropped in the same place

    const items = Array.from(chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for responsiveness
    setChapters(items.map((item, index) => ({ ...item, ordine: index })));
    setIsSavingOrder(true);

    // Prepare data for Supabase update
    const updates = items.map((item, index) => ({
      id: item.id, // Ensure your CapitoloType has 'id'
      ordine: index,
      user_id: user?.id // For RLS, if 'id' is not globally unique for updates without user_id filter
    }));

    try {
      // It's often better to use a Supabase Edge Function for batch updates if possible,
      // but multiple individual updates can work for smaller lists.
      // Here, we'll attempt individual updates.
      // For Supabase upsert to work as update, ensure 'id' is part of the object.
      const { error } = await supabase.from('libro').upsert(updates, { // MODIFICATO: tabella 'libro'
        onConflict: 'id', // Specify the conflict target (PK)
        // ignoreDuplicates: false, // Default is false, upsert will update
      });


      if (error) {
        console.error('Errore durante l\'aggiornamento dell\'ordine dei capitoli nella tabella LIBRO:', error);
        // Optionally revert state or show error to user
        // For simplicity, we'll refetch to ensure consistency if error
        if (user) fetchUserAndBook(); // Refetch to get server state
        alert(`Errore salvataggio ordine: ${error.message}`);
      } else {
        // Data is updated, local state already reflects this.
        console.log('Ordine capitoli aggiornato con successo.');
      }
    } catch (err) {
      console.error('Eccezione durante l\'aggiornamento dell\'ordine:', err);
      if (user) fetchUserAndBook(); // Refetch
      alert('Eccezione durante il salvataggio dell\'ordine.');
    } finally {
      setIsSavingOrder(false);
    }
  };


  const handleStampa = useReactToPrint({
    contentRef: componenteLibro,
    documentTitle: 'Libro Vivente',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dati libro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accesso richiesto</h1>
          <p className="mb-4">Devi essere autenticato per accedere al tuo Libro Vivente.</p>
          <Link 
            href="/login" 
            className="inline-block px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Vai al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {currentBook?.cover_image_url ? (
              <img
                src={currentBook.cover_image_url}
                alt="Copertina del libro"
                className="w-40 h-60 object-cover rounded-md shadow-md sm:w-48 sm:h-72" // 6:9 aspect ratio
              />
            ) : (
              <div className="w-40 h-60 sm:w-48 sm:h-72 bg-gray-200 rounded-md flex flex-col items-center justify-center text-gray-500 shadow-md">
                <BookHeart className="w-16 h-16" />
                <p className="mt-2 text-sm">Nessuna Copertina</p>
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                {currentBook?.title || 'Il Mio Libro Vivente'}
              </h1>
              <p className="text-muted-foreground mb-4">
                Il tuo spazio personale per coltivare e raccogliere i frutti delle tue interazioni.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  onClick={handleStampa}
                  variant="default"
                  size="default" // Added this line
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Esporta in PDF
                </Button>
                <Button
                  onClick={() => setShowCoverUpload(!showCoverUpload)}
                  variant="outline"
                  size="default"
                  className="" // Added className
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {showCoverUpload ? 'Annulla Modifica Copertina' : 'Modifica Copertina'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCoverUpload && currentBook && user && (
        <CoverUploadClient
          user={user}
          bookId={currentBook.id}
          currentCoverUrl={currentBook.cover_image_url}
          onUploadSuccess={handleCoverUploadSuccess}
        />
      )}

      {/* Sezione Capitoli (LibroVivente) - This is for PDF export view */}
      <div className="print:block hidden">
        {user && chapters && currentBook && (
          <LibroVivente
            ref={componenteLibro}
            user={user}
            chapters={chapters}
            bookTitle={currentBook.title}
            coverImageUrl={currentBook.cover_image_url}
          />
        )}
      </div>

      {/* Interactive Chapter List for UI */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Capitoli del Libro</h2>
            <div className="flex items-center gap-2">
              {isSavingOrder && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              <Button variant="outline" size="sm" className="" onClick={() => alert("Logica 'Nuovo Capitolo Diretto' da implementare")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuovo Capitolo Diretto
              </Button>
            </div>
          </div>
          {chapters.length === 0 ? (
            <p className="text-muted-foreground">Nessun capitolo ancora nel libro. Promuovi interazioni dall'archivio o crea un nuovo capitolo.</p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="chaptersList">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {chapters.map((chapter, index) => (
                      <Draggable key={chapter.id.toString()} draggableId={chapter.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'bg-purple-50 shadow-xl' : ''
                            }`}
                          >
                            {/* CONTENUTO SEMPLIFICATO PER DIAGNOSI */}
                            <div className="flex-grow">
                              <GripVertical className="inline h-5 w-5 text-muted-foreground mr-2" />
                              <span>ID: {chapter.id} - Ordine: {chapter.ordine} - Titolo: {chapter.titolo}</span>
                            </div>
                            {/* RIPRISTINO PULSANTI DI AZIONE */}
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="icon" className="" onClick={() => handleOpenEditModal(chapter)} disabled={isProcessingAction} title="Modifica">
                                <Edit className="h-4 w-4" />
                              </Button>
                              {/* Pulsante Condividi e logica collegata temporaneamente commentati
                              {sharedChapterIds.has(chapter.id) ? (
                                <span className="text-xs text-green-600 italic px-2">Condiviso</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className=""
                                  onClick={() => handleShareChapter(chapter)}
                                  disabled={isProcessingAction}
                                  title="Condividi questo capitolo"
                                >
                                  {isProcessingAction && editingChapter?.id !== chapter.id && deletingChapter?.id !== chapter.id ?
                                   <ActionLoader className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 text-blue-500" /> }
                                </Button>
                              )}
                              */}
                              <Button variant="ghost" size="icon" className="" onClick={() => handleOpenDeleteModal(chapter)} disabled={isProcessingAction} title="Elimina (Archivia)">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Chapter Modal */}
      {showEditModal && editingChapter && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => !isOpen && handleCloseEditModal()}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifica Capitolo: {editingChapter.titolo}</DialogTitle>
              <DialogDescription>
                Apporta le modifiche necessarie al titolo e al contenuto del capitolo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-title" className="text-right">Titolo</label>
                <Input
                  id="edit-title"
                  value={editFormData.titolo}
                  onChange={(e) => setEditFormData(prev => ({...prev, titolo: e.target.value}))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="edit-content" className="text-right mt-2">Contenuto</label>
                <Textarea
                  id="edit-content" // L'ID HTML può rimanere 'edit-content' se vuoi
                  value={editFormData.testo}
                  onChange={(e) => setEditFormData(prev => ({...prev, testo: e.target.value}))}
                  className="col-span-3 min-h-[200px]"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="default" className="" onClick={handleCloseEditModal} disabled={isProcessingAction}>Annulla</Button>
              <Button variant="default" size="default" className="" onClick={handleSaveChapterChanges} disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salva Modifiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingChapter && (
         <Dialog open={showDeleteModal} onOpenChange={(isOpen) => !isOpen && handleCloseDeleteModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma Eliminazione</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare (archiviare) il capitolo &quot;{deletingChapter.titolo}&quot;?
                Il suo stato verr&agrave; impostato su &apos;archivio_cancellato&apos; e non sar&agrave; pi&ugrave; visibile nel libro.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="default" className="" onClick={handleCloseDeleteModal} disabled={isProcessingAction}>Annulla</Button>
              <Button variant="destructive" size="default" className="" onClick={handleConfirmDeleteChapter} disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Conferma Eliminazione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}