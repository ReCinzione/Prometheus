# Linee Guida per lo Sviluppo e Lezioni Apprese

Questo file documenta alcune lezioni apprese durante lo sviluppo per aiutare a prevenire errori comuni e migliorare la qualità del codice.

## Gestione degli Errori di Tipo con Componenti UI (es. ShadCN/UI)

Durante l'implementazione, si sono verificati alcuni errori di compilazione TypeScript relativi all'uso del componente `Button` (presumibilmente da ShadCN/UI o una libreria simile).

**Errori Comuni Riscontrati:**

1.  **Mancanza di Proprietà Richieste ma Stilisticamente "Invisibili":**
    *   **Problema:** Il componente `Button` richiedeva proprietà come `className` e `size` anche quando non si intendeva sovrascrivere lo stile di default o la dimensione. Non fornirle causava un errore di tipo.
    *   **Lezione:** I tipi TypeScript per i componenti UI sono la fonte di verità. Se una prop è definita come richiesta (non opzionale, cioè senza `?`), deve essere fornita, anche se si accetta il suo valore di default implicito o non si intende modificarne l'aspetto tramite quella prop specifica.
    *   **Prevenzione:**
        *   Controllare sempre la definizione di tipo del componente o la documentazione per le props richieste.
        *   Fornire valori di default espliciti (es. `className=""`, `size="default"`) se la prop è richiesta ma non si necessita di un valore specifico.

2.  **Rimozione Accidentale di Proprietà Richieste Durante Modifiche:**
    *   **Problema:** Durante la correzione di un errore di tipo (aggiungendo `className` e `size`), la prop `variant` (anch'essa richiesta) è stata accidentalmente omessa da uno dei componenti `Button`.
    *   **Lezione:** Quando si modificano le props di un componente, specialmente se si interviene su più props o si fa un refactoring rapido, è facile commettere errori di omissione.
    *   **Prevenzione:**
        *   Effettuare una doppia verifica di tutte le props richieste del componente dopo aver apportato modifiche.
        *   Modificare una prop alla volta, se possibile, e verificare, specialmente se non si ha un forte supporto dall'IDE per il controllo dei tipi in tempo reale.

**Strategie Generali di Prevenzione per Errori di Tipo e Build:**

*   **Linting e Type Checking nell'IDE:** Configurare l'ambiente di sviluppo integrato (IDE) per evidenziare gli errori TypeScript e di linting in tempo reale. Questo fornisce un feedback immediato.
*   **Build Locale Prima del Commit/Push:** Eseguire il comando di build del progetto (es. `npm run build` o `yarn build`) localmente prima di inviare le modifiche. Questo può catturare errori di compilazione che potrebbero non essere immediatamente evidenti durante lo sviluppo.
*   **Revisione Attenta delle Modifiche:** Prima di committare, rivedere i `diff` delle modifiche apportate, prestando particolare attenzione alle chiamate dei componenti e alle loro proprietà.
*   **Familiarizzare con le API dei Componenti:** Dedicare tempo a comprendere le API e le props dei componenti UI di terze parti utilizzati frequentemente.
*   **Creare Componenti Wrapper (Opzionale):** Se si utilizzano componenti di terze parti con molte props richieste che spesso hanno valori di default, si potrebbe considerare la creazione di componenti wrapper personalizzati che pre-impostano queste props per semplificare l'uso.

## Flusso di Lavoro Suggerito

1.  Implementare la funzionalità.
2.  Controllare gli errori TypeScript/Linter nell'IDE.
3.  (Consigliato) Eseguire `npm run build` localmente.
4.  Rivedere le modifiche.
5.  Committare e fare push.
6.  Verificare il build sul server di deploy (es. Netlify).
7.  Procedere con il testing funzionale.

Seguendo queste linee guida, possiamo ridurre il numero di cicli di debug dovuti a errori di tipo e compilazione, e concentrarci maggiormente sulla logica applicativa e sul testing funzionale.
