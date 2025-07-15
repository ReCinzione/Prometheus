# Manuale Operativo e Specifiche (PROJECT_RAG.md)

Questo documento serve come fonte unica di verità (Single Source of Truth) per l'architettura, la logica e le convenzioni di sviluppo di questa applicazione.

**ATTENZIONE: Per ogni modifica significativa al codice, questo file e `CHANGELOG.md` devono essere aggiornati.**

---

## 1. Panoramica dell'Applicazione

L'applicazione è una piattaforma di scrittura creativa e introspettiva basata su "semi" di scrittura. L'utente sceglie un seme, interagisce con un assistente AI (Prometheus) per sviluppare una riflessione, e trasforma questa interazione in un capitolo. I capitoli possono essere archiviati, modificati e infine assemblati in un "Libro Vivente" personalizzato e ordinabile.

---

## 2. Architettura e Componenti Chiave

L'applicazione è un monorepo con un backend Python/FastAPI e un frontend Next.js.

### Pagine Principali (Frontend)

-   **/mandala (`frontend/src/components/MandalaPage.tsx`)**:
    -   **Scopo:** Dashboard principale dove l'utente visualizza tutti i semi di scrittura disponibili e il proprio progresso.
    -   **Logica:** Mostra una griglia di "semi" e indica quali sono stati completati leggendo lo stato dalla tabella `capitoli`.

-   **/scrivi (`frontend/src/app/(protected)/scrivi/page.tsx`)**:
    -   **Scopo:** Pagina di interazione principale dove l'utente "scrive" un capitolo dialogando con l'AI.
    -   **Logica:**
        -   Gestisce una chat a due fasi con l'assistente AI.
        -   **Utilizza un'architettura di polling asincrona** per gestire le risposte potenzialmente lunghe del backend (vedi Sezione 4).
        -   Al termine dell'interazione, salva automaticamente il risultato come bozza nella tabella `capitoli`.

-   **/archivio (`frontend/src/components/ArchivioClient.tsx`)**:
    -   **Scopo:** Visualizza tutti i capitoli creati dall'utente (sia bozze che quelli già promossi al libro).
    -   **Logica:**
        -   Legge e mostra i record dalla tabella `capitoli`.
        -   Permette di **modificare** titolo e testo dei capitoli in stato di bozza.
        -   Permette di **promuovere** una bozza al libro. Questa azione:
            1.  Copia i dati del capitolo in un nuovo record nella tabella `libro`.
            2.  Aggiorna lo stato del capitolo originale in `capitoli` a `'promosso_al_libro'`.

-   **/libro (`frontend/src/app/(protected)/libro/page.tsx`)**:
    -   **Scopo:** Visualizza il "Libro Vivente" finale.
    -   **Logica:**
        -   Legge e mostra i capitoli **esclusivamente dalla tabella `libro`**.
        -   I capitoli sono visualizzati nell'ordine specificato dalla colonna `libro.ordine`.
        -   Permette di **riordinare** i capitoli tramite drag-and-drop, aggiornando i valori nella colonna `ordine`.
        -   Permette di **modificare** titolo e testo dei capitoli direttamente dal libro.
        -   Permette di **rimuovere** un capitolo dal libro (eliminando il record da `libro`).

---

## 3. Struttura del Database (Supabase)

### Tabella: `capitoli`
-   **Scopo:** Funge da "archivio" di tutte le interazioni completate. È la fonte dati per la pagina `/archivio`.
-   **Colonne Principali:**
    -   `id`: (Primary Key)
    -   `user_id`: (UUID) ID dell'utente proprietario.
    -   `seme_id`: (text) ID del seme di origine.
    -   `titolo`: (text)
    -   `testo`: (text) Contenuto principale generato.
    -   `eco`: (text[]) Array di stringhe.
    -   `frase_finale`: (text)
    -   `timestamp`: (timestamptz) Data di creazione/modifica. Usato per l'ordinamento nell'archivio.
    -   `stato`: (text) Stato del capitolo. Valori critici:
        -   `'bozza_in_archivio'`: Una bozza che può essere modificata e promossa.
        -   `'promosso_al_libro'`: La bozza è stata copiata nel libro.
    -   `raw_interaction_session_id`: (text) ID della sessione di chat originale.
    -   `icona`: (text)

### Tabella: `libro`
-   **Scopo:** Contiene i capitoli finali che compongono il libro dell'utente. È la fonte dati per la pagina `/libro`.
-   **Colonne Principali:**
    -   `id`: (Primary Key)
    -   `user_id`: (UUID)
    -   `titolo`: (text)
    -   `sottotitolo`: (text) **Mappato da `capitoli.eco`** durante la promozione.
    -   `testo`: (text)
    -   `seme_id`: (text)
    -   `timestamp`: (timestamptz)
    -   `ordine`: (integer) **Cruciale per l'ordinamento**. Gestito tramite drag-and-drop.
    -   `raw_interaction_session_id`: (text)

---

## 4. Logica Applicativa Fondamentale

### Flusso di Scrittura e Polling Asincrono (`/scrivi`)
Per evitare timeout del browser e di Netlify dovuti a risposte lente dell'AI o a cold start del backend (Render), il flusso è asincrono:
1.  **Invio:** Il frontend (`scrivi/page.tsx`) invia la richiesta all'API Next.js (`/api/archetipo-gemini`), che la inoltra al backend (`/api/chat`).
2.  **Avvio Task:** Il backend (`app.py`) riceve la richiesta, crea un `task_id` univoco, avvia un task in background (`BackgroundTasks`) per processare la richiesta con Gemini, e restituisce **immediatamente** una risposta `202 Accepted` con il `task_id`.
3.  **Polling:** Il frontend, ricevuto il `task_id`, entra in modalità "polling".
    -   Mostra un messaggio di attesa all'utente.
    -   Chiama periodicamente (ogni 3 secondi) un nuovo endpoint del backend: `/api/get-task-result/{task_id}`.
4.  **Recupero Risultato:** L'endpoint di polling restituisce lo stato del task:
    -   `processing`: Il frontend continua a chiamare.
    -   `failed`: Il frontend mostra un errore e si ferma.
    -   `completed`: Il frontend riceve i dati della risposta, aggiorna la chat e si ferma.
5.  **Gestione Cold Start:** Se la prima chiamata (passo 1) fallisce con un timeout (es. 504), il frontend mostra un messaggio specifico per avvisare l'utente del cold start e invitarlo a riprovare dopo circa un minuto.

### Flusso dall'Archivio al Libro (`/archivio`)
1.  L'utente clicca "Manda al Libro" su un capitolo con `stato = 'bozza_in_archivio'`.
2.  La funzione `handlePromoteToLibro` in `ArchivioClient.tsx` viene eseguita.
3.  **Calcolo Ordine:** Viene fatta una query sulla tabella `libro` per trovare il valore `MAX(ordine)` per l'utente corrente. Il nuovo ordine sarà `MAX(ordine) + 1`.
4.  **Copia in `libro`:** Viene creato un **nuovo record** nella tabella `libro` con i dati del capitolo. `capitoli.eco` viene unito in una stringa e salvato in `libro.sottotitolo`. Viene inserito il valore `ordine` calcolato.
5.  **Aggiornamento Stato:** L'attributo `stato` del capitolo **originale** nella tabella `capitoli` viene aggiornato a `'promosso_al_libro'`.

---

## 5. Linee Guida e Errori Noti da Evitare

1.  **Coerenza dei Tipi e Nomi di Colonna:**
    -   **Errore Comune:** Discrepanza tra i nomi delle colonne nel database e i nomi delle proprietà nelle interfacce TypeScript (es. `created_at` vs `timestamp`).
    -   **Regola:** **Sempre verificare** che i nomi delle colonne nel codice (`select`, interfacce, oggetti) corrispondano **esattamente** a quelli nel database Supabase.

2.  **Completezza dei Tipi TypeScript:**
    -   **Errore Comune:** Un'interfaccia TypeScript richiede una proprietà (es. `stato: string`), ma i dati recuperati non la contengono, causando un errore di assegnazione. Oppure, il codice cerca di accedere a una proprietà (es. `capitolo.ordine`) che non è definita nel tipo dell'oggetto.
    -   **Regola:** Assicurarsi che le interfacce TypeScript definite nel frontend riflettano accuratamente la struttura dei dati che rappresentano. Se un campo può essere nullo o assente, deve essere segnato come opzionale (`nome?: tipo`). Se un componente figlio richiede una prop che il genitore non ha, modificare il tipo o mappare i dati prima di passarli.

3.  **Props dei Componenti UI (ShadCN/UI):**
    -   **Errore Comune:** Omissione di props richieste come `variant`, `size`, o `className` durante l'uso di componenti come `Button`.
    -   **Regola:** Anche se non si intende modificare lo stile di default, se una prop è richiesta dal tipo del componente, deve essere fornita.

4.  **Gestione di `react-to-print`:**
    - **Errore Comune:** La libreria `react-to-print` può avere problemi di tipo a seconda della versione di `@types/react` installata.
    - **Regola:** Usare la prop `content` che accetta una funzione che ritorna il `ref` al componente da stampare. Inoltre, è bene usare lo stato `isPrinting` per montare il componente di stampa solo quando necessario.

---

## 6. Processo di Modifica Obbligatorio

Prima di considerare un task o un fix completo e di sottomettere il codice, è **obbligatorio** seguire questi passaggi:

1.  **Aggiornare `PROJECT_RAG.md`:** Se le modifiche alterano la logica, l'architettura, la struttura del DB o introducono nuove convenzioni, questo file **deve** essere aggiornato per riflettere lo stato attuale.
2.  **Aggiornare `CHANGELOG.md`:** Aggiungere una voce chiara e concisa che descriva le modifiche apportate (feature, fix, refactor, etc.).
3.  **Verifica Finale del Codice:** Rileggere le modifiche per individuare errori di battitura, incoerenze o errori di logica. Prestare particolare attenzione ai punti elencati nella Sezione 5.
4.  **(Consigliato) Build Locale:** Eseguire `npm run build` nel frontend per catturare errori di tipo e compilazione prima del deploy.
5.  **Conferma di Correttezza:** Assicurarsi, al meglio delle proprie capacità, che il codice sia corretto, robusto e completo prima di sottometterlo.

---

## 7. Processo Standard di Debug e Correzione

Per minimizzare l'introduzione di nuovi errori e garantire che le correzioni siano allineate con l'architettura esistente, seguire obbligatoriamente questo processo per risolvere bug, specialmente quelli di runtime (es. errori 500, `NameError`).

1.  **Analisi Rigorosa dell'Errore:**
    -   **Fonte Primaria:** Basarsi **sempre** sul messaggio di errore completo e sul traceback fornito dai log (es. Render, Vercel).
    -   **Identificare la Causa Radice:** Identificare la causa esatta dell'errore. Ad esempio, un `NameError: name 'X' is not defined` significa che una funzione, classe o variabile `X` non esiste nello scope in cui viene chiamata.

2.  **Consultare la Documentazione Esistente (`PROJECT_RAG.md`):**
    -   **Verifica dell'Architettura:** Prima di scrivere qualsiasi codice, verificare se la funzionalità o l'entità che causa l'errore (es. una tabella di database, una funzione helper) è documentata in questo file.
    -   **Il RAG è la Verità:** Se una funzionalità non è descritta qui, va considerata inesistente o deprecata.

3.  **Principio della Minima Modifica (Least Change Principle):**
    -   **Non Inventare:** Se una funzione o variabile causa un `NameError` e non è documentata, **non bisogna crearla da zero**. La prima ipotesi deve essere che si tratti di un residuo di codice obsoleto.
    -   **Azione di Default: Rimuovere:** L'azione correttiva di default per il codice non documentato e non funzionante è la **rimozione**. Eliminare la chiamata alla funzione o il blocco di codice che causa l'errore.
    -   **Implementare solo se Documentato:** Creare una nuova funzione o classe solo se la sua esistenza è chiaramente implicita o richiesta dalla documentazione esistente ma risulta mancante nel codice.

4.  **Modifiche Atomiche e Incrementali:**
    -   Risolvere **un solo problema alla volta**. Creare commit e pull request piccoli e mirati. Questo facilita la revisione e, in caso di problemi, l'identificazione della modifica che ha causato l'errore.

5.  **Aggiornare la Documentazione:**
    -   Se una correzione chiarisce un aspetto dell'architettura o introduce una nuova convenzione (come visto con gli errori di `lifespan` o l'ordine dei modelli Pydantic), aggiornare i file `PROJECT_RAG.md` o `CODING_GUIDELINES.md` di conseguenza. La documentazione deve sempre riflettere lo stato attuale del codice funzionante.
