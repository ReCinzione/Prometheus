# Changelog

Tutte le modifiche significative a questo progetto saranno documentate in questo file.

## [Non Rilasciato] - 2024-07-26

### Aggiunto
- **Architettura di Polling Asincrono per la Chat:**
  - Il backend ora gestisce le richieste a Gemini in background, restituendo immediatamente un `task_id` per migliorare la reattività dell'interfaccia utente e prevenire i timeout.
  - Creato un nuovo endpoint `/api/get-task-result/{task_id}` per permettere al frontend di fare polling per i risultati.
  - Il frontend (`/scrivi`) è stato refattorizzato per utilizzare il nuovo sistema di polling, migliorando l'esperienza utente durante le risposte lunghe e i cold start del server.
- **File di Documentazione e Linee Guida:**
  - `PROJECT_RAG.md`: Un manuale operativo dettagliato sull'architettura, la logica e le convenzioni del progetto.
  - `CODING_GUIDELINES.md`: Un riassunto delle lezioni apprese da errori di build comuni per migliorare la qualità del codice.

### Modificato
- **Flusso di Dati per Archivio e Libro:**
  - La pagina `/archivio` ora legge correttamente dalla tabella `capitoli`.
  - La pagina `/libro` ora legge correttamente dalla tabella `libro` e ordina per la colonna `ordine`.
  - Le operazioni di modifica, eliminazione e ordinamento nella pagina `/libro` ora agiscono correttamente sulla tabella `libro`.
- **Logica di Promozione dei Capitoli:**
  - L'azione "Manda al Libro" nell'archivio ora copia correttamente il capitolo nella tabella `libro` (mappando `eco` a `sottotitolo`) e aggiorna lo stato del capitolo originale in `capitoli` a `'promosso_al_libro'`, risolvendo un bug di duplicazione.
- **Gestione degli Errori del Backend:**
  - Migliorata la gestione delle eccezioni nel backend per restituire errori JSON ben formattati (es. HTTP 504 per timeout di Gemini) invece di risposte non valide.

### Rimosso
- **Funzionalità di Condivisione (Temporaneamente):**
  - La logica relativa alla condivisione dei capitoli (`shared_chapters`) è stata temporaneamente commentata in `LibroPage.tsx` per risolvere errori di build, in attesa di una re-implementazione più semplice basata su una colonna nella tabella `libro`.

### Corretto
- Risolti numerosi errori di tipo TypeScript e di build relativi a props mancanti/errate nei componenti React, nomi di colonna del DB non corrispondenti e definizioni di interfacce incoerenti.

## [Non Rilasciato] - 2025-06-29

### Corretto

-   **Accesso Tabella Libro:** Corretto il nome della tabella da `libri` a `libro` nelle chiamate API frontend a Supabase (`frontend/src/app/(protected)/libro/page.tsx`) per risolvere errori 404.
-   **Payload API Chat:** Rimossi i campi extra `descrizione` e `nome_archetipo` dal payload inviato dalla route API frontend (`frontend/src/app/api/archetipo-gemini/route.ts`) al backend Python per risolvere errori 400/422.
-   **Query Tabella Capitoli:** Rimosso l'ordinamento sulla colonna inesistente `ordine` nelle query frontend alla tabella `capitoli` (`frontend/src/app/(protected)/libro/page.tsx`) per risolvere errori 400. *(Modifica da applicare)*

### Aggiunto

-   **Tracciamento Modifiche:** Creato questo file `CHANGELOG.md` per documentare le modifiche al codice.
