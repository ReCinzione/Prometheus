'use client';

import { useEffect, useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import { fetchCapitoli } from '@/lib/supabaseHelpers';

type Capitolo = {
  id: number;
  user_id: string;
  seme_id: string;
  titolo: string;
  icona: string;
  testo: string;
  eco: string[];
  frase_finale: string;
  timestamp: string;
};

type EditingCapitolo = Capitolo & {
  ecoText: string;
};

export default function ArchivioClient({ user }: { user: User }) {
  const [capitoli, setCapitoli] = useState<Capitolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditingCapitolo | null>(null);
  const [transferDialog, setTransferDialog] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [transferring, setTransferring] = useState<number | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!user) return;
    loadCapitoli(user.id);
  }, [user]);

  const loadCapitoli = async (userId: string) => {
    try {
      setLoading(true);
      const data = await fetchCapitoli(supabase, userId);
      setCapitoli(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
      setError('Errore nel caricamento dei capitoli');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpansion = (capitoloId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(capitoloId)) {
      newExpanded.delete(capitoloId);
    } else {
      newExpanded.add(capitoloId);
    }
    setExpandedCards(newExpanded);
  };

  const handleStartEdit = (capitolo: Capitolo) => {
    setEditingId(capitolo.id);
    setEditForm({ ...capitolo, ecoText: capitolo.eco.join('\n') });
    // Espandi automaticamente la card quando si inizia a modificare
    setExpandedCards(prev => new Set([...prev, capitolo.id]));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm || !user) return;
    try {
      const updatedCapitolo = {
        ...editForm,
        eco: editForm.ecoText.split('\n').filter(line => line.trim() !== '')
      };
      const { error } = await supabase
        .from('capitoli')
        .update({
          titolo: updatedCapitolo.titolo,
          icona: updatedCapitolo.icona,
          testo: updatedCapitolo.testo,
          eco: updatedCapitolo.eco,
          frase_finale: updatedCapitolo.frase_finale
        })
        .eq('id', editForm.id);
      
      if (error) {
        console.error('Errore Supabase update:', error);
        throw error;
      }
      
      await loadCapitoli(user.id);
      setEditingId(null);
      setEditForm(null);
      setError(null); // Pulisci errori precedenti
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      setError('Errore durante il salvataggio delle modifiche');
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('capitoli').delete().eq('id', id);
      if (error) {
        console.error('Errore Supabase delete:', error);
        throw error;
      }
      
      await loadCapitoli(user.id);
      setDeleteDialog(null);
      // Rimuovi la card dall'espansione se era espansa
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setError(null);
    } catch (error) {
      console.error('Errore durante eliminazione:', error);
      setError('Errore durante l\'eliminazione del capitolo');
    }
  };

  const handleTransferToLibro = async (capitolo: Capitolo) => {
    if (!user) return;
    
    setTransferring(capitolo.id);
    
    try {
      // Prepara i dati assicurandoci che siano nel formato corretto
      const libroData = {
        user_id: user.id,
        seme_id: capitolo.seme_id,
        titolo: capitolo.frase_finale || capitolo.titolo, // Usa frase_finale come titolo, fallback su titolo
        sottotitolo: capitolo.eco && capitolo.eco.length > 0 ? capitolo.eco.join('\n') : '', // Gestisci eco vuoto
        testo: capitolo.testo || '', // Assicurati che non sia null
        timestamp: new Date().toISOString()
      };

      console.log('Dati da inserire in libro:', libroData);
      
      const { data, error } = await supabase
        .from('libro')
        .insert(libroData)
        .select(); // Aggiungi select per vedere cosa viene inserito
      
      if (error) {
        console.error('Errore Supabase insert libro:', error);
        console.error('Dettagli errore:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Trasferimento completato con successo:', data);
      setError(null);
      
      // Opzionale: mostra un feedback di successo
      alert('Capitolo trasferito al libro con successo!');
      
    } catch (error: any) {
      console.error('Errore durante il trasferimento:', error);
      setError(`Errore durante il trasferimento: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setTransferring(null);
    }
  };

  const handleAddTestCapitolo = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from('capitoli').insert({
        user_id: user.id,
        seme_id: `sem_${Date.now()}`,
        titolo: 'Seme Germogliato',
        icona: '🌱',
        testo: 'Un pensiero che ha preso radice nella mente e ora cresce verso la luce.',
        eco: [
          'Riflesso nel silenzio mattutino',
          'Eco di voci lontane',
          'Sussurro del vento tra le foglie'
        ],
        frase_finale: 'E così il seme diventa albero.',
        timestamp: new Date().toISOString()
      });
      
      if (error) {
        console.error('Errore Supabase insert:', error);
        throw error;
      }
      
      await loadCapitoli(user.id);
      setError(null);
    } catch (error) {
      console.error('Errore durante aggiunta:', error);
      setError('Errore durante l\'aggiunta del capitolo');
    }
  };

  const filteredCapitoli = capitoli.filter(capitolo =>
    capitolo.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capitolo.testo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capitolo.eco.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">Caricamento archivio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Errore</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="default" size="default" onClick={() => window.location.reload()}>
              Ricarica Pagina
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">🌱 Archivio Semi Germogliati</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          I tuoi pensieri che hanno preso vita e crescono nel giardino della memoria
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="🔍 Cerca nei tuoi semi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={handleAddTestCapitolo} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Seme
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Semi Totali</p>
              <p className="text-2xl font-bold">{capitoli.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Questo Mese</p>
              <p className="text-2xl font-bold">
                {capitoli.filter(c => 
                  new Date(c.timestamp).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <BookOpen className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Nel Libro</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredCapitoli.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <div className="text-6xl">🌱</div>
              <h3 className="text-xl font-semibold">Nessun seme germogliato</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Nessun risultato per la ricerca attuale'
                  : 'I tuoi primi semi stanno ancora crescendo...'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCapitoli.map((capitolo) => {
            const isExpanded = expandedCards.has(capitolo.id);
            const isEditing = editingId === capitolo.id;
            
            return (
              <Card key={capitolo.id} className="overflow-hidden transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-3 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editForm?.icona || ''}
                            onChange={(e) => setEditForm(prev => prev ? {...prev, icona: e.target.value} : null)}
                            className="w-16 text-center"
                            placeholder="🌱"
                          />
                          <Input
                            value={editForm?.titolo || ''}
                            onChange={(e) => setEditForm(prev => prev ? {...prev, titolo: e.target.value} : null)}
                            className="flex-1"
                            placeholder="Titolo del capitolo"
                          />
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1 group"
                          onClick={() => toggleCardExpansion(capitolo.id)}
                        >
                          <span className="text-2xl">{capitolo.icona}</span>
                          <span className="group-hover:text-primary transition-colors">
                            {capitolo.titolo}
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(capitolo.timestamp).toLocaleDateString()}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      )}
                    </CardTitle>

                    {!isEditing && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button size="sm" variant="outline" onClick={() => handleStartEdit(capitolo)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Button 
                          size="sm" 
                          variant="default" 
                          className="gap-1"
                          onClick={() => handleTransferToLibro(capitolo)}
                          disabled={transferring === capitolo.id}
                        >
                          {transferring === capitolo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                          Al Libro
                        </Button>

                        <Dialog open={deleteDialog === capitolo.id} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteDialog(capitolo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Eliminare il capitolo?</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground mb-4">
                              Questa azione non può essere annullata. Il capitolo "{capitolo.titolo}" sarà eliminato permanentemente.
                            </p>
                            <DialogFooter className="gap-2">
                              <Button variant="outline" onClick={() => setDeleteDialog(null)}>
                                Annulla
                              </Button>
                              <Button variant="destructive" onClick={() => handleDelete(capitolo.id)}>
                                Elimina
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {isEditing && (
                      <div className="flex gap-1 ml-4">
                        <Button size="sm" variant="default" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {(isExpanded || isEditing) && (
                  <CardContent className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {isEditing ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editForm?.testo || ''}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, testo: e.target.value} : null)}
                          placeholder="Contenuto del capitolo..."
                          rows={4}
                        />
                        <div>
                          <label className="text-sm font-medium mb-2 block">Echi (uno per riga)</label>
                          <Textarea
                            value={editForm?.ecoText || ''}
                            onChange={(e) => setEditForm(prev => prev ? {...prev, ecoText: e.target.value} : null)}
                            placeholder="Primo eco&#10;Secondo eco&#10;Terzo eco..."
                            rows={3}
                          />
                        </div>
                        <Input
                          value={editForm?.frase_finale || ''}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, frase_finale: e.target.value} : null)}
                          placeholder="Frase finale..."
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-foreground leading-relaxed">{capitolo.testo}</p>

                        {capitolo.eco.length > 0 && (
                          <div>
                            <Separator className="mb-3" />
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Echi
                              </h4>
                              <ScrollArea className="max-h-32">
                                <ul className="space-y-1">
                                  {capitolo.eco.map((eco, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm italic">
                                      <span className="text-muted-foreground mt-0.5">•</span>
                                      <span className="text-muted-foreground">{eco}</span>
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </div>
                          </div>
                        )}

                        {capitolo.frase_finale && (
                          <div className="pt-4 border-t">
                            <p className="text-right italic text-primary font-medium">
                              "{capitolo.frase_finale}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}