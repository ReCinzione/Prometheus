# Changelog

Tutte le modifiche significative a questo progetto saranno documentate in questo file.

## [Non Rilasciato] - 2025-06-29

### Corretto

-   **Accesso Tabella Libro:** Corretto il nome della tabella da `libri` a `libro` nelle chiamate API frontend a Supabase (`frontend/src/app/(protected)/libro/page.tsx`) per risolvere errori 404.
-   **Payload API Chat:** Rimossi i campi extra `descrizione` e `nome_archetipo` dal payload inviato dalla route API frontend (`frontend/src/app/api/archetipo-gemini/route.ts`) al backend Python per risolvere errori 400/422.
-   **Query Tabella Capitoli:** Rimosso l'ordinamento sulla colonna inesistente `ordine` nelle query frontend alla tabella `capitoli` (`frontend/src/app/(protected)/libro/page.tsx`) per risolvere errori 400. *(Modifica da applicare)*

### Aggiunto

-   **Tracciamento Modifiche:** Creato questo file `CHANGELOG.md` per documentare le modifiche al codice.
