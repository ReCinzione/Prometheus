export type Archetipo = {
  id: number;
  nome: string;
  semi: number[];
  descrizione: string;
  badge?: string;
};

export const archetipi: Archetipo[] = [
  {
    id: 101,
    nome: 'Il Viandante',
    semi: [3, 7, 12],
    descrizione: `Simbolo della ricerca e dell'esplorazione interiore. Il Viandante incarna il desiderio di scoperta e la volontà di affrontare l'ignoto.`,
    badge: '🧭'
  },
  {
    id: 102,
    nome: 'Il Custode',
    semi: [2, 5, 9],
    descrizione: `Rappresenta la protezione e la cura. Il Custode è colui che preserva la saggezza e guida gli altri con compassione.`,
    badge: '🛡️'
  },
  {
    id: 103,
    nome: "L'Alchimista",
    semi: [4, 8, 13],
    descrizione: `Simbolo della trasformazione e della trasmutazione. L'Alchimista cerca di convertire le esperienze in saggezza.`,
    badge: '⚗️'
  },
  {
    id: 104,
    nome: 'La Sentinella',
    semi: [6, 10, 14],
    descrizione: `Rappresenta la vigilanza e la consapevolezza. La Sentinella osserva attentamente il mondo, pronta ad agire con discernimento.`,
    badge: '👁️'
  },
  {
    id: 105,
    nome: 'Il Sognatore',
    semi: [1, 11, 15],
    descrizione: `Simbolo dell'immaginazione e della visione. Il Sognatore vede oltre l'ordinario, immaginando nuove possibilità.`,
    badge: '🌙'
  },
  {
    id: 106,
    nome: 'Il Guaritore',
    semi: [16, 17, 18],
    descrizione: `Rappresenta la guarigione e la rinascita. Il Guaritore trasforma il dolore in crescita e comprensione.`,
    badge: '💧'
  },
  {
    id: 107,
    nome: 'Il Ribelle',
    semi: [19, 20, 21],
    descrizione: `Simbolo della sfida e del cambiamento. Il Ribelle rompe le convenzioni per creare nuove strade.`,
    badge: '🔥'
  },
  {
    id: 108,
    nome: 'Il Saggio',
    semi: [22, 23, 24],
    descrizione: `Rappresenta la conoscenza e la comprensione profonda. Il Saggio guida con saggezza e introspezione.`,
    badge: '🦉'
  }
]; 