'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Added for session ID
import { createBrowserClient } from '@supabase/ssr';
import { salvaCapitolo } from '@/lib/supabaseHelpers';
import { semi } from '@/lib/semi';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Loader2, ArrowLeft, Archive, CheckCircle, XCircle, BookOpen, EyeOff } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string | string[];
  eco?: string[];
  fraseFinale?: string; // La domanda di Prometheus o la frase conclusiva
  timestamp: Date;
  fase?: 'prima' | 'seconda';
}

type FaseInterazione = 'attesa1' | 'attesa2' | 'completato';

export default function ScriviPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const semeId = searchParams.get('seme') || '';
  const selected = semi.find((s) => s.id === semeId);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raccontoIntro, setRaccontoIntro] = useState<string | null>(null);
  const [showRacconto, setShowRacconto] = useState(false);
  const [raccontoLoading, setRaccontoLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fase, setFase] = useState<FaseInterazione>('attesa1');
  const [salvataggioStatus, setSalvataggioStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // New state variables for session and interaction tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interactionNumber, setInteractionNumber] = useState(0);
  const [alreadyWritten, setAlreadyWritten] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setSessionId(uuidv4()); // Generate a new session ID on component mount/new seed
      setInteractionNumber(0); // Reset interaction number
    };
    initializeSession();
    // Dependency array: if semeId can change while the component is mounted, add semeId.
    // For now, assuming it mounts per unique seed page or semeId is stable.
    // If navigating between seeds on this same page instance, semeId in dependency array is crucial.
  }, [semeId]); // Re-initialize session if semeId changes (e.g. user navigates to a new seed)

  // Controlla se il seme è già stato scritto (eccetto sem_99)
  useEffect(() => {
    if (!userId || !semeId || semeId === "sem_99") return;
    const checkAlreadyWritten = async () => {
      const { data, error } = await supabase
        .from('capitoli')
        .select('id')
        .eq('user_id', userId)
        .eq('seme_id', semeId)
        .maybeSingle();
      if (data) setAlreadyWritten(true);
      else setAlreadyWritten(false);
    };
    checkAlreadyWritten();
  }, [userId, semeId]);

  // Funzione per caricare il racconto in modo più robusto
  const loadRacconto = async () => {
    if (!semeId || raccontoIntro) return;
    
    setRaccontoLoading(true);
    try {
      // Rimuovi il prefisso 'sem_' se presente e aggiungi lo zero iniziale se necessario
      const semeNumber = semeId.replace('sem_', '');
      const paddedNumber = semeNumber.padStart(3, '0');
      const path = `sem_${paddedNumber}`;

      try {
        const mod = await import('../../../lib/racconti_storie');
        const racconto = mod[path];
        if (racconto) {
          setRaccontoIntro(racconto);
        } else {
          console.error(`Racconto non trovato per il path: ${path}`);
          setRaccontoIntro(null);
        }
      } catch (err) {
        console.error('Errore importazione modulo:', err);
        setRaccontoIntro(null);
      }
    } catch (error) {
      console.error('Errore caricamento racconto:', error);
      setRaccontoIntro(null);
    } finally {
      setRaccontoLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading && fase !== 'completato') {
      textareaRef.current?.focus();
    }
  }, [loading, fase]);

  const handleToggleRacconto = async () => {
    if (!showRacconto && !raccontoIntro) {
      await loadRacconto();
    }
    setShowRacconto(!showRacconto);
  };

  // LOGICA SPECIALE PER SEME 99
  const isSeme99 = semeId === "sem_99";

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading || fase === 'completato' || (alreadyWritten && !isSeme99)) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      if (isSeme99) {
        // Invio diretto, logica eco
        if (!userId || !sessionId) {
          setError("Errore: ID utente o sessione non inizializzati.");
          setLoading(false);
          return;
        }
        const currentInteractionNumForSeme99 = 0; // Seme 99 is single interaction from this page's perspective

        const response = await fetch(`/api/archetipo-gemini`, { // Use local API route
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frasi: userMessage.content, // Matches expected 'frasi' in API route
            nome: selected?.nome || semeId, // Pass 'nome' for semeId construction in API route
            is_eco_request: true, // Specific to Seme 99 flow
            user_id: userId,
            session_id: sessionId,
            interaction_number: currentInteractionNumForSeme99, // Seme 99 is always first interaction in this context
            history: [], // Seme 99 doesn't use history from this page
            last_assistant_question: null
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.detail || `Errore HTTP ${response.status}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();

        const assistantResponse: ChatMessage = {
          type: 'assistant',
          content: "",
          eco: data.eco,
          fraseFinale: data.frase_finale,
          timestamp: new Date(),
          fase: 'seconda'
        };

        setMessages(prev => [...prev, assistantResponse]);
        setFase('completato');
        // NON salvare in archivio per seme 99
        setSalvataggioStatus('saved');
        setTimeout(() => setSalvataggioStatus('idle'), 3000);
        return;
      }

      const assistantMessages = messages.filter(m => m.type === 'assistant');
      const isFirstNormalInteraction = assistantMessages.length === 0;
      const currentInteractionNum = isFirstNormalInteraction ? 0 : 1;
      
      // Estrai l'ultima domanda di Prometheus per passarla al backend
      const lastAssistantQuestion = assistantMessages.length > 0 
        ? assistantMessages[assistantMessages.length - 1].fraseFinale 
        : null;

      if (!userId || !sessionId) {
        setError("Errore: ID utente o sessione non inizializzati.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/archetipo-gemini`, { // Use local API route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frasi: userMessage.content, // Matches 'frasi' in API route
          nome: selected?.nome || semeId, // Pass 'nome' for semeId construction in API route

          // History per il backend Python (diverso da `messages` state che ha più dettagli)
          // Il backend Python si aspetta una lista di liste: [type, content_string]
          history: messages.map(m => [
            m.type, 
            Array.isArray(m.content) ? m.content.join('\n\n') : m.content
          ]),
          is_first_interaction: isFirstNormalInteraction, // Usato dal backend Python per la logica del prompt
          last_assistant_question: lastAssistantQuestion,

          // Nuovi campi per il logging e gestione sessione
          user_id: userId,
          session_id: sessionId,
          interaction_number: currentInteractionNum // 0 per la prima interazione, 1 per la seconda
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || `Errore HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const assistantResponse: ChatMessage = {
        type: 'assistant',
        content: data.output,
        eco: data.eco,
        fraseFinale: data.frase_finale,
        timestamp: new Date(),
        fase: isFirstNormalInteraction ? 'prima' : 'seconda'
      };

      setMessages(prev => [...prev, assistantResponse]);

      if (fase === 'attesa1') {
        setFase('attesa2');
      } else if (fase === 'attesa2') {
        setFase('completato');
        if (userId) {
          await handleAutoSave(assistantResponse);
        }
      }

    } catch (err: any) {
      console.error('API error:', err);
      // Miglioramento della visualizzazione dell'errore
      setError(err.message || 'Si è verificato un errore inaspettato. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async (lastMessage: ChatMessage) => {
    if (!userId || !selected) return;

    setSalvataggioStatus('saving');
    try {
      const textToSave = Array.isArray(lastMessage.content) 
        ? lastMessage.content.join('\n\n') 
        : lastMessage.content;

      await salvaCapitolo(supabase, {
        userId,
        semeId: selected.id,
        titolo: selected.nome,
        icona: selected.icona,
        testo: textToSave,
        eco: lastMessage.eco || [],
        fraseFinale: lastMessage.fraseFinale || '',
      });
      setSalvataggioStatus('saved');
      setTimeout(() => setSalvataggioStatus('idle'), 3000); 
    } catch (error) {
      console.error('Errore salvataggio automatico:', error);
      setSalvataggioStatus('error');
      setError('Errore durante il salvataggio automatico.');
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInputText('');
    setError(null);
    setFase('attesa1');
    setSalvataggioStatus('idle');
    setShowRacconto(false);
    // Reset session for a completely new chat if "Ricomincia" is clicked
    setSessionId(uuidv4());
    setInteractionNumber(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && fase !== 'completato') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPlaceholder = () => {
    switch (fase) {
      case 'attesa1':
        return 'Scrivi qui la tua prima riflessione sul seme...';
      case 'attesa2':
        return 'Rispondi alla domanda di Prometheus...';
      case 'completato':
        return 'Capitolo completato! Il tuo viaggio con questo seme è concluso.';
      default:
        return 'Scrivi qui...';
    }
  };

  const getGuidaMessage = () => {
    switch (fase) {
      case 'attesa1':
        return 'Condividi la tua prima riflessione sul seme';
      case 'attesa2':
        return 'Prometheus ti ha risposto con una domanda. Ora tocca a te!';
      case 'completato':
        return salvataggioStatus === 'saved' 
          ? 'Capitolo completato e salvato automaticamente!' 
          : 'Capitolo completato!';
      default:
        return '';
    }
  };

  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Nessun Seme Selezionato</h2>
            <p className="text-gray-600 mb-6">Scegli un seme dal mandala per iniziare il tuo viaggio.</p>
            <Button 
              onClick={() => router.push('/mandala')} 
              className="w-full"
              variant="default"
              size="default"
            >
              Vai al Mandala
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // BLOCCO SCRITTURA SE GIÀ SCRITTO (eccetto seme 99)
  if (alreadyWritten && !isSeme99) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">{selected.icona}</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Hai gi&agrave; scritto per questo seme!</h2>
            <p className="text-gray-600 mb-6">Puoi rileggere il tuo capitolo nell&apos;archivio.</p>
            <Button variant="default" size="default" onClick={() => router.push('/archivio')} className="w-full">
              Vai all&apos;Archivio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/mandala')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Mandala
              </Button>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{selected.icona}</span>
                <div>
                  <h1 className="text-xl font-semibold text-gray-800">{selected.nome}</h1>
                  <p className="text-sm text-gray-600">{selected.sigillo.codice_sigillo}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {salvataggioStatus === 'saved' && (
                <div className="flex items-center text-green-600 text-sm mr-2 animate-pulse">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Salvato
                </div>
              )}
              {salvataggioStatus === 'saving' && (
                 <div className="flex items-center text-gray-500 text-sm mr-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Salvataggio...
                </div>
              )}
              {salvataggioStatus === 'error' && (
                 <div className="flex items-center text-red-600 text-sm mr-2">
                  <XCircle className="w-4 h-4 mr-1" />
                  Errore Salvataggio
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={resetChat}
                disabled={messages.length === 0}
                className="text-gray-600"
              >
                Ricomincia
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={() => router.push('/archivio')}
                className="text-gray-600"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archivio
              </Button>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-center">
            <div className="flex items-center space-x-4 text-sm">
              <div className={`flex items-center space-x-2 ${fase === 'attesa1' ? 'text-purple-600 font-medium' : fase === 'completato' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${fase === 'attesa1' ? 'bg-purple-600' : fase === 'completato' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                <span>Prima riflessione</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center space-x-2 ${fase === 'attesa2' ? 'text-purple-600 font-medium' : fase === 'completato' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${fase === 'attesa2' ? 'bg-purple-600' : fase === 'completato' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                <span>Risposta finale</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {getGuidaMessage() && (
          <Card className={`mb-6 ${fase === 'completato' ? 'border-green-200 bg-green-50' : 'border-purple-200 bg-purple-50'}`}>
            <CardContent className="p-4">
              <p className={`text-center font-medium ${fase === 'completato' ? 'text-green-700' : 'text-purple-700'}`}>
                {getGuidaMessage()}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-l-4" style={{ borderLeftColor: selected.sigillo.colore }}>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-3">Il Prompt del Seme</h2>
            <p className="text-gray-700 leading-relaxed mb-4">{selected.prompt_base}</p>
            
            {selected.eco && selected.eco.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Echi</h3>
                <ul className="space-y-1">
                  {selected.eco.map((eco, i) => (
                    <li key={i} className="text-sm text-gray-600 italic">• {eco}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sezione Racconto Introduttivo Migliorata */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-gray-700 leading-relaxed italic mb-4">
                A volte un seme necessita di luce per germogliare, mentre in altri casi ha bisogno di oscurità. 
                Vuoi leggere la storia del seme oppure preferisci agire nel buio?
              </p>
              <Button
                onClick={handleToggleRacconto}
                variant="outline"
                size="default"
                className="bg-white/70 hover:bg-white border-indigo-300 text-indigo-700 hover:text-indigo-800"
                disabled={raccontoLoading}
              >
                {raccontoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : showRacconto ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Nascondi la Storia
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Leggi la Storia del Seme
                  </>
                )}
              </Button>
            </div>

            {showRacconto && (
              <div className="mt-6 pt-6 border-t border-indigo-200">
                {raccontoIntro ? (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-indigo-800 mb-3">
                      📖 Racconto Introduttivo
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {raccontoIntro}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/60 rounded-lg p-4 text-center">
                    <p className="text-gray-600 italic">
                      Il racconto per questo seme è ancora in fase di scrittura... 
                      Ma questo non significa che il tuo viaggio non possa iniziare nel mistero! 🌟
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.fase === 'prima'
                    ? 'bg-amber-50 shadow-sm border border-amber-200'
                    : 'bg-green-50 shadow-sm border border-green-200'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="mb-3 pb-2 border-b border-gray-200">
                    <h4 className={`text-sm font-medium ${
                      message.fase === 'prima' 
                        ? 'text-amber-700' 
                        : 'text-green-700'
                    }`}>
                      {message.fase === 'prima' 
                        ? '🔍 Eco di ascolto di Prometheus' 
                        : '✨ Risposta simbolica completa'
                      }
                    </h4>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap leading-relaxed">
                  {Array.isArray(message.content)
                    ? message.content.map((line, i) => <p key={i}>{line}</p>) 
                    : message.content}
                </div>
                
                {message.type === 'assistant' && message.eco && message.eco.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Eco Simbolico</h4>
                    <ul className="space-y-1">
                      {message.eco.map((eco, i) => (
                        <li key={i} className={`text-sm font-medium ${
                          message.fase === 'prima' ? 'text-amber-700' : 'text-green-700'
                        } italic`}>
                          🌟 {eco}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.type === 'assistant' && message.fase === 'prima' && message.fraseFinale && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <h4 className="text-sm font-medium text-amber-700 mb-2">Domanda di Prometheus</h4>
                    <p className="text-sm font-medium text-amber-800 italic">
                      {message.fraseFinale}
                    </p>
                  </div>
                )}

                {message.type === 'assistant' && message.fase === 'seconda' && message.fraseFinale && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h4 className="text-sm font-medium text-green-700 mb-2">Frase Conclusiva</h4>
                    <p className="text-base font-medium text-green-800 italic text-center">
                      &quot;{message.fraseFinale}&quot;
                    </p>
                  </div>
                )}
                
                <div className="mt-2 text-xs opacity-60">
                  {message.timestamp.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-gray-600">Prometheus sta riflettendo...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700 text-sm font-medium flex items-center">
                <XCircle className="w-4 h-4 mr-2" />
                Errore: {error}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className={`sticky bottom-4 shadow-lg ${fase === 'completato' ? 'opacity-75' : ''}`}>
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={getPlaceholder()}
                className="flex-1 min-h-[100px] resize-none border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                disabled={loading || fase === 'completato'}
              />
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || loading || fase === 'completato'}
                  className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
                  variant="default"
                  size="default"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : fase === 'completato' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {fase === 'completato' 
                ? 'Capitolo completato. Puoi ricominciare con "Ricomincia" o esplorare altri semi.'
                : 'Premi Invio per inviare, Shift+Invio per andare a capo'
              }
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 p-6">
          <p 
            className="text-lg font-medium italic"
            style={{ color: selected.sigillo.colore }}
          >
            &quot;{selected.frase_finale}&quot;
          </p>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}