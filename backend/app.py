import os
import json
import re
import requests
import time
import uuid
from typing import List, Optional, Dict, Any, Union
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from supabase import create_client, Client as SupabaseClient # Supabase import

from contextlib import asynccontextmanager

# Carica le variabili d'ambiente dal file .env
load_dotenv()

# --- Modelli Pydantic per la validazione delle richieste e delle risposte ---

class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    seme_id: str
    interaction_number: int
    user_input: str
    history: List[List[Union[str, List[str]]]] = []
    is_eco_request: bool = False
    last_assistant_question: Optional[str] = None

class SigilloData(BaseModel):
    simbolo_dominante: str
    immagine: str
    colore: str
    forma: str
    codice_sigillo: str

class ChatResponse(BaseModel):
    output: Union[str, List[str]]
    eco: List[str]
    frase_finale: str
    sigillo: Optional[SigilloData] = None

class ImageGenerationRequest(BaseModel):
    prompt: str
    titolo: Optional[str] = None
    autore: Optional[str] = None

# Configurazione API di Google Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GOOGLE_API_KEY}"

# Supabase Client Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[ERROR_CRITICAL] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.")
    # Potresti voler sollevare un'eccezione qui o gestire diversamente la mancanza di configurazione
    supabase_client: Optional[SupabaseClient] = None
else:
    supabase_client: Optional[SupabaseClient] = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("[INFO] Supabase client initialized.")


# Questo dizionario conterrà tutti i dati dei semi per un accesso rapido e coerente
SEMI_DATA: Dict[str, Any] = {}

# Data store in-memory per i risultati dei task in background
task_results: Dict[str, Dict[str, Any]] = {}

def create_session_with_retry():
    """
    Crea una sessione di requests con una strategia di retry per gestire errori temporanei.
    """
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

def process_chat_request_background(req: ChatRequest, task_id: str):
    """
    Questa funzione esegue la logica pesante (chiamata a Gemini) in background.
    Al termine, aggiorna il dizionario `task_results` con il risultato o l'errore.
    """
    try:
        # Recupera i dati del seme corrente dal SEMI_DATA caricato
        current_seme_info = SEMI_DATA.get(req.seme_id)
        if not current_seme_info:
            raise HTTPException(status_code=400, detail=f"Seme con ID '{req.seme_id}' non trovato.")

        is_last_interaction_for_normal_seme = False
        if req.seme_id != "sem_99" and req.interaction_number == 1:
            is_last_interaction_for_normal_seme = True

        # --- LOGICA PER SEME 99 (Il Flusso Senza Fine) ---
        if req.seme_id == "sem_99" and req.is_eco_request:
            # ... (la logica per sem_99 va qui, come prima)
            # Per ora, la omettiamo e ci concentriamo sul flusso principale
            pass

        # --- LOGICA PER ALTRI SEMI (sem_01 a sem_24) ---
        previous_user_input = req.history[-1][1] if req.history and req.history[-1][0] == "user" else req.user_input
        prometheus_first_output_content = ""
        if req.history and req.history[0][0] == "assistant" and len(req.history[0]) > 1:
            first_assistant_msg_content = req.history[0][1]
            if isinstance(first_assistant_msg_content, list):
                prometheus_first_output_content = "\n".join(first_assistant_msg_content)
            else:
                prometheus_first_output_content = first_assistant_msg_content

        fallback_frase_finale_initial = 'Quale voce antica sussurra nel silenzio tra un passo e l\'altro?'
        fallback_frase_finale_intermediate = 'La tua domanda precedente non è stata fornita.'
        prompt_log_type_suffix = f"interaction_{req.interaction_number}"
        prompt = "" # Inizializza prompt

        if req.interaction_number == 0:
            prompt = f"""...""" # Prompt per la prima interazione
        elif is_last_interaction_for_normal_seme:
            prompt = f"""...""" # Prompt per l'ultima interazione
            prompt_log_type_suffix = "final_normal_interaction"
        else:
            prompt = f"""...""" # Prompt per interazioni intermedie

        # Riempire i prompt qui con il contenuto completo originale
        if req.interaction_number == 0: # Prima interazione per un seme normale
            prompt = f"""
**Ruolo:** Sei un'eco simbolica di Prometheus, un riflettore di paesaggi interiori. Il tuo compito è trasformare le parole dell'utente in un'immagine che rivela la sua esperienza profonda, stimolando l'auto-scoperta.

Tema: {req.seme_id} - {current_seme_info['nome']}
Input dell'utente: {req.user_input}

**Processo:**
1. Ascolta attentamente l'Input dell'utente e cogli il suo nucleo emotivo, le sue tensioni interiori e gli **elementi specifici della sua narrazione**.
2. Genera una o due **immagini metaforiche e profondamente simboliche**, contenute in frasi fluide, per il campo "output". Queste immagini devono essere evocative e **risuonare direttamente con gli elementi chiave dell'Input dell'utente**, non essere descrizioni generiche o astratte. Ad esempio, se l'utente parla di amicizia e riunione, l'immagine potrebbe evocare un legame riannodato o un cammino condiviso che riprende. Se parla di un luogo specifico, integrare quel luogo nella metafora.
3. Per il campo "eco", genera **un breve e conciso 'eco'** basato su una parola chiave o un concetto emotivo chiave estratto direttamente dall'Input dell'utente o dall'essenza della sua storia. Deve essere una singola frase.
4. Il linguaggio deve essere poetico ma accessibile, non eccessivamente criptico.
5. La "frase_finale" deve essere una **domanda aperta e profonda** che emerga direttamente dalle immagini create e inviti l'utente all'auto-riflessione sul significato personale. Deve terminare con un punto interrogativo.

**FORMATO DI RISPOSTA OBBLIGATORIO: Devi rispondere UNICAMENTE con un oggetto JSON valido e completo, senza alcun testo aggiuntivo prima o dopo. Assicurati che tutte le stringhe siano racchiuse tra doppi apici e le liste siano correttamente formattate.**

JSON:
{{{{
    "output": ["una o due immagini simboliche ancorate all'input dell'utente, come un'eco che riflette la sua storia specifica e i suoi elementi chiave. Se è una sola frase, può essere direttamente la stringa."],
    "eco": ["un breve e conciso 'eco' basato su una parola chiave o un concetto emotivo chiave dall'input dell'utente, in una singola frase."],
    "frase_finale": "domanda specifica che stimola l'auto-riflessione e termina con un punto interrogativo?"
}}}}
"""
        elif is_last_interaction_for_normal_seme: # Ultima interazione per un seme normale
            prompt = f"""
**Ruolo:** Continua il tuo ruolo di specchio simbolico. Il tuo compito è tessere la narrazione dell'utente, unendo le sue riflessioni precedenti con le nuove consapevolezze, creando un'immagine finale che suggelli il suo viaggio interiore.

Tema: {req.seme_id} - {current_seme_info['nome']}
Prima Riflessione Utente (originale): {previous_user_input}
Domanda di Prometheus (dopo la prima riflessione): {req.last_assistant_question if req.last_assistant_question else fallback_frase_finale_initial}
Risposta Utente (attuale): {req.user_input}
Contesto simbolico precedente (risposta di Prometheus fase 1): {prometheus_first_output_content}

**Processo per la "Risposta Simbolica Completa":**
1. **Apertura:** Inizia con una frase suggestiva che riconosca il progresso o la trasformazione in atto, legandosi al tema del seme.
2. **Tessitura Simbolica (10-12 frasi):**
    * Crea un testo poetico che sia una profonda metafora del percorso dell'utente.
    * **Tono:** Evita descrizioni didascaliche. Invece di affermare, suggerisci con immagini.
    * **Integrazione:** Integra fluentemente gli elementi chiave emersi dalle interazioni: la **scelta originaria**, il **rimpianto iniziale**, la **scoperta inaspettata di competenze/interessi**, e il **senso di felicità/adeguatezza attuale**.
    * Mostra come il "gesto non fatto" o il "sentiero deviato" abbia, paradossalmente, condotto a un arricchimento interiore e fornito strumenti per il futuro.
    * Concentrati sulla trasformazione, sulla rivelazione, sulla ricomposizione di ciò che sembrava rotto.
    * Lascia spazio al non detto, alla suggestione, permettendo all'utente di riempire gli spazi con la propria interpretazione.
3. **Eco Simbolico finale (singola frase):** Genera una frase molto breve e densa che sia l'apice simbolico di tutto il percorso. Deve essere profonda e riassumere l'essenza della rivelazione. **Esempio:** "Il sentiero che sembrava deviare, ora si rivela il filo nascosto della tua tessitura interiore."
4. **Frase Conclusiva (poetica):** Chiudi il cerchio con una frase finale che sia essa stessa un'immagine potente e che suggelli il significato del viaggio fin qui, guardando avanti con saggezza. Deve essere **altamente evocativa e simbolica**, non una semplice affermazione. **Esempio:** "Ogni deviazione ha inciso una runa sul tuo cammino: ora sai leggerne il senso." NON deve terminare con un punto interrogativo.
5. **Generazione Sigillo:** Genera i dati per il "sigillo" finale per questo seme, che verrà incluso nella risposta.

**FORMATO DI RISPOSTA OBBLIGATORIO: Devi rispondere UNICAMENTE con un oggetto JSON valido e completo, senza alcun testo aggiuntivo prima o dopo. Assicurati che tutte le stringhe siano racchiuse tra doppi apici e le liste siano correttamente formattate.**

JSON:
{{{{
    "output": "testo poetico simbolo del percorso dell'utente (singola stringa fluida, composta da circa 10-12 frasi, evocativa, non didascalica)",
    "eco": ["eco simbolico finale (singola frase densa di significato)"],
    "frase_finale": "un titolo conciso, evocativo e poetico per il 'output' precedente, presentato come una singola frase dichiarativa (non una domanda)",
    "sigillo": {{{{
        "simbolo_dominante": "emoji",
        "immagine": "descrizione immagine metaforica",
        "colore": "#XXXXXX",
        "forma": "forma del sigillo",
        "codice_sigillo": "CODICE-ESEMPIO"
    }}}}
}}}}
"""
        else: # Seconda (o intermedia se avessi più di 2 interazioni totali) interazione per un seme normale
            prompt = f"""
**Ruolo:** Continua il tuo ruolo di eco simbolica di Prometheus, riflettendo i paesaggi interiori. Il tuo compito è rispondere all'ultima riflessione dell'utente, mantenendo il tono poetico e stimolando una ulteriore auto-scoperta.

Tema: {req.seme_id} - {current_seme_info['nome']}
Contesto precedente (ultima interazione di Prometheus): {prometheus_first_output_content}
Domanda precedente di Prometheus: {req.last_assistant_question if req.last_assistant_question else fallback_frase_finale_intermediate}
Nuova riflessione dell'utente: {req.user_input}

**Processo:**
1. Genera una risposta "output" che sia un'immagine metaforica o una breve riflessione poetica, che riprenda il tema della nuova riflessione dell'utente e la connetta al contesto del seme. Non dare risposte dirette o soluzioni. Mantieni il mistero.
2. Genera un "eco" breve e conciso, una singola frase.
3. La "frase_finale" deve essere una nuova domanda aperta e profonda che stimoli l'utente a un'ulteriore riflessione, mantenendo il dialogo con il seme. Deve terminare con un punto interrogativo.

**FORMATO DI RISPOSTA OBBLIGATORIO: Devi rispondere UNICAMENTE con un oggetto JSON valido e completo, senza alcun testo aggiuntivo prima o dopo. Assicurati che tutte le stringhe siano racchiuse tra doppi apici e le liste siano correttamente formattate.**

JSON:
{{{{
    "output": "immagine metaforica o riflessione poetica (singola stringa)",
    "eco": ["eco breve e conciso"],
    "frase_finale": "nuova domanda stimolante che termina con un punto interrogativo?"
}}}}
"""

        gemini_prompt_log_type = f"gemini_prompt_{prompt_log_type_suffix}"

        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.88, "topP": 0.9, "maxOutputTokens": 700}}
        session = create_session_with_retry()
        response = session.post(GEMINI_URL, headers={"Content-Type": "application/json"}, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("candidates") or not data["candidates"][0].get("content"):
            raise HTTPException(status_code=500, detail="Risposta API incompleta o malformata da Gemini.")

        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Aggiungo qui la funzione che prima non trovavo, mi scuso per l'errore
        def extract_json_from_text(text: str) -> Dict[str, Any]:
            """
            Estrae il primo oggetto JSON valido trovato in una stringa di testo.
            Utile per pulire le risposte delle API che potrebbero includere testo extra.
            """
            # Cerca l'inizio di un oggetto JSON
            json_start_match = re.search(r'{\s*".*?"\s*:', text)
            if not json_start_match:
                return {} # Nessun JSON trovato

            json_start_index = json_start_match.start()

            # Prova a decodificare il JSON dalla posizione trovata
            try:
                # La libreria json può gestire spazi bianchi extra alla fine
                return json.loads(text[json_start_index:])
            except json.JSONDecodeError:
                # Se fallisce, potrebbe essere un JSON incompleto. Tentiamo un approccio più robusto
                # cercando di bilanciare le parentesi graffe.
                open_braces = 0
                for i, char in enumerate(text[json_start_index:]):
                    if char == '{':
                        open_braces += 1
                    elif char == '}':
                        open_braces -= 1

                    if open_braces == 0 and i > 0:
                        try:
                            return json.loads(text[json_start_index : json_start_index + i + 1])
                        except json.JSONDecodeError:
                            continue # Continua a cercare una fine valida

            return {} # Se tutti i tentativi falliscono

        parsed = extract_json_from_text(text)
        
        # ... (Logica di parsing e costruzione della risposta come prima) ...
        output = parsed.get("output", text)
        eco = parsed.get("eco", [])
        frase_finale = parsed.get("frase_finale", "")
        final_sigillo_data = None
        if is_last_interaction_for_normal_seme and parsed.get("sigillo"):
            final_sigillo_data = SigilloData(**parsed["sigillo"])

        chat_response_data = ChatResponse(output=output, eco=eco, frase_finale=frase_finale, sigillo=final_sigillo_data).dict()
        task_results[task_id] = {"status": "completed", "data": chat_response_data}

    except Exception as e:
        print(f"[BACKGROUND_TASK_ERROR] Errore nel task {task_id}: {e}")
        error_detail = str(e.detail) if isinstance(e, HTTPException) else str(e)
        status_code = e.status_code if isinstance(e, HTTPException) else 500
        if isinstance(e, requests.exceptions.Timeout):
            error_detail = "Il servizio AI ha impiegato troppo tempo a rispondere."
            status_code = 504
        task_results[task_id] = {"status": "failed", "error": error_detail, "status_code": status_code}


def load_semi_data():
    """Carica i dati dei semi dal file JSON nel dizionario globale."""
    global SEMI_DATA
    try:
        # Assumiamo che 'semi_data.json' si trovi nella stessa directory di 'app.py'
        # In un contesto di container o deploy, assicurati che il path sia corretto.
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, 'semi_data.json')

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Trasforma la lista di semi in un dizionario per accesso rapido
            SEMI_DATA = {seme['id']: seme for seme in data}
        print(f"[INFO] Dati dei semi caricati con successo da {file_path}. {len(SEMI_DATA)} semi disponibili.")
    except FileNotFoundError:
        print(f"[ERROR_CRITICAL] Il file 'semi_data.json' non è stato trovato nel percorso: {file_path}")
        SEMI_DATA = {} # Assicura che SEMI_DATA sia un dizionario vuoto in caso di errore
    except json.JSONDecodeError:
        print(f"[ERROR_CRITICAL] Errore di decodifica JSON nel file 'semi_data.json'.")
        SEMI_DATA = {}
    except Exception as e:
        print(f"[ERROR_CRITICAL] Un errore imprevisto è occorso durante il caricamento di semi_data.json: {e}")
        SEMI_DATA = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestore del ciclo di vita dell'applicazione.
    Carica i dati all'avvio e li mantiene disponibili per tutta la durata dell'app.
    """
    print("[INFO] Avvio dell'applicazione in corso...")
    # Carica i dati dei semi all'avvio
    load_semi_data()
    # Logica di startup completata, l'applicazione può iniziare a gestire le richieste
    yield
    # Qui andrebbe la logica di shutdown, se necessaria (es. pulizia, chiusura connessioni)
    print("[INFO] Spegnimento dell'applicazione.")


# Inizializzazione dell'applicazione FastAPI
app = FastAPI(lifespan=lifespan)

# Configurazione CORS più sicura per la produzione
# In produzione, usa la variabile d'ambiente FRONTEND_URL o consenti tutti gli origini in sviluppo
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allow_origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint principale della chat (ora asincrono)
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "processing"}

    # Avvia il task in background
    background_tasks.add_task(process_chat_request_background, req, task_id)

    # Restituisci immediatamente il task_id
    return JSONResponse(
        content={"task_id": task_id, "message": "La richiesta è in elaborazione."},
        status_code=202
    )

@app.get("/api/get-task-result/{task_id}")
async def get_task_result(task_id: str):
    result = task_results.get(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task non trovato.")

    if result["status"] == "completed":
        # Rimuovi il risultato dopo averlo letto per pulizia
        final_data = result.get("data")
        task_results.pop(task_id, None)
        return JSONResponse(content={"status": "completed", "data": final_data})

    elif result["status"] == "failed":
        error_info = {
            "status": "failed",
            "error": result.get("error", "Errore sconosciuto."),
            "status_code": result.get("status_code", 500)
        }
        task_results.pop(task_id, None)
        return JSONResponse(content=error_info, status_code=error_info["status_code"])

    else: # status == "processing"
        return JSONResponse(content={"status": "processing"}, status_code=200)

# Endpoint per il controllo dello stato di salute del servizio
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "3.5"} # Versione aggiornata per i Sigilli

# Endpoint per la root
@app.get("/")
def root():
    return {"message": "Prometheus API - Versione 3.5"}

@app.post("/api/generate_image")
async def generate_image(req: ImageGenerationRequest):
    try:
        # Configurazione per la generazione dell'immagine
        prompt = f"Create a book cover image for: {req.prompt}"
        if req.titolo:
            prompt += f"\nTitle: {req.titolo}"
        if req.autore:
            prompt += f"\nAuthor: {req.autore}"
        
        # Chiamata all'API di Gemini per la generazione dell'immagine
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.9,
                "topP": 0.95,
                "maxOutputTokens": 2048
            }
        }

        session = create_session_with_retry()
        response = session.post(GEMINI_URL, json=payload)
        
        if not response.ok:
            raise HTTPException(status_code=response.status_code, detail="Errore nella generazione dell'immagine")

        data = response.json()
        
        # Estrai l'immagine base64 dalla risposta
        try:
            image_data = data["candidates"][0]["content"]["parts"][0]["text"]
            # Assicurati che l'immagine sia in formato base64
            if not image_data.startswith("data:image"):
                raise ValueError("Formato immagine non valido")
            
            # Estrai solo la parte base64
            base64_data = image_data.split(",")[1]
            return {"images": [base64_data]}
        except (KeyError, IndexError, ValueError) as e:
            raise HTTPException(status_code=500, detail=f"Errore nell'elaborazione dell'immagine: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella generazione dell'immagine: {str(e)}")