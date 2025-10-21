# Guida al Deployment di Prometheus

Questo documento contiene le istruzioni per deployare l'applicazione Prometheus su Netlify (frontend) e Render (backend).

## Struttura del Progetto

- **Frontend**: Applicazione Next.js con autenticazione Supabase
- **Backend**: API FastAPI in Python che gestisce le chiamate a Google Gemini AI

## 1. Deployment del Backend su Render

### Prerequisiti

1. Crea un account su [Render](https://render.com) se non ne hai già uno
2. Assicurati di avere una chiave API di Google Gemini

### Passi per il Deployment

1. **Crea un nuovo Web Service su Render**:
   - Collega il tuo repository GitHub/GitLab
   - Seleziona il repository del progetto

2. **Configura il servizio**:
   - **Nome**: `prometheus-backend` (o un nome a tua scelta)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

3. **Configura le variabili d'ambiente**:
   - `GOOGLE_API_KEY`: La tua chiave API di Google Gemini
   - `FRONTEND_URL`: L'URL del tuo frontend su Vercel (es. `https://prometheus-app.vercel.app`)
   - `PORT`: Lascia che Render lo gestisca automaticamente

4. **Carica il file semi_data.json**:
   - Assicurati che il file `semi_data.json` sia presente nel repository
   - In alternativa, puoi usare il Disk Storage di Render per caricarlo manualmente

5. **Deploy**:
   - Clicca su "Create Web Service"
   - Attendi che il deployment sia completato

6. **Verifica**:
   - Una volta completato il deployment, testa l'API con un endpoint di base come `/health`
   - Prendi nota dell'URL del servizio (es. `https://prometheus-backend.onrender.com`)

## 2. Deployment del Frontend su Netlify

### Prerequisiti

1. Crea un account su [Netlify](https://netlify.com) se non ne hai già uno
2. Assicurati di avere le credenziali di Supabase

### Passi per il Deployment

1. **Prepara il progetto**:
   - Crea un file `.env.production` nella cartella `frontend/` con le variabili d'ambiente corrette
   - Aggiorna `NEXT_PUBLIC_BACKEND_URL` con l'URL del tuo backend su Render

2. **Importa il progetto su Netlify**:
   - Dalla dashboard di Netlify, clicca su "Add new site" > "Import an existing project"
   - Connetti il tuo repository GitHub/GitLab

3. **Configura il progetto**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
   - **Node version**: 18 o superiore

4. **Configura le variabili d'ambiente**:
   Vai in Site settings > Environment variables e aggiungi:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del tuo progetto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chiave anonima del tuo progetto Supabase
   - `NEXT_PUBLIC_BACKEND_URL`: URL del tuo backend su Render

5. **Configura le redirect per Next.js**:
   Crea un file `_redirects` nella cartella `frontend/public/` con:
   ```
   /*    /index.html   200
   ```

6. **Deploy**:
   - Clicca su "Deploy site"
   - Attendi che il deployment sia completato

7. **Verifica**:
   - Una volta completato il deployment, visita l'URL del tuo progetto
   - Verifica che l'autenticazione con Supabase funzioni correttamente
   - Verifica che le chiamate API al backend funzionino correttamente

## 3. Configurazione di Supabase

1. **Configura le URL di redirect**:
   - Nel tuo progetto Supabase, vai su Authentication > URL Configuration
   - Aggiungi l'URL del tuo frontend Netlify come Site URL
   - Aggiungi `https://tuo-dominio.netlify.app/auth/callback` come URL di redirect

2. **Verifica i provider di autenticazione**:
   - Assicurati che i provider di autenticazione che utilizzi (Google, GitHub, ecc.) siano configurati correttamente

## 4. Manutenzione e Monitoraggio

### Render

- Monitora l'utilizzo delle risorse e i log dal dashboard di Render
- Configura gli alert per essere notificato in caso di problemi

### Netlify

- Monitora le performance e gli errori dal dashboard di Netlify
- Utilizza Netlify Analytics per tracciare l'utilizzo dell'applicazione

## 5. Risoluzione dei Problemi

### Problemi comuni con il backend

- **Errori CORS**: Verifica che `FRONTEND_URL` sia configurato correttamente
- **Errori API Gemini**: Verifica che la chiave API sia valida e che il servizio sia disponibile

### Problemi comuni con il frontend

- **Errori di autenticazione**: Verifica le configurazioni di Supabase
- **Errori di connessione al backend**: Verifica che `NEXT_PUBLIC_BACKEND_URL` sia configurato correttamente

## Conclusione

Seguendo questa guida, dovresti essere in grado di deployare con successo l'applicazione Prometheus su Netlify e Render. Se incontri problemi, consulta la documentazione ufficiale di [Netlify](https://docs.netlify.com) e [Render](https://render.com/docs).