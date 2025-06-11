import os
import json
import re
import requests
import time
from typing import List, Optional, Dict, Any, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from supabase import create_client, Client as SupabaseClient # Supabase import

from contextlib import asynccontextmanager

# Carica le variabili d'ambiente dal file .env
load_dotenv()

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

# Modelli Pydantic per la validazione dei dati in ingresso e in uscita
class SigilloData(BaseModel):
    simbolo_dominante: str
    immagine: str
    colore: str
    forma: str
    codice_sigillo: str

class ChatRequest(BaseModel):
    user_input: str
    seme_id: str
    history: Optional[List[List[str]]] = [] # List of [type, content_string]
    is_first_interaction: Optional[bool] = True
    last_assistant_question: Optional[str] = None # Per passare la domanda precedente di Prometheus
    interaction_number: Optional[int] = 0 # 0 per prima interazione, poi 1, 2...
    is_eco_request: Optional[bool] = False # True se la richiesta è per generare l'eco di sem_99

    # New fields for logging
    session_id: str # UUID as string
    user_id: str    # UUID as string (ideally from auth, passed by frontend proxy)

class ChatResponse(BaseModel):
    output: Union[str, List[str]]
    eco: List[str]
    frase_finale: str # Questa ora può essere la domanda successiva o la frase finale del sigillo
    sigillo: Optional[SigilloData] = None # Per includere i dati del sigillo

class ImageGenerationRequest(BaseModel):
    prompt: str
    titolo: Optional[str] = None
    autore: Optional[str] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data on startup
    global SEMI_DATA
    try:
        # Assicurati che il percorso sia corretto per l'ambiente Render
        # Se 'semi_data.json' è nella root del progetto (stessa dir di app.py), il path è corretto
        # Se il disco in render.yaml monta in /opt/render/project/src/ e app.py è lì,
        # il path relativo 'semi_data.json' dovrebbe funzionare.
        # Altrimenti, potrebbe essere necessario un path assoluto come '/opt/render/project/src/semi_data.json'
        # o verificare la current working directory di Render.
        # Per ora, assumiamo che 'semi_data.json' sia accessibile direttamente.
        file_path = 'semi_data.json'
        # Per testare localmente potresti voler specificare un path, es:
        # file_path = os.path.join(os.path.dirname(__file__), 'semi_data.json')

        with open(file_path, 'r', encoding='utf-8') as f:
            semi_list = json.load(f)
            SEMI_DATA = {seme['id']: seme for seme in semi_list}
        print("[INFO] Dati semi caricati con successo da semi_data.json durante lo startup.")
    except FileNotFoundError:
        print(f"[ERROR] {file_path} non trovato durante lo startup.")
        print("Usando dati di fallback limitati per sem_99. L'applicazione potrebbe non funzionare correttamente.")
        SEMI_DATA = {
            "sem_99": {
                "id": "sem_99",
                "nome": "L'Eco Universale (Fallback)",
                "frase_finale": "La verità si manifesta nella scrittura libera (Fallback).",
                "sigillo": {
                    "simbolo_dominante": "❓",
                    "immagine": "Un sigillo di fallback dovuto a dati mancanti.",
                    "colore": "#AAAAAA",
                    "forma": "quadrato",
                    "codice_sigillo": "SIG-FB-99"
                }
            },
        }
    except json.JSONDecodeError:
        print(f"[ERROR] Errore di parsing in {file_path} durante lo startup. Controlla il formato JSON.")
        print("L'applicazione potrebbe non funzionare correttamente.")
        SEMI_DATA = {}
    yield
    # Clean up resources if any
    print("[INFO] Applicazione in chiusura.")

# Helper function to log interactions to Supabase
_interaction_step_counter: Dict[str, int] = {} # In-memory counter for steps per session_id

def log_interaction_to_db(
    user_id: str,
    session_id: str,
    seed_archetype_id: str,
    interaction_type: str,
    interaction_data: Dict[str, Any], # Renamed from payload_data for clarity
    seed_title_generated: Optional[str] = None
):
    global _interaction_step_counter
    if not supabase_client:
        print(f"[ERROR_DB_LOG] Supabase client not initialized. Skipping DB log for type: {interaction_type}")
        # Fallback to print if Supabase client is not available
        print(f"[FALLBACK_LOGGING] User: {user_id}, Session: {session_id}, Seed: {seed_archetype_id}, Type: {interaction_type}, Data: {interaction_data}, Title: {seed_title_generated}")
        return

    # Manage interaction step: increment for each new log within a session
    current_step = _interaction_step_counter.get(session_id, 0) + 1
    _interaction_step_counter[session_id] = current_step

    try:
        log_entry = {
            "user_id": user_id,
            "session_id": session_id,
            "seed_archetype_id": seed_archetype_id,
            "interaction_step": current_step, # Use the counter
            "interaction_type": interaction_type,
            "data": interaction_data,
            "seed_title_generated": seed_title_generated
        }
        print(f"[DB_LOG_ATTEMPT] Logging to Supabase: {log_entry}") # Debug print before insert
        response = supabase_client.table("raw_seed_interactions").insert(log_entry).execute()
        if response.data:
            print(f"[DB_LOG_SUCCESS] Interaction logged successfully for type: {interaction_type}, session: {session_id}, step: {current_step}")
        else: # Changed to check response.error based on typical Supabase-py patterns
            # Supabase-py v2 might have response.error
            error_info = getattr(response, 'error', 'Unknown error structure')
            print(f"[ERROR_DB_LOG] Failed to log interaction to Supabase for type: {interaction_type}. Response: {error_info}")

    except Exception as e:
        print(f"[ERROR_DB_LOG] Exception during Supabase insert for type: {interaction_type}: {e}")
        # Fallback to print on exception
        print(f"[FALLBACK_LOGGING_EXCEPTION] User: {user_id}, Session: {session_id}, Seed: {seed_archetype_id}, Type: {interaction_type}, Data: {interaction_data}, Title: {seed_title_generated}, Step: {current_step}")


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

# Funzione per creare una sessione HTTP con strategia di retry
def create_session_with_retry():
    session = requests.Session()
    retry_strategy = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# Funzione per estrarre l'oggetto JSON da una stringa potenzialmente contenente testo extra
def extract_json_from_text(text: str) -> Dict[str, Any]:
    try:
        json_start = text.find('{')
        json_end = text.rfind('}')
        if json_start == -1 or json_end == -1:
            raise ValueError("No JSON object found in text.")

        json_string = text[json_start : json_end + 1]
        parsed_json = json.loads(json_string)

        # Assicurati che 'output' sia gestito come stringa o lista
        output = parsed_json.get("output", "")
        if isinstance(output, list) and len(output) == 0:
            parsed_json["output"] = ""
        elif isinstance(output, list) and len(output) == 1:
            # Se è una lista di un solo elemento, convertilo in stringa per coerenza con il frontend
            parsed_json["output"] = output[0]
        
        # Assicurati che 'eco' sia una lista
        eco = parsed_json.get("eco", [])
        if not isinstance(eco, list):
            parsed_json["eco"] = [str(eco)] if eco else []

        # Aggiungi gestione per 'sigillo'
        sigillo = parsed_json.get("sigillo")
        if sigillo and not isinstance(sigillo, dict):
            # Se il sigillo non è un dizionario, prova a parsarlo o rendilo None
            try:
                sigillo = json.loads(sigillo)
            except (json.JSONDecodeError, TypeError):
                sigillo = None
        parsed_json["sigillo"] = sigillo


        return parsed_json
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[ERROR] JSON extraction failed: {e}")
        print(f"Original text causing error: {text}")
        
        # Fallback manuale con regex se l'estrazione JSON standard fallisce
        output_match = re.search(r'"output":\s*("([^"]*)"|\[(.*?)\])', text, re.DOTALL)
        eco_match = re.search(r'"eco":\s*\[(.*?)\]', text, re.DOTALL)
        frase_match = re.search(r'"frase_finale":\s*"([^"]*)"', text, re.DOTALL)
        sigillo_match = re.search(r'"sigillo":\s*({.*?})', text, re.DOTALL) # Regex per sigillo

        extracted_output = ""
        if output_match:
            if output_match.group(2): # Caso singola stringa
                extracted_output = output_match.group(2)
            elif output_match.group(3): # Caso lista di stringhe
                try:
                    list_content = f"[{output_match.group(3)}]"
                    parsed_list = json.loads(list_content)
                    if isinstance(parsed_list, list):
                        extracted_output = parsed_list
                except json.JSONDecodeError:
                    extracted_output = output_match.group(3).strip() 

        eco_list = []
        if eco_match:
            try:
                raw_eco_content = f"[{eco_match.group(1).strip()}]"
                parsed_eco = json.loads(raw_eco_content)
                if isinstance(parsed_eco, list):
                    eco_list = parsed_eco
            except json.JSONDecodeError:
                eco_content = eco_match.group(1).strip().strip('"')
                if eco_content:
                    eco_list = [eco_content]
        
        extracted_sigillo = None
        if sigillo_match:
            try:
                extracted_sigillo = json.loads(sigillo_match.group(1))
            except json.JSONDecodeError:
                pass # Non riusciamo a parsare il sigillo, resta None

        return {
            "output": extracted_output if extracted_output else text.strip()[:300],
            "eco": eco_list,
            "frase_finale": frase_match.group(1) if frase_match else "",
            "sigillo": extracted_sigillo # Aggiunto il sigillo nel fallback
        }

# Funzione per creare risposte di fallback in caso di errori dell'API o di connettività
def create_fallback_response(req: ChatRequest, error_msg: str) -> ChatResponse:
    print(f"[FALLBACK] Creating fallback response due to: {error_msg}")
    
    seme_data_from_json = SEMI_DATA.get(req.seme_id, {})
    
    # Fallback per il Seme 99
    if req.seme_id == "sem_99":
        fallback_sigillo = SigilloData(
            simbolo_dominante=seme_data_from_json.get("sigillo", {}).get("simbolo_dominante", "🕳️"),
            immagine=seme_data_from_json.get("sigillo", {}).get("immagine", "Un eco che si propaga in un vuoto sereno."),
            colore=seme_data_from_json.get("sigillo", {}).get("colore", "#C0C0C0"),
            forma=seme_data_from_json.get("sigillo", {}).get("forma", "cerchio perfetto"),
            codice_sigillo=seme_data_from_json.get("sigillo", {}).get("codice_sigillo", "SIG-FB-99")
        )
        return ChatResponse(
            output="", # Nessun output principale per sem_99
            eco=["Un'eco silenziosa risuona nel tuo scritto (Fallback).", "Le parole si fanno paesaggio (Fallback)."],
            frase_finale=seme_data_from_json.get("frase_finale", "Ogni traccia, una via (Fallback)."),
            sigillo=fallback_sigillo
        )
    # Fallback per gli altri semi (logica leggermente semplificata rispetto alla precedente ma funzionale)
    else:
        # Se è l'ultima interazione, cerca di fornire un sigillo di fallback
        final_sigillo = None
        # Assumiamo MAX_INTERACTIONS = 2 per i semi normali (0 e 1).
        # Quindi req.interaction_number == 1 indica l'ultima interazione.
        if req.interaction_number >= 1: # Se è la seconda interazione o oltre
            final_sigillo = SigilloData(
                simbolo_dominante=seme_data_from_json.get("sigillo", {}).get("simbolo_dominante", "🌟"),
                immagine=seme_data_from_json.get("sigillo", {}).get("immagine", "Un orizzonte che si svela, un nuovo inizio (Fallback)."),
                colore=seme_data_from_json.get("sigillo", {}).get("colore", "#FFCC00"),
                forma=seme_data_from_json.get("sigillo", {}).get("forma", "spirale ascendente"),
                codice_sigillo=seme_data_from_json.get("sigillo", {}).get("codice_sigillo", "SIG-FB-END")
            )
            return ChatResponse(
                output="Due correnti si incontrano alla confluenza del divenire (Fallback).",
                eco=["Il coraggio che abbraccia il dubbio (Fallback)"],
                frase_finale=seme_data_from_json.get("frase_finale", "Così scorre il fiume del cambiamento, oltre ogni mappa e confine (Fallback)."),
                sigillo=final_sigillo
            )
        else: # Prima interazione
            return ChatResponse(
                output="Un ponte sospeso nel buio, le assi scricchiolano sotto passi incerti (Fallback).",
                eco=["Il richiamo del sentiero ignoto (Fallback)"],
                frase_finale="Quale voce antica sussurra nel silenzio tra un passo e l'altro (Fallback)?",
                sigillo=None
            )

# Endpoint principale della chat
@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    # Log initial user input for this interaction number
    user_input_log_type = f"user_input_{req.interaction_number}"
    log_interaction_to_db(
        user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
        interaction_type=user_input_log_type, interaction_data={'text': req.user_input}
    )

    # Recupera i dati del seme corrente dal SEMI_DATA caricato
    current_seme_info = SEMI_DATA.get(req.seme_id)
    if not current_seme_info:
        # Se il seme non esiste nel tuo semi_data.json, è un errore grave o un ID non valido
        raise HTTPException(status_code=400, detail=f"Seme con ID '{req.seme_id}' non trovato.")

    # Determina se è l'ultima interazione per un seme non-99
    # ASSUNZIONE: Il frontend invia interaction_number come il numero corrente di interazioni complete (0 per prima, 1 per la seconda, etc.)
    # e MAX_INTERACTIONS = 2 per i semi normali (quindi la seconda interazione è l'ultima).
    is_last_interaction_for_normal_seme = False
    if req.seme_id != "sem_99" and req.interaction_number == 1: # Assumendo 2 interazioni totali (0 e 1)
        is_last_interaction_for_normal_seme = True

    # --- LOGICA PER SEME 99 (Il Flusso Senza Fine) ---
    if req.seme_id == "sem_99" and req.is_eco_request:
        prompt_99 = f"""
        **Ruolo:** Sei un'eco silenziosa e un custode di simboli. Analizza il testo fornito dall'utente.
        **Compito:**
        1. Genera una singola frase poetica e introspettiva che risuoni con il tono e i temi principali del testo dell'utente. Questa sarà l'eco.
        2. Genera i dati per un "sigillo" basato sul testo dell'utente. Il sigillo deve includere:
            - `simbolo_dominante`: un emoji che catturi l'essenza (es. ✨, 🌊, 🌳).
            - `immagine`: una breve descrizione metaforica che evochi il sigillo.
            - `colore`: un codice esadecimale di colore rilevante (es. #RRGGBB).
            - `forma`: una forma geometrica o organica.
            - `codice_sigillo`: un codice alfanumerico univoco (es. "SIG-FLUSSO-LIBERO").
        **Input dell'utente:** "{req.user_input}"
        **FORMATO DI RISPOSTA OBBLIGATORIO:** Devi rispondere UNICAMENTE con un oggetto JSON valido e completo, senza alcun testo aggiuntivo prima o dopo.

        JSON:
        {{{{
            "output": "",
            "eco": ["la singola frase poetica di eco"],
            "frase_finale": "{current_seme_info.get('frase_finale', 'La verità si manifesta nella scrittura libera.')}",
            "sigillo": {{{{
                "simbolo_dominante": "emoji",
                "immagine": "descrizione immagine metaforica",
                "colore": "#XXXXXX",
                "forma": "forma del sigillo",
                "codice_sigillo": "CODICE-ESEMPIO"
            }}}}
        }}}}
        """
        # Log Gemini prompt for Seme 99
        gemini_prompt_log_type_99 = "gemini_prompt_eco_99"
        log_interaction_to_db(
            user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
            interaction_type=gemini_prompt_log_type_99,
            interaction_data={'prompt': prompt_99.strip()} # Store full prompt
        )

        payload = {
            "contents": [
                {"parts": [{"text": prompt_99}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "maxOutputTokens": 300
            }
        }
        
        session = create_session_with_retry()
        try:
            response = session.post(GEMINI_URL, headers={"Content-Type": "application/json"}, json=payload, timeout=45)
            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"[DEBUG] Risposta raw da Gemini (Seme 99): {text}")

            parsed = extract_json_from_text(text)

            # Log Gemini response for Seme 99
            gemini_response_log_type_99 = "gemini_response_eco_99"
            log_data_99 = {
                "raw_response": text, "parsed_output": parsed.get("output"), "parsed_eco": parsed.get("eco"),
                "parsed_frase_finale": parsed.get("frase_finale"), "sigillo": parsed.get("sigillo")
            }
            log_interaction_to_db(
                user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
                interaction_type=gemini_response_log_type_99, interaction_data=log_data_99,
                seed_title_generated=parsed.get('frase_finale')
            )
            
            # Se l'AI non genera un sigillo valido, usiamo quello dal SEMI_DATA
            final_sigillo_data = parsed.get("sigillo")
            if not final_sigillo_data and current_seme_info and "sigillo" in current_seme_info:
                    final_sigillo_data = SigilloData(**current_seme_info["sigillo"])

            return ChatResponse(
                output="",
                eco=parsed.get("eco", []),
                frase_finale=parsed.get("frase_finale", current_seme_info.get('frase_finale', "La verità si manifesta nella scrittura libera.")),
                sigillo=final_sigillo_data
            )

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Errore API per Seme 99: {e}")
            return create_fallback_response(req, f"Errore API per Seme 99: {e}")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Errore decodifica JSON per Seme 99: {e}")
            return create_fallback_response(req, f"Errore formato risposta Seme 99: {text[:200]}")
        except Exception as e:
            print(f"[ERROR] Errore generico per Seme 99: {e}")
            return create_fallback_response(req, f"Errore imprevisto per Seme 99: {str(e)}")

    # --- LOGICA PER ALTRI SEMI (sem_01 a sem_24) ---
    # Prende l'ultima risposta dell'utente per il contesto
    # Se history è vuota, usa l'input corrente come "precedente" per coerenza con il prompt
    previous_user_input = req.history[-1][1] if req.history and req.history[-1][0] == "user" else req.user_input
    
    # Prende l'output simbolico della prima fase di Prometheus per contesto
    prometheus_first_output_content = ""
    if req.history and req.history[0][0] == "assistant" and len(req.history[0]) > 1:
        first_assistant_msg_content = req.history[0][1]
        if isinstance(first_assistant_msg_content, list):
            prometheus_first_output_content = "\n".join(first_assistant_msg_content)
        else:
            prometheus_first_output_content = first_assistant_msg_content

    # Definisci le stringhe di fallback al di fuori delle espressioni f-string
    fallback_frase_finale_initial = 'Quale voce antica sussurra nel silenzio tra un passo e l\'altro?'
    fallback_frase_finale_intermediate = 'La tua domanda precedente non è stata fornita.'

    # Determina il prompt da inviare a Gemini
    prompt_log_type_suffix = f"interaction_{req.interaction_number}"
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
        # Nota: La specifica "10-12 frasi" era già presente nella descrizione di "Tessitura Simbolica".
        # La modifica qui rinforza che "output" deve seguire quella lunghezza e "frase_finale" è il suo titolo.
        prompt_log_type_suffix = "final_normal_interaction"


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
    


    # Log Gemini prompt
    gemini_prompt_log_type = f"gemini_prompt_{prompt_log_type_suffix}"
    log_interaction_to_db(
        user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
        interaction_type=gemini_prompt_log_type,
        interaction_data={'prompt': prompt.strip()} # Store full prompt
    )

    # Preparazione del payload per Gemini
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.88,
            "topP": 0.9,
            "maxOutputTokens": 700
        }
    }

    session = create_session_with_retry()
    try:
        response = session.post(GEMINI_URL, headers={"Content-Type": "application/json"}, json=payload, timeout=45)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("candidates") or not data["candidates"][0].get("content") or not data["candidates"][0]["content"].get("parts"):
            print(f"[ERROR] Risposta API incompleta o malformata: {data}")
            # Log error response from Gemini if possible
            error_log_data = {"error": "Incomplete or malformed API response", "api_response": data}
            log_interaction_to_db(
                user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
                interaction_type=f"gemini_error_response_{prompt_log_type_suffix}",
                interaction_data=error_log_data
            )
            raise HTTPException(status_code=500, detail="Risposta API incompleta o malformata da Gemini.")

        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"[DEBUG] Risposta raw da Gemini: {text}")
        
        parsed = extract_json_from_text(text)

        # Log Gemini response
        gemini_response_log_type = f"gemini_response_{prompt_log_type_suffix}"
        log_data = {
            "raw_response": text, "parsed_output": parsed.get("output"), "parsed_eco": parsed.get("eco"),
            "parsed_frase_finale": parsed.get("frase_finale"), "sigillo": parsed.get("sigillo")
        }
        title_generated = parsed.get("frase_finale") if is_last_interaction_for_normal_seme else None
        log_interaction_to_db(
            user_id=req.user_id, session_id=req.session_id, seed_archetype_id=req.seme_id,
            interaction_type=gemini_response_log_type, interaction_data=log_data,
            seed_title_generated=title_generated
        )
        
        output = parsed.get("output", text)
        if isinstance(output, list) and len(output) == 0:
            output = "" 
        elif isinstance(output, list) and len(output) == 1:
            output = output[0] # Converti lista di un elemento in stringa

        eco = parsed.get("eco", [])
        if not isinstance(eco, list):
            eco = [str(eco)] if eco else [] 

        frase_finale = parsed.get("frase_finale", "")
        
        # Gestione del sigillo per l'ultima interazione
        final_sigillo_data = None
        if is_last_interaction_for_normal_seme:
            # Se l'AI ha generato un sigillo, usalo. Altrimenti, prendilo dal tuo SEMI_DATA
            if parsed.get("sigillo"):
                try:
                    final_sigillo_data = SigilloData(**parsed["sigillo"])
                except Exception as e:
                    print(f"[WARNING] Sigillo generato da AI malformato: {e}. Usando sigillo da SEMI_DATA.")
            
            # Fallback al sigillo predefinito dal SEMI_DATA se non è stato generato o è malformato
            if not final_sigillo_data and current_seme_info and "sigillo" in current_seme_info:
                final_sigillo_data = SigilloData(**current_seme_info["sigillo"])
        
        return ChatResponse(output=output, eco=eco, frase_finale=frase_finale, sigillo=final_sigillo_data)

    except requests.exceptions.RequestException as e:
        error_detail = ""
        status_code = 500
        if hasattr(e, 'response') and e.response is not None:
            status_code = e.response.status_code
            try:
                error_json = e.response.json()
                error_detail = error_json.get('detail', error_json.get('error', str(e.response.text)))
            except json.JSONDecodeError:
                error_detail = str(e.response.text)
        else:
            error_detail = str(e) # Per errori come timeout o connessione rifiutata
        
        print(f"[ERROR] Errore di richiesta HTTP/API: {e}")
        print(f"[ERROR] Dettagli errore HTTP: {error_detail}")
        raise HTTPException(status_code=status_code, detail=f"Errore di comunicazione con Prometheus: {error_detail}")
    except json.JSONDecodeError as e:
        print(f"[ERROR] Errore di decodifica JSON dalla risposta API: {e}")
        print(f"Testo che ha causato l'errore JSON: {text}") 
        raise HTTPException(status_code=500, detail=f"Prometheus ha risposto in un formato incomprensibile. Contatta l'assistenza. (Dettaglio: {text[:200]}...)")
    except Exception as e:
        print(f"[ERROR] Errore generico nel chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Un errore imprevisto è avvenuto nel cuore di Prometheus: {str(e)}")

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