# Guida allo Sviluppo Locale - Prometheus

## Configurazione Iniziale

### 1. Installazione delle Dipendenze

Le dipendenze sono già state installate automaticamente:
- **Backend**: Python packages installati via `pip install -r backend/requirements.txt`
- **Frontend**: Node.js packages installati via `npm install` nella cartella `frontend/`

### 2. Configurazione delle Variabili d'Ambiente

I file di configurazione esistono già nelle cartelle appropriate:
- `backend/.env` - Variabili per il backend
- `frontend/.env.local` - Variabili per il frontend

**DEVI CONFIGURARE** le seguenti variabili nei file esistenti:

**Backend (`backend/.env`):**
```env
GOOGLE_API_KEY=your_google_api_key_here  # ⚠️ RICHIESTO
FRONTEND_URL=http://localhost:3000
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here      # ⚠️ RICHIESTO
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here  # ⚠️ RICHIESTO
```

#### Come ottenere le chiavi:

**Google API Key (per Gemini AI):**
1. Vai su [Google AI Studio](https://aistudio.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Genera una API Key per Gemini
4. Copia la chiave nel file `backend/.env`

**Supabase Keys:**
1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai in Settings > API
4. Copia `URL` e `anon public` key nel file `frontend/.env.local`

## Avvio dell'Applicazione

### Metodo 1: Script Automatico (Raccomandato)

Esegui il file batch nella root del progetto:
```bash
start-dev.bat
```

Questo avvierà automaticamente:
- Backend su http://localhost:8000
- Frontend su http://localhost:3000

### Metodo 2: Avvio Manuale

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Struttura dell'Applicazione

### Backend (FastAPI)
- **Porta**: 8000
- **File principale**: `backend/app.py`
- **Dipendenze**: `backend/requirements.txt`
- **Dati**: `backend/semi_data.json`

### Frontend (Next.js)
- **Porta**: 3000
- **Configurazione**: `frontend/next.config.mjs`
- **Dipendenze**: `frontend/package.json`
- **Supabase Client**: `frontend/src/lib/supabase/`

## Funzionalità Principali

Secondo la documentazione del progetto (`PROJECT_RAG.md`), l'applicazione include:

1. **Mandala**: Dashboard principale con semi di scrittura
2. **Scrivi**: Interfaccia di chat con AI per creare capitoli
3. **Archivio**: Gestione delle bozze e capitoli creati
4. **Libro**: Visualizzazione e organizzazione del "Libro Vivente"

## Database (Supabase)

L'applicazione utilizza Supabase con le seguenti tabelle principali:
- `capitoli`: Bozze e capitoli creati
- `libro`: Capitoli promossi al libro finale
- Autenticazione utenti gestita da Supabase Auth

## Risoluzione Problemi

### Errori Comuni

1. **Errore 500 Backend**: Verifica che `GOOGLE_API_KEY` sia configurata correttamente
2. **Errore Supabase**: Controlla che le chiavi Supabase siano valide
3. **CORS Errors**: Il backend è configurato per accettare richieste da localhost:3000

### Log e Debug

- **Backend logs**: Visibili nel terminal dove è avviato uvicorn
- **Frontend logs**: Visibili nella console del browser e nel terminal Next.js

## Note di Sviluppo

- Il backend utilizza **polling asincrono** per gestire risposte lunghe dell'AI
- Il frontend usa **Tailwind CSS** e **Radix UI** per l'interfaccia
- L'autenticazione è gestita tramite **Supabase Auth UI**
- Le immagini sono generate tramite **Google Gemini AI**

## File di Configurazione Importanti

- `backend/.env` e `frontend/.env.local`: Variabili d'ambiente
- `backend/app.py`: API principale
- `frontend/next.config.mjs`: Configurazione Next.js
- `PROJECT_RAG.md`: Documentazione completa dell'architettura
- `CHANGELOG.md`: Storia delle modifiche