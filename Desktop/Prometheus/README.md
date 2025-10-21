# Prometheus - Piattaforma di Scrittura Creativa e Introspettiva

![Prometheus](https://img.shields.io/badge/Status-Active-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Prometheus è una piattaforma innovativa di scrittura creativa che utilizza l'intelligenza artificiale per guidare gli utenti attraverso un percorso di riflessione e creazione letteraria basato su "semi" di scrittura.

## 🌟 Caratteristiche Principali

- **Mandala Interattivo**: Dashboard visuale con 33 semi di scrittura unici
- **Chat AI Avanzata**: Interazione con Gemini AI per sviluppare riflessioni creative
- **Archivio Personale**: Gestione completa di bozze e capitoli
- **Libro Vivente**: Assemblaggio dinamico dei capitoli in un'opera finale
- **Autenticazione Sicura**: Sistema di login con Supabase Auth
- **Responsive Design**: Interfaccia ottimizzata per tutti i dispositivi

## 🏗️ Architettura

### Stack Tecnologico

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase Client
- React Beautiful DnD

**Backend:**
- FastAPI (Python)
- Uvicorn (ASGI Server)
- Google Gemini API
- Supabase (Database & Auth)

**Database:**
- PostgreSQL (via Supabase)
- Row Level Security (RLS)
- Real-time subscriptions

### Struttura del Progetto

```
Prometheus/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── semi_data.json      # Semi di scrittura
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   └── lib/          # Utilities & Supabase client
│   ├── package.json
│   └── .env.local        # Frontend environment
├── docs/
│   ├── PROJECT_RAG.md    # Context engineering
│   └── CONTEXT_ENGINEERING.md
└── README.md
```

## 🚀 Quick Start

### Prerequisiti

- Node.js 18+
- Python 3.8+
- Account Supabase
- Google AI API Key

### Installazione

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd Prometheus
   ```

2. **Configura il Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configura il Frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Configura le variabili d'ambiente**
   
   **Backend (.env):**
   ```env
   GOOGLE_API_KEY=your_google_ai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   FRONTEND_URL=http://localhost:3001
   ```
   
   **Frontend (.env.local):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   ```

5. **Avvia l'applicazione**
   ```bash
   # Opzione 1: Script automatico (Windows)
   .\start-dev.bat
   
   # Opzione 2: Manuale
   # Terminal 1 - Backend
   cd backend
   python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Accedi all'applicazione**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📊 Database Schema

### Tabelle Principali

**capitoli**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `seme_id`: Integer
- `titolo`: Text
- `testo`: Text
- `stato`: Enum ('bozza', 'promosso_al_libro')
- `created_at`: Timestamp
- `updated_at`: Timestamp

**libro**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `titolo`: Text
- `testo`: Text
- `ordine`: Integer
- `created_at`: Timestamp
- `updated_at`: Timestamp

## 🔧 API Endpoints

### Backend FastAPI

- `POST /api/chat` - Invia richiesta chat all'AI
- `GET /api/get-task-result/{task_id}` - Recupera risultato task asincrono
- `GET /api/semi` - Lista tutti i semi disponibili
- `GET /health` - Health check

### Supabase API

- Autenticazione utenti
- CRUD operazioni su capitoli e libro
- Real-time subscriptions
- Row Level Security

## 🎯 Flusso Utente

1. **Login/Registrazione** via Supabase Auth
2. **Mandala**: Selezione di un seme di scrittura
3. **Scrivi**: Interazione chat con l'AI per sviluppare il tema
4. **Archivio**: Revisione e modifica delle bozze create
5. **Libro**: Assemblaggio finale dei capitoli selezionati

## 🔒 Sicurezza

- **Row Level Security (RLS)** su tutte le tabelle
- **JWT Authentication** via Supabase
- **API Key Protection** per servizi esterni
- **CORS Configuration** per domini autorizzati
- **Environment Variables** per dati sensibili

## 🧪 Testing

```bash
# Frontend
cd frontend
npm run test

# Backend
cd backend
pytest
```

## 📦 Deployment

### Produzione

1. **Backend**: Deploy su Render/Railway/Heroku
2. **Frontend**: Deploy su Vercel/Netlify
3. **Database**: Supabase (già in cloud)

Vedi `README-DEPLOYMENT.md` per istruzioni dettagliate.

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

### Linee Guida

- Segui le convenzioni in `CODING_GUIDELINES.md`
- Aggiorna `PROJECT_RAG.md` per modifiche architetturali
- Mantieni aggiornato `CHANGELOG.md`
- Scrivi test per nuove funzionalità

## 📚 Documentazione

- `PROJECT_RAG.md` - Architettura e logica applicativa
- `CONTEXT_ENGINEERING.md` - Best practices per context engineering
- `CODING_GUIDELINES.md` - Standard di codifica
- `CHANGELOG.md` - Cronologia delle modifiche

## 🐛 Troubleshooting

### Problemi Comuni

**Errore 404 API Gemini:**
- Verifica che `GOOGLE_API_KEY` sia valida
- Controlla l'endpoint API in `backend/app.py`

**Errore Supabase Connection:**
- Verifica le credenziali in `.env` files
- Controlla che RLS sia configurato correttamente

**Port già in uso:**
- Frontend: Cambierà automaticamente porta (es. 3001)
- Backend: Termina processi esistenti su porta 8000

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 👥 Team

- **Sviluppo**: [Il tuo nome]
- **AI Integration**: Gemini 2.0 Flash
- **Infrastructure**: Supabase + Vercel

## 🔗 Link Utili

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google AI Documentation](https://ai.google.dev/)

---

**Prometheus** - Dove la creatività incontra l'intelligenza artificiale 🔥
