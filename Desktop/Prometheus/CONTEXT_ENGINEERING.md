# Context Engineering - Best Practices per Prometheus

## Indice

1. [Introduzione al Context Engineering](#introduzione)
2. [Architettura del Prompt](#architettura-prompt)
3. [Gestione del Contesto](#gestione-contesto)
4. [Best Practices](#best-practices)
5. [Prompt Templates](#prompt-templates)
6. [Ottimizzazione delle Performance](#ottimizzazione)
7. [Debugging e Monitoring](#debugging)
8. [Esempi Pratici](#esempi)

---

## 1. Introduzione al Context Engineering {#introduzione}

### Cos'è il Context Engineering

Il Context Engineering è la disciplina di progettare, strutturare e ottimizzare il contesto fornito ai modelli di linguaggio per ottenere risposte più accurate, coerenti e utili.

### Obiettivi in Prometheus

- **Coerenza Narrativa**: Mantenere il tono e lo stile attraverso le interazioni
- **Personalizzazione**: Adattare le risposte al seme specifico e al progresso dell'utente
- **Qualità Creativa**: Stimolare riflessioni profonde e originali
- **Efficienza**: Minimizzare i token utilizzati massimizzando la qualità

---

## 2. Architettura del Prompt {#architettura-prompt}

### Struttura Standard

```
[SYSTEM_CONTEXT]
├── Ruolo e Identità
├── Obiettivi Principali
├── Vincoli e Limitazioni
└── Formato di Output

[DYNAMIC_CONTEXT]
├── Informazioni sul Seme
├── Storia della Conversazione
├── Stato dell'Utente
└── Contesto Temporale

[USER_INPUT]
├── Richiesta Corrente
├── Parametri Specifici
└── Metadati

[OUTPUT_SPECIFICATION]
├── Formato Richiesto
├── Lunghezza Target
├── Stile e Tono
└── Elementi Obbligatori
```

### Implementazione in Prometheus

```python
# Esempio da backend/app.py
def build_prompt(req: ChatRequest, seme_info: dict, context: dict) -> str:
    """
    Costruisce un prompt strutturato per l'AI
    """
    
    # SYSTEM_CONTEXT
    system_role = """
    Sei Prometheus, un assistente AI specializzato nella scrittura creativa e introspettiva.
    Il tuo ruolo è guidare l'utente attraverso un percorso di riflessione profonda.
    """
    
    # DYNAMIC_CONTEXT
    seme_context = f"""
    Tema: {req.seme_id} - {seme_info['nome']}
    Descrizione: {seme_info['descrizione']}
    Contesto precedente: {context.get('previous_interaction', '')}
    """
    
    # OUTPUT_SPECIFICATION
    output_format = """
    Rispondi UNICAMENTE con un oggetto JSON valido:
    {
        "output": "riflessione poetica o metaforica",
        "eco": ["frase breve e concisa"],
        "frase_finale": "domanda stimolante che termina con ?"
    }
    """
    
    return f"{system_role}\n\n{seme_context}\n\n{output_format}"
```

---

## 3. Gestione del Contesto {#gestione-contesto}

### Context Window Management

```python
class ContextManager:
    def __init__(self, max_tokens: int = 4000):
        self.max_tokens = max_tokens
        self.context_history = []
    
    def add_interaction(self, user_input: str, ai_response: str):
        """Aggiunge una nuova interazione al contesto"""
        interaction = {
            "timestamp": datetime.now(),
            "user": user_input,
            "assistant": ai_response,
            "tokens": self.count_tokens(user_input + ai_response)
        }
        self.context_history.append(interaction)
        self._trim_context()
    
    def _trim_context(self):
        """Mantiene il contesto entro i limiti di token"""
        total_tokens = sum(item["tokens"] for item in self.context_history)
        
        while total_tokens > self.max_tokens and len(self.context_history) > 1:
            # Rimuovi l'interazione più vecchia (tranne l'ultima)
            removed = self.context_history.pop(0)
            total_tokens -= removed["tokens"]
    
    def get_context_summary(self) -> str:
        """Genera un riassunto del contesto per l'AI"""
        if not self.context_history:
            return "Nessuna interazione precedente."
        
        # Mantieni sempre l'ultima interazione completa
        last_interaction = self.context_history[-1]
        
        # Riassumi le interazioni precedenti
        if len(self.context_history) > 1:
            summary = "Riassunto interazioni precedenti: "
            for interaction in self.context_history[:-1]:
                summary += f"Utente ha riflettuto su: {interaction['user'][:50]}... "
        
        return f"{summary}\nUltima interazione: {last_interaction['assistant']}"
```

### State Management

```python
class ConversationState:
    def __init__(self):
        self.phase = "initial"  # initial, development, conclusion
        self.interaction_count = 0
        self.key_themes = []
        self.emotional_tone = "neutral"
    
    def update_state(self, user_input: str, ai_response: str):
        """Aggiorna lo stato della conversazione"""
        self.interaction_count += 1
        
        # Determina la fase basata sul numero di interazioni
        if self.interaction_count <= 2:
            self.phase = "initial"
        elif self.interaction_count <= 5:
            self.phase = "development"
        else:
            self.phase = "conclusion"
        
        # Estrai temi chiave (implementazione semplificata)
        self.key_themes.extend(self._extract_themes(user_input))
        
        # Analizza il tono emotivo
        self.emotional_tone = self._analyze_tone(user_input)
    
    def get_phase_instructions(self) -> str:
        """Restituisce istruzioni specifiche per la fase corrente"""
        instructions = {
            "initial": "Esplora il tema con domande aperte e curiosità.",
            "development": "Approfondisci le riflessioni emerse, crea connessioni.",
            "conclusion": "Sintetizza i insights e prepara una chiusura significativa."
        }
        return instructions.get(self.phase, "")
```

---

## 4. Best Practices {#best-practices}

### 4.1 Strutturazione del Prompt

#### ✅ DO

```python
# Usa delimitatori chiari
prompt = """
**RUOLO:**
Sei Prometheus, assistente per la scrittura creativa.

**CONTESTO:**
Tema: {tema}
Fase: {fase}

**COMPITO:**
Genera una riflessione che...

**FORMATO:**
JSON con campi: output, eco, frase_finale
"""

# Fornisci esempi concreti
example = """
**ESEMPIO:**
{
    "output": "Come un seme che attende la primavera...",
    "eco": ["L'attesa è fertile"],
    "frase_finale": "Cosa nutre la tua pazienza?"
}
"""
```

#### ❌ DON'T

```python
# Prompt ambiguo e non strutturato
prompt = "Rispondi creativamente al tema dell'utente in JSON"

# Istruzioni contraddittorie
prompt = "Sii breve ma dettagliato, formale ma creativo"
```

### 4.2 Gestione della Memoria

#### Context Compression

```python
def compress_context(interactions: List[dict]) -> str:
    """Comprime il contesto mantenendo le informazioni essenziali"""
    
    if len(interactions) <= 3:
        return "\n".join([f"U: {i['user']}\nA: {i['assistant']}" 
                          for i in interactions])
    
    # Mantieni prima e ultima interazione, riassumi il resto
    first = interactions[0]
    last = interactions[-1]
    middle = interactions[1:-1]
    
    middle_summary = summarize_interactions(middle)
    
    return f"""
    Prima interazione:
    U: {first['user']}
    A: {first['assistant']}
    
    Sviluppo intermedio: {middle_summary}
    
    Ultima interazione:
    U: {last['user']}
    A: {last['assistant']}
    """
```

### 4.3 Validazione dell'Output

```python
def validate_ai_response(response: str) -> dict:
    """Valida e pulisce la risposta dell'AI"""
    
    try:
        # Estrai JSON dalla risposta
        json_match = re.search(r'{.*}', response, re.DOTALL)
        if not json_match:
            raise ValueError("Nessun JSON trovato")
        
        data = json.loads(json_match.group())
        
        # Validazione campi obbligatori
        required_fields = ['output', 'eco', 'frase_finale']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Campo mancante: {field}")
        
        # Validazione formato
        if not isinstance(data['eco'], list):
            data['eco'] = [str(data['eco'])]
        
        if not data['frase_finale'].endswith('?'):
            data['frase_finale'] += '?'
        
        return data
        
    except Exception as e:
        # Fallback response
        return {
            "output": "Mi dispiace, ho avuto difficoltà a elaborare una risposta appropriata.",
            "eco": ["Riprova"],
            "frase_finale": "Puoi riformulare la tua riflessione?"
        }
```

---

## 5. Prompt Templates {#prompt-templates}

### Template Base

```python
BASE_TEMPLATE = """
**IDENTITÀ:**
Sei Prometheus, un assistente AI specializzato nella scrittura creativa e introspettiva.
Il tuo compito è guidare l'utente attraverso un percorso di riflessione profonda basato su "semi" di scrittura.

**PRINCIPI GUIDA:**
1. Non dare risposte dirette o soluzioni
2. Stimola la riflessione attraverso metafore e immagini poetiche
3. Mantieni sempre un senso di mistero e profondità
4. Adatta il tono al tema del seme specifico

**CONTESTO ATTUALE:**
Tema: {seme_nome}
Descrizione: {seme_descrizione}
Fase conversazione: {fase}
Interazione numero: {numero_interazione}

**STORIA PRECEDENTE:**
{contesto_precedente}

**RICHIESTA UTENTE:**
{user_input}

**ISTRUZIONI OUTPUT:**
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente:
- "output": Una riflessione poetica/metaforica (max 200 parole)
- "eco": Array con una frase breve e concisa
- "frase_finale": Una domanda stimolante che termina con "?"

**ESEMPIO FORMATO:**
{{
    "output": "Come un fiume che scorre verso il mare, ogni pensiero porta con sé frammenti di verità...",
    "eco": ["Il flusso non si ferma mai"],
    "frase_finale": "Quale direzione sta prendendo il tuo fiume interiore?"
}}
"""
```

### Template per Fasi Specifiche

```python
PHASE_TEMPLATES = {
    "initial": """
**FASE INIZIALE - ESPLORAZIONE**
Questo è l'inizio del viaggio. L'utente si sta avvicinando al tema per la prima volta.
- Usa domande aperte e curiose
- Crea un'atmosfera di scoperta
- Non approfondire troppo, lascia spazio all'esplorazione
""",
    
    "development": """
**FASE SVILUPPO - APPROFONDIMENTO**
L'utente ha già iniziato a riflettere. È il momento di approfondire.
- Collega le riflessioni precedenti
- Introduce nuove prospettive
- Stimola connessioni più profonde
""",
    
    "conclusion": """
**FASE CONCLUSIVA - SINTESI**
È il momento di raccogliere i frutti della riflessione.
- Sintetizza i temi emersi
- Offri una prospettiva unificante
- Prepara una chiusura significativa ma aperta
"""
}
```

### Template per Temi Specifici

```python
THEME_TEMPLATES = {
    "natura": """
**APPROCCIO TEMATICO - NATURA**
- Usa metafore naturali (stagioni, elementi, cicli)
- Richiama i ritmi della terra
- Connetti l'esperienza umana ai fenomeni naturali
""",
    
    "memoria": """
**APPROCCIO TEMATICO - MEMORIA**
- Esplora il tempo come fiume o labirinto
- Usa immagini di fotografie, echi, tracce
- Bilancia nostalgia e presenza
""",
    
    "relazioni": """
**APPROCCIO TEMATICO - RELAZIONI**
- Metafore di ponti, specchi, danze
- Esplora la reciprocità e l'interdipendenza
- Tocca temi di solitudine e connessione
"""
}
```

---

## 6. Ottimizzazione delle Performance {#ottimizzazione}

### Token Management

```python
class TokenOptimizer:
    def __init__(self):
        self.token_limits = {
            "system_prompt": 1000,
            "context": 1500,
            "user_input": 500,
            "max_response": 800
        }
    
    def optimize_prompt(self, prompt_parts: dict) -> str:
        """Ottimizza il prompt per rimanere entro i limiti di token"""
        
        optimized = {}
        
        for part_name, content in prompt_parts.items():
            limit = self.token_limits.get(part_name, 1000)
            
            if self.count_tokens(content) > limit:
                optimized[part_name] = self.compress_content(content, limit)
            else:
                optimized[part_name] = content
        
        return self.assemble_prompt(optimized)
    
    def compress_content(self, content: str, target_tokens: int) -> str:
        """Comprime il contenuto mantenendo le informazioni essenziali"""
        
        # Strategia 1: Rimuovi esempi ridondanti
        content = self.remove_redundant_examples(content)
        
        # Strategia 2: Abbrevia descrizioni lunghe
        content = self.abbreviate_descriptions(content)
        
        # Strategia 3: Usa bullet points invece di paragrafi
        content = self.convert_to_bullets(content)
        
        return content
```

### Caching Strategies

```python
class PromptCache:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 3600  # 1 ora
    
    def get_cached_prompt(self, seme_id: int, phase: str) -> Optional[str]:
        """Recupera un prompt dalla cache se disponibile"""
        
        cache_key = f"{seme_id}_{phase}"
        
        if cache_key in self.cache:
            cached_item = self.cache[cache_key]
            
            if time.time() - cached_item['timestamp'] < self.cache_ttl:
                return cached_item['prompt']
            else:
                del self.cache[cache_key]
        
        return None
    
    def cache_prompt(self, seme_id: int, phase: str, prompt: str):
        """Salva un prompt nella cache"""
        
        cache_key = f"{seme_id}_{phase}"
        
        self.cache[cache_key] = {
            'prompt': prompt,
            'timestamp': time.time()
        }
```

---

## 7. Debugging e Monitoring {#debugging}

### Logging Strutturato

```python
import logging
from datetime import datetime

class ContextLogger:
    def __init__(self):
        self.logger = logging.getLogger('prometheus_context')
        self.logger.setLevel(logging.INFO)
        
        # Handler per file
        file_handler = logging.FileHandler('context_engineering.log')
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        )
        self.logger.addHandler(file_handler)
    
    def log_prompt_generation(self, seme_id: int, user_input: str, 
                            generated_prompt: str, response: str):
        """Log della generazione del prompt"""
        
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'seme_id': seme_id,
            'user_input_length': len(user_input),
            'prompt_length': len(generated_prompt),
            'response_length': len(response),
            'prompt_tokens': self.count_tokens(generated_prompt),
            'response_tokens': self.count_tokens(response)
        }
        
        self.logger.info(f"Prompt generated: {log_data}")
    
    def log_context_compression(self, original_size: int, compressed_size: int):
        """Log della compressione del contesto"""
        
        compression_ratio = compressed_size / original_size if original_size > 0 else 0
        
        self.logger.info(
            f"Context compressed: {original_size} -> {compressed_size} "
            f"(ratio: {compression_ratio:.2f})"
        )
```

### Metriche di Qualità

```python
class QualityMetrics:
    def __init__(self):
        self.metrics = {
            'response_validity': [],
            'json_parse_success': [],
            'user_engagement': [],
            'conversation_length': []
        }
    
    def evaluate_response(self, response: str, user_feedback: dict = None) -> dict:
        """Valuta la qualità di una risposta"""
        
        metrics = {}
        
        # Validità JSON
        try:
            json.loads(response)
            metrics['json_valid'] = True
        except:
            metrics['json_valid'] = False
        
        # Presenza campi richiesti
        required_fields = ['output', 'eco', 'frase_finale']
        metrics['has_required_fields'] = all(
            field in response for field in required_fields
        )
        
        # Lunghezza appropriata
        metrics['appropriate_length'] = 50 <= len(response) <= 1000
        
        # Presenza di domanda finale
        metrics['ends_with_question'] = '?' in response
        
        # Aggiorna metriche globali
        self.update_global_metrics(metrics)
        
        return metrics
    
    def get_quality_report(self) -> dict:
        """Genera un report sulla qualità complessiva"""
        
        if not self.metrics['response_validity']:
            return {'status': 'no_data'}
        
        return {
            'json_success_rate': sum(self.metrics['json_parse_success']) / len(self.metrics['json_parse_success']),
            'avg_conversation_length': sum(self.metrics['conversation_length']) / len(self.metrics['conversation_length']),
            'total_interactions': len(self.metrics['response_validity'])
        }
```

---

## 8. Esempi Pratici {#esempi}

### Esempio 1: Gestione Conversazione Completa

```python
class PrometheusConversationManager:
    def __init__(self):
        self.context_manager = ContextManager()
        self.state = ConversationState()
        self.prompt_cache = PromptCache()
        self.logger = ContextLogger()
    
    async def process_user_input(self, seme_id: int, user_input: str) -> dict:
        """Processa l'input dell'utente e genera una risposta"""
        
        # 1. Aggiorna lo stato della conversazione
        self.state.update_state(user_input, "")
        
        # 2. Recupera informazioni sul seme
        seme_info = self.get_seme_info(seme_id)
        
        # 3. Costruisci il contesto
        context = self.context_manager.get_context_summary()
        
        # 4. Genera il prompt
        prompt = self.build_contextual_prompt(
            seme_info, user_input, context, self.state
        )
        
        # 5. Chiama l'AI
        response = await self.call_ai_api(prompt)
        
        # 6. Valida e pulisci la risposta
        validated_response = self.validate_and_clean_response(response)
        
        # 7. Aggiorna il contesto
        self.context_manager.add_interaction(user_input, validated_response)
        
        # 8. Log dell'interazione
        self.logger.log_prompt_generation(
            seme_id, user_input, prompt, validated_response
        )
        
        return validated_response
    
    def build_contextual_prompt(self, seme_info: dict, user_input: str, 
                              context: str, state: ConversationState) -> str:
        """Costruisce un prompt contestualizzato"""
        
        # Controlla cache
        cached = self.prompt_cache.get_cached_prompt(seme_info['id'], state.phase)
        if cached:
            return cached.format(
                user_input=user_input,
                context=context
            )
        
        # Costruisci nuovo prompt
        base_template = BASE_TEMPLATE
        phase_instructions = PHASE_TEMPLATES[state.phase]
        theme_approach = THEME_TEMPLATES.get(seme_info['categoria'], "")
        
        prompt = base_template.format(
            seme_nome=seme_info['nome'],
            seme_descrizione=seme_info['descrizione'],
            fase=state.phase,
            numero_interazione=state.interaction_count,
            contesto_precedente=context,
            user_input=user_input,
            phase_instructions=phase_instructions,
            theme_approach=theme_approach
        )
        
        # Salva in cache
        self.prompt_cache.cache_prompt(seme_info['id'], state.phase, prompt)
        
        return prompt
```

### Esempio 2: A/B Testing per Prompt

```python
class PromptABTester:
    def __init__(self):
        self.variants = {
            'A': 'prompt_variant_a.txt',
            'B': 'prompt_variant_b.txt'
        }
        self.results = {'A': [], 'B': []}
    
    def get_prompt_variant(self, user_id: str) -> str:
        """Assegna una variante del prompt basata sull'ID utente"""
        
        # Usa hash dell'ID per assegnazione consistente
        hash_value = hash(user_id) % 2
        variant = 'A' if hash_value == 0 else 'B'
        
        return variant
    
    def track_result(self, variant: str, metrics: dict):
        """Traccia i risultati per una variante"""
        
        self.results[variant].append({
            'timestamp': datetime.now(),
            'metrics': metrics
        })
    
    def analyze_results(self) -> dict:
        """Analizza i risultati dell'A/B test"""
        
        analysis = {}
        
        for variant in ['A', 'B']:
            if self.results[variant]:
                metrics = [r['metrics'] for r in self.results[variant]]
                
                analysis[variant] = {
                    'sample_size': len(metrics),
                    'avg_json_success': sum(m.get('json_valid', 0) for m in metrics) / len(metrics),
                    'avg_engagement': sum(m.get('user_engagement', 0) for m in metrics) / len(metrics)
                }
        
        return analysis
```

---

## Conclusioni

Il Context Engineering in Prometheus è un processo iterativo che richiede:

1. **Monitoraggio Continuo**: Traccia le performance e la qualità delle risposte
2. **Ottimizzazione Incrementale**: Migliora i prompt basandoti sui dati raccolti
3. **Flessibilità**: Adatta l'approccio ai diversi temi e fasi della conversazione
4. **Validazione**: Assicurati che l'output sia sempre nel formato corretto
5. **Scalabilità**: Progetta sistemi che possano gestire volumi crescenti

Ricorda: il miglior prompt è quello che produce risultati coerenti, creativi e utili per l'utente finale.

---

**Documento mantenuto da**: Team Prometheus  
**Ultima revisione**: Gennaio 2025  
**Versione**: 1.0.0