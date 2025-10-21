'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CheckCircle, X } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    title: "Benvenuto/a in Prometheus!",
    content: "Questa guida ti aiuterà a scoprire le funzionalità principali dell'applicazione. Prometheus è uno strumento per l'esplorazione interiore e la scrittura creativa guidata da 'semi' di introspezione.",
  },
  {
    title: "Navigazione Principale",
    content: "In alto troverai i link per navigare:\n- Home: La tua dashboard.\n- Mandala: Scegli un 'Seme' (archetipo) per iniziare un'interazione.\n- Scrivi: Dove avvengono le interazioni con i Semi (si accede tramite il Mandala).\n- Archivio: Rivedi tutte le tue interazioni passate.\n- Libro: Componi il tuo 'Libro Vivente' con i capitoli derivati dalle interazioni.\n- Percorsi: Segui percorsi guidati di più Semi.",
  },
  {
    title: "Iniziare con un Seme (Mandala & Scrivi)",
    content: "Vai al 'Mandala' per visualizzare i Semi disponibili. Clicca su un Seme per conoscerne il tema. Se ti ispira, clicca 'Inizia a Scrivere con questo Seme' per avviare un dialogo guidato nella pagina 'Scrivi'. Rispondi alle riflessioni proposte da Prometheus.",
  },
  {
    title: "L'Archivio delle Interazioni",
    content: "Ogni tua sessione di scrittura con un Seme viene salvata integralmente nell' 'Archivio'. Qui puoi rileggere tutti i passaggi: le tue risposte e le elaborazioni di Prometheus. Questo è il tuo storico grezzo.",
  },
  {
    title: "Creare il Tuo Libro Vivente",
    content: "Dall' 'Archivio', puoi scegliere una sessione completata e cliccare su 'Crea Capitolo'. Questo trasferirà l'essenza dell'interazione nella sezione 'Libro'. Nel 'Libro', puoi modificare il contenuto dei capitoli, riordinarli e impostare una copertina. È il tuo spazio creativo finale.",
  },
  {
    title: "I Percorsi Guidati",
    content: "I 'Percorsi' offrono sequenze curate di Semi per esplorare temi più ampi o seguire un particolare viaggio di auto-scoperta. Completare un percorso può offrire intuizioni uniche.",
  },
  {
    title: "Esplora e Crea!",
    content: "Questo è solo l'inizio. Sperimenta con i Semi, componi il tuo Libro e scopri nuove prospettive. Puoi rivedere questa guida in qualsiasi momento dalla Home page. Buona esplorazione!",
  },
];

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose(); // Finish on last step
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0); // Reset for next time
    onClose();
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            {step.title} (Passo {currentStep + 1} di {tutorialSteps.length})
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 px-1 flex-grow overflow-y-auto">
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {step.content}
          </p>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <div className="flex justify-between w-full">
            {currentStep > 0 ? (
              <Button variant="outline" size="default" className="gap-1" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4" /> Precedente
              </Button>
            ) : (
              <div></div> // Placeholder for spacing
            )}

            {currentStep < tutorialSteps.length - 1 ? (
              <Button variant="default" size="default" className="gap-1" onClick={handleNext}>
                Successivo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="default" size="default" className="bg-green-600 hover:bg-green-700 gap-1" onClick={handleClose}>
                <CheckCircle className="h-4 w-4" /> Termina Guida
              </Button>
            )}
          </div>
        </DialogFooter>
         <DialogClose asChild className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" className="" onClick={handleClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Chiudi</span>
            </Button>
          </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
