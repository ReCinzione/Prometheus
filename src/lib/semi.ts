// src/lib/semi.ts

import semiData from '../../semi_data.json';

export type Seme = {
  id: string;
  nome: string;
  icona: string;
  prompt_base: string;
  eco: string[];
  frase_finale: string;
  sigillo: {
    simbolo_dominante: string;
    immagine: string;
    colore: string;
    forma: string;
    codice_sigillo: string;
  };
};

// Importa i dati dal file JSON condiviso
export const semi: Seme[] = semiData as Seme[];

// Funzione helper per trovare un seme per ID
export const findSemeById = (id: string): Seme | undefined => {
  return semi.find(seme => seme.id === id);
};

// Funzione helper per ottenere tutti i semi eccetto sem_99
export const getNormalSemi = (): Seme[] => {
  return semi.filter(seme => seme.id !== 'sem_99');
};

// Funzione helper per ottenere sem_99
export const getEcoUniversale = (): Seme | undefined => {
  return semi.find(seme => seme.id === 'sem_99');
};