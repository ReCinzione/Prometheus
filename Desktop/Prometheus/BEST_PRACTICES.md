# Best Practices - Prometheus

Questo documento raccoglie le migliori pratiche per lo sviluppo, manutenzione e ottimizzazione del progetto Prometheus.

## 📋 Indice

1. [Context Engineering](#1-context-engineering)
2. [Sviluppo Frontend](#2-sviluppo-frontend)
3. [Sviluppo Backend](#3-sviluppo-backend)
4. [Database e Performance](#4-database-e-performance)
5. [Testing e Quality Assurance](#5-testing-e-quality-assurance)
6. [Deploy e DevOps](#6-deploy-e-devops)
7. [Sicurezza](#7-sicurezza)
8. [Monitoraggio e Logging](#8-monitoraggio-e-logging)

---

## 1. Context Engineering

### Struttura del Prompt

**✅ DO:**
```python
# Prompt strutturato con sezioni chiare
def build_prompt(context: dict) -> str:
    system_context = """Sei Prometheus, assistente AI..."""
    user_context = f"""Tema: {context['tema']}..."""
    output_format = """Rispondi in JSON: {...}"""
    
    return f"{system_context}\n\n{user_context}\n\n{output_format}"
```

**❌ DON'T:**
```python
# Prompt monolitico senza struttura
def build_prompt(context: dict) -> str:
    return f"Sei Prometheus e devi rispondere a {context['input']} in JSON"
```

### Gestione del Contesto

**✅ DO:**
- Implementare compressione intelligente del contesto
- Mantenere sempre l'ultima interazione completa
- Tracciare la fase della conversazione
- Validare sempre le risposte AI

**❌ DON'T:**
- Inviare tutto lo storico senza compressione
- Ignorare i limiti di token
- Assumere che l'AI risponda sempre correttamente

### Validazione delle Risposte

```python
def validate_ai_response(response: str) -> dict:
    """Sempre validare e fornire fallback"""
    try:
        data = json.loads(extract_json(response))
        validate_required_fields(data)
        return data
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return generate_fallback_response()
```

---

## 2. Sviluppo Frontend

### Componenti React

**✅ DO:**
```typescript
// Componenti tipizzati e modulari
interface ChapterProps {
  chapter: Chapter;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
}

const ChapterCard: React.FC<ChapterProps> = ({ chapter, onUpdate }) => {
  // Implementazione pulita
};
```

**❌ DON'T:**
```typescript
// Componenti senza tipi o props generiche
const ChapterCard = (props: any) => {
  // Implementazione confusa
};
```

### State Management

**✅ DO:**
- Usare React Query per server state
- Implementare loading e error states
- Ottimizzare re-renders con useMemo/useCallback

**❌ DON'T:**
- Mescolare client e server state
- Ignorare stati di caricamento
- Causare re-renders inutili

### Styling con Tailwind

**✅ DO:**
```tsx
// Classi semantiche e responsive
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
</div>
```

**❌ DON'T:**
```tsx
// Classi inline eccessive o non semantiche
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out border border-gray-200">
```

---

## 3. Sviluppo Backend

### FastAPI Structure

**✅ DO:**
```python
# Endpoint ben strutturati con validazione
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    background_tasks: BackgroundTasks
) -> ChatResponse:
    # Validazione input
    validate_chat_request(request)
    
    # Logica business
    task_id = create_task_id()
    background_tasks.add_task(process_chat, task_id, request)
    
    return ChatResponse(task_id=task_id, status="processing")
```

**❌ DON'T:**
```python
# Endpoint senza validazione o struttura
@app.post("/api/chat")
async def chat_endpoint(data: dict):
    # Logica confusa senza validazione
    return {"result": "something"}
```

### Error Handling

**✅ DO:**
```python
# Gestione errori strutturata
try:
    result = await process_ai_request(request)
except ValidationError as e:
    logger.error(f"Validation error: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except AIServiceError as e:
    logger.error(f"AI service error: {e}")
    raise HTTPException(status_code=503, detail="AI service unavailable")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### Async Operations

**✅ DO:**
- Usare BackgroundTasks per operazioni lunghe
- Implementare timeout appropriati
- Fornire feedback di progresso

**❌ DON'T:**
- Bloccare il thread principale
- Ignorare timeout e cancellazioni
- Lasciare l'utente senza feedback

---

## 4. Database e Performance

### Supabase Queries

**✅ DO:**
```typescript
// Query ottimizzate con select specifici
const { data, error } = await supabase
  .from('capitoli')
  .select('id, titolo, timestamp, stato')
  .eq('user_id', userId)
  .eq('stato', 'bozza_in_archivio')
  .order('timestamp', { ascending: false })
  .limit(20);
```

**❌ DON'T:**
```typescript
// Query inefficienti
const { data, error } = await supabase
  .from('capitoli')
  .select('*'); // Seleziona tutto senza filtri
```

### Indexing Strategy

**✅ DO:**
- Creare indici su colonne filtrate frequentemente
- Usare indici composti per query complesse
- Monitorare performance delle query

### Caching

**✅ DO:**
```typescript
// React Query con cache intelligente
const useChapters = (userId: string) => {
  return useQuery({
    queryKey: ['chapters', userId],
    queryFn: () => fetchChapters(userId),
    staleTime: 5 * 60 * 1000, // 5 minuti
    cacheTime: 10 * 60 * 1000, // 10 minuti
  });
};
```

---

## 5. Testing e Quality Assurance

### Unit Testing

**✅ DO:**
```typescript
// Test specifici e isolati
describe('ChapterService', () => {
  it('should create chapter with valid data', async () => {
    const mockData = { titolo: 'Test', testo: 'Content' };
    const result = await chapterService.create(mockData);
    
    expect(result.id).toBeDefined();
    expect(result.titolo).toBe(mockData.titolo);
  });
});
```

### Integration Testing

**✅ DO:**
- Testare flussi end-to-end critici
- Usare dati di test isolati
- Verificare stati di errore

### Code Quality

**✅ DO:**
```json
// ESLint configuration
{
  "extends": ["next/core-web-vitals", "@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

---

## 6. Deploy e DevOps

### Environment Management

**✅ DO:**
```bash
# Variabili ambiente ben organizzate
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
GEMINI_API_KEY=xxx
BACKEND_URL=https://api.prometheus.com
```

### CI/CD Pipeline

**✅ DO:**
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod
```

### Monitoring

**✅ DO:**
- Implementare health checks
- Monitorare metriche chiave
- Configurare alerting

---

## 7. Sicurezza

### Authentication

**✅ DO:**
```typescript
// Middleware di autenticazione
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Validare token
  const isValid = await validateToken(token);
  if (!isValid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Data Validation

**✅ DO:**
```python
# Validazione rigorosa con Pydantic
class ChatRequest(BaseModel):
    seme_id: str = Field(..., min_length=1, max_length=50)
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = Field(None, max_length=100)
    
    @validator('seme_id')
    def validate_seme_id(cls, v):
        if not v.isalnum():
            raise ValueError('seme_id must be alphanumeric')
        return v
```

### API Security

**✅ DO:**
- Implementare rate limiting
- Validare tutti gli input
- Usare HTTPS ovunque
- Sanitizzare output

---

## 8. Monitoraggio e Logging

### Structured Logging

**✅ DO:**
```python
# Logging strutturato
import structlog

logger = structlog.get_logger()

# Log con contesto
logger.info(
    "Chat request processed",
    user_id=user_id,
    seme_id=seme_id,
    response_time_ms=response_time,
    success=True
)
```

### Error Tracking

**✅ DO:**
```typescript
// Error boundary per React
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('React Error:', error, errorInfo);
    
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error);
    }
  }
}
```

### Performance Monitoring

**✅ DO:**
- Monitorare Core Web Vitals
- Tracciare API response times
- Monitorare database query performance
- Implementare alerting per anomalie

---

## 🎯 Checklist Pre-Deploy

### Frontend
- [ ] Build senza errori TypeScript
- [ ] Test unitari passano
- [ ] Performance audit (Lighthouse)
- [ ] Accessibilità verificata
- [ ] Responsive design testato

### Backend
- [ ] Test API completi
- [ ] Validazione input robusta
- [ ] Error handling implementato
- [ ] Logging configurato
- [ ] Health checks funzionanti

### Database
- [ ] Migrazioni testate
- [ ] Backup configurato
- [ ] Indici ottimizzati
- [ ] RLS policies verificate

### Security
- [ ] Variabili ambiente sicure
- [ ] Autenticazione testata
- [ ] Rate limiting attivo
- [ ] HTTPS configurato

### Documentation
- [ ] README aggiornato
- [ ] PROJECT_RAG.md aggiornato
- [ ] CHANGELOG.md aggiornato
- [ ] API documentation completa

---

*Questo documento è vivo e deve essere aggiornato regolarmente con nuove best practices e lezioni apprese.*