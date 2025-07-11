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
  SendToBack, // Icon for "Manda al Libro"
  ArchiveX // Icon for no sessions
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // For navigation

// Interfaccia per un capitolo (bozza o promosso)
export interface Capitolo {
  id: number;
  timestamp: string; // CORRETTO: da created_at a timestamp
  user_id: string;
  titolo: string;
  testo: string;
  seme_id: string | null;
  icona: string | null;
  stato: string; // 'bozza_in_archivio', 'promosso_al_libro', ecc.
  raw_interaction_session_id: string | null;
  eco: string[] | null;
  frase_finale: string | null;
  ordine: number | null;
}

export default function ArchivioClient({ user }: { user: User }) {
  const router = useRouter();
  const [capitoliUtente, setCapitoliUtente] = useState<Capitolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [promotingToLibro, setPromotingToLibro] = useState<number | null>(null);

  // Stati per la modifica
  const [editingCapitolo, setEditingCapitolo] = useState<Capitolo | null>(null);
  const [editTitolo, setEditTitolo] = useState<string>('');
  const [editTesto, setEditTesto] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);


  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadCapitoliUtente = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Query iniziale semplificata senza filtro 'stato' e usando 'timestamp'
      const { data: capitoliData, error: fetchError } = await supabase
        .from('capitoli')
        .select('id, user_id, seme_id, titolo, icona, testo, eco, frase_finale, timestamp, raw_interaction_session_id, stato')
        .eq('user_id', userId)
        .in('stato', ['bozza_in_archivio', 'promosso_al_libro']) // REINTRODOTTO FILTRO STATO
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error('Errore fetch capitoli (ArchivioClient):', fetchError);
        setError(`Errore caricamento capitoli: ${fetchError.message}`);
        setCapitoliUtente([]);
        throw fetchError;
      }

      console.log('[ARCHIVIO CLIENT] Dati capitoli caricati:', capitoliData);
      setCapitoliUtente(capitoliData || []);

    } catch (err) {
      // L'errore è già loggato sopra se proviene da fetchError
      // Questo catch gestirà altri eventuali errori nel blocco try
      if (!error && err instanceof Error) { // Evita di sovrascrivere l'errore del fetch se già impostato
         console.error('Error in loadCapitoliUtente (ArchivioClient):', err);
         setError(`Errore imprevisto nel caricamento: ${err.message}`);
      }
      const supabaseError = err as any;
      setError(`Errore nel caricamento dell'archivio: ${supabaseError.message || 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (user?.id) {
      loadCapitoliUtente(user.id);
    }
  }, [user, loadCapitoliUtente]);

  const toggleCardExpansion = (capitoloId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(capitoloId)) {
      newExpanded.delete(capitoloId);
    } else {
      newExpanded.add(capitoloId);
    }
    setExpandedCards(newExpanded);
  };

  const openEditModal = (capitolo: Capitolo) => {
    setEditingCapitolo(capitolo);
    setEditTitolo(capitolo.titolo);
    setEditTesto(capitolo.testo);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCapitolo) return;
    setIsSavingEdit(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('capitoli')
        .update({
          titolo: editTitolo,
          testo: editTesto
        })
        .eq('id', editingCapitolo.id);

      if (updateError) throw updateError;

      alert('Modifiche salvate con successo!');
      setShowEditModal(false);
      setEditingCapitolo(null);
      await loadCapitoliUtente(user.id); // Ricarica i dati

    } catch (err: any) {
      console.error('Errore durante il salvataggio delle modifiche:', err);
      setError(`Errore salvataggio: ${err.message || 'Sconosciuto'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handlePromoteToLibro = async (capitolo: Capitolo) => {
    if (!user) return;
    setPromotingToLibro(capitolo.id);
    setError(null);

    try {
      // 1. Calcola il prossimo valore di 'ordine' per la tabella 'libro'
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('libro')
        .select('ordine')
        .eq('user_id', user.id) // Assumendo che 'user_id' esista in 'libro' e sia corretto
        .order('ordine', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxOrderError) {
        console.error("Errore nel recuperare max ordine da libro:", maxOrderError.message);
        // Non bloccare, ma logga. L'ordine partirà da 0.
      }
      const newOrder = (maxOrderData?.ordine ?? -1) + 1;

      // 2. Prepara i dati per la tabella 'libro'
      // Colonne tabella 'libro': id, user_id, seme_id, titolo, testo, timestamp, sottotitolo, ordine
      const datiLibro = {
        user_id: user.id, // user_id dell'utente corrente
        titolo: capitolo.titolo,
        testo: capitolo.testo,
        sottotitolo: capitolo.eco?.join(' • ') || '', // Mappa eco a sottotitolo
        seme_id: capitolo.seme_id,
        // icona: capitolo.icona, // La tabella libro non ha 'icona' secondo il riepilogo
        timestamp: capitolo.timestamp, // Usa il timestamp del capitolo originale
        raw_interaction_session_id: capitolo.raw_interaction_session_id, // Se vuoi tracciarlo anche qui
        ordine: newOrder,
      };

      // 3. Inserisci il nuovo record nella tabella 'libro'
      const { data: libroInserito, error: insertLibroError } = await supabase
        .from('libro')
        .insert(datiLibro)
        .select('id, titolo') // Seleziona solo ciò che serve, es. per un log
        .single();

      if (insertLibroError) {
        console.error('Errore inserimento in tabella libro:', insertLibroError);
        throw insertLibroError;
      }
      if (!libroInserito) {
        throw new Error("Inserimento nella tabella libro non ha restituito dati confermati.");
      }

      console.log(`Capitolo "${libroInserito.titolo}" (ID sessione: ${capitolo.raw_interaction_session_id}) copiato in 'libro' con ID: ${libroInserito.id} e ordine: ${newOrder}`);

      // 4. Aggiorna lo stato del capitolo originale in 'capitoli'
      // Colonne tabella 'capitoli': id, user_id, seme_id, titolo, icona, testo, eco, frase_finale, timestamp, raw_interaction_session_id, stato
      const { error: updateCapitoloError } = await supabase
        .from('capitoli')
        .update({ stato: 'promosso_al_libro' }) // Usa il valore corretto per lo stato "promosso"
        .eq('id', capitolo.id) // Filtra per l'ID del capitolo originale
        .eq('user_id', user.id); // Aggiungi filtro user_id per sicurezza/RLS

      if (updateCapitoloError) {
        console.error('Errore aggiornamento stato in tabella capitoli:', updateCapitoloError);
        // Non bloccare necessariamente l'utente se la copia in 'libro' è andata a buon fine,
        // ma logga l'errore. Potrebbe essere necessario un meccanismo di compensazione o notifica.
        alert(`Capitolo aggiunto al libro, ma c'è stato un problema nell'aggiornare lo stato nell'archivio: ${updateCapitoloError.message}`);
        // Comunque ricarica i dati per vedere lo stato attuale
      } else {
        alert(`Capitolo "${capitolo.titolo}" promosso e aggiunto al libro con successo!`);
      }

      await loadCapitoliUtente(user.id); // Ricarica i capitoli per riflettere il cambio di stato

    } catch (err: any) {
      console.error('Errore generale durante la promozione del capitolo al libro:', err);
      setError(`Errore promozione capitolo: ${err.message || 'Sconosciuto'}`);
    } finally {
      setPromotingToLibro(null);
    }; // AGGIUNTO PUNTO E VIRGOLA
  };

  const filteredCapitoli = capitoliUtente.filter(capitolo =>
    (capitolo.titolo && capitolo.titolo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (capitolo.seme_id && capitolo.seme_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (capitolo.testo && capitolo.testo.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <Button variant="default" size="default" className="" onClick={() => user?.id && loadCapitoliUtente(user.id)}>
              Riprova Caricamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCapitoloCard = (capitolo: Capitolo) => {
    // DIAGNOSTIC LOG
    console.log('[ARCHIVIO CLIENT] Rendering Capitolo:', capitolo);

    const isExpanded = expandedCards.has(capitolo.id);
    const isPromosso = capitolo.stato === 'promosso_al_libro';
    const buttonDisabled = isPromosso || promotingToLibro === capitolo.id;

    let buttonText = "Manda al Libro";
    if (isPromosso) {
      buttonText = "Già nel Libro";
    }

    return (
      <Card key={capitolo.id} className={`overflow-hidden transition-all duration-200 ${isPromosso ? 'border-green-500' : ''}`}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleCardExpansion(capitolo.id)}>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-3 flex-1 group">
              <span className="text-2xl">{capitolo.icona || '📖'}</span>
              <span className="group-hover:text-primary transition-colors">
                {capitolo.titolo || `Capitolo da ${capitolo.seme_id || 'sconosciuto'}`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {isPromosso && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Nel Libro</Badge>}
                {capitolo.stato === 'bozza_in_archivio' && <Badge variant="outline">Bozza</Badge>}
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(capitolo.created_at).toLocaleDateString()}
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
              <strong>Seme:</strong> {capitolo.seme_id || 'Non specificato'} <br />
              <strong>ID Capitolo:</strong> {capitolo.id} <br />
              {capitolo.raw_interaction_session_id && <><strong>ID Sessione Grezza:</strong> {capitolo.raw_interaction_session_id} <br /></>}
              <strong>Stato:</strong> {capitolo.stato}
            </p>
            {/* Qui verrà aggiunta la visualizzazione del testo e l'opzione di modifica */}
            <div
              className="p-2 border rounded-md bg-muted/30 max-h-40 overflow-y-auto"
              style={{ border: '2px solid red' }} // STILE DIAGNOSTICO
            >
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: 'blue', height: 'auto', display: 'block', backgroundColor: 'lightyellow' }} // STILI DIAGNOSTICI
                >
                  {capitolo.testo || "Testo non disponibile (diagnostic placeholder)."}
                </p>
            </div>

            {capitolo.stato === 'bozza_in_archivio' && (
              <div className="flex space-x-2 mt-2">
                <Button
                  onClick={() => handlePromoteToLibro(capitolo)}
                  disabled={buttonDisabled}
                  variant={"default"}
                  size="sm"
                  className="gap-2"
                >
                  {promotingToLibro === capitolo.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendToBack className="h-4 w-4" />
                  )}
                  {buttonText}
                </Button>
                <Button
                  onClick={() => openEditModal(capitolo)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={promotingToLibro === capitolo.id} // Disabilita anche se si sta promuovendo
                >
                  <Edit3 className="h-4 w-4" />
                  Modifica
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">📜 Archivio Capitoli</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Rivedi le tue bozze di capitolo, modificane il contenuto e promuovile al tuo libro.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            placeholder="🔍 Cerca per Titolo, Seme o Testo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-4 mt-8 pt-6 border-t">
        {filteredCapitoli.length === 0 && !loading && (
           <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <ArchiveX className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">Nessun capitolo trovato</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nessun capitolo corrisponde alla tua ricerca.' : 'Non hai ancora bozze di capitolo. Inizia scrivendo!'}
              </p>
            </CardContent>
          </Card>
        )}
        {filteredCapitoli.map(capitolo => renderCapitoloCard(capitolo))}
      </div>

      {editingCapitolo && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifica Capitolo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-titolo" className="text-right col-span-1">
                  Titolo
                </label>
                <Input
                  id="edit-titolo"
                  value={editTitolo}
                  onChange={(e) => setEditTitolo(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="edit-testo" className="text-right col-span-1 pt-2">
                  Testo
                </label>
                <Textarea
                  id="edit-testo"
                  value={editTesto}
                  onChange={(e) => setEditTesto(e.target.value)}
                  className="col-span-3 min-h-[200px] sm:min-h-[300px]"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSavingEdit} className="" size="default">
                Annulla
              </Button>
              <Button variant="default" onClick={handleSaveEdit} disabled={isSavingEdit} className="" size="default">
                {isSavingEdit ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salva Modifiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}