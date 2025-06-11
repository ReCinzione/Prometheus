'use client';

import { forwardRef } from 'react';
import { User } from '@supabase/supabase-js';
// Removed Image from 'next/image' as it might not be needed if not displaying complex images here
// and to simplify if direct src is used for any potential icons.

// Define the structure of a chapter based on the 'capitoli' table
export interface Capitolo {
  id: string; // or number, depending on your schema (UUIDs are often strings)
  user_id: string;
  titolo: string;
  contenuto: string;
  ordine: number;
  stato: string;
  seme_id?: string | null; // From which seed it originated, if any
  icona?: string | null; // Icon for the chapter
  eco?: string[] | null; // Ecos, if stored with chapter
  frase_finale?: string | null; // Concluding phrase, if stored
  // Add any other fields from 'capitoli' table that you want to use
}

interface LibroViventeProps {
  user: User;
  chapters: Capitolo[]; // Chapters are now passed as a prop
  // Add book title and cover URL if they should be displayed here for printing
  bookTitle?: string;
  coverImageUrl?: string | null;
}

const LibroVivente = forwardRef<HTMLDivElement, LibroViventeProps>(
  ({ user, chapters, bookTitle, coverImageUrl }, ref) => {

  // Removed internal state for entries, loading, error, cover generation, etc.
  // This component now primarily focuses on displaying the passed chapters.

  if (!chapters || chapters.length === 0) {
    return (
      <div ref={ref} className="text-center py-20">
        <p className="text-muted-foreground mb-2">Il tuo libro è ancora vuoto o nessun capitolo da visualizzare.</p>
        <p className="text-sm text-gray-500">Aggiungi capitoli al tuo libro per vederli qui.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-12 mt-10 px-6 max-w-3xl mx-auto print-container">
      {/* Optional: Display Book Title and Cover at the start of the printable document */}
      {/* This part is for the PDF export view. The main cover display is in libro/page.tsx */}
      <style jsx global>{`
        @media print {
          .print-container {
            margin-top: 0;
            padding: 0;
          }
          .chapter-page-break {
            page-break-before: always;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>

      {/* This is a conceptual placement for a printable cover and title page */}
      {/* Actual PDF generation might handle this differently or via CSS print styles */}
      <div className="text-center mb-12 print-cover-page">
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt="Copertina del Libro"
            className="w-full max-w-md mx-auto h-auto object-contain shadow-lg mb-8"
            style={{aspectRatio: '6/9'}}
          />
        )}
        <h1 className="text-5xl font-bold text-gray-900 mb-4 print-title">
          {bookTitle || 'Il Mio Libro Vivente'}
        </h1>
        {/* You could add author name (user.email or a profile name) here if desired */}
      </div>


      {/* Chapters */}
      {chapters.map((chapter, index) => (
        <article key={chapter.id} className="break-inside-avoid-page chapter-page-break">
          <header className="mb-6 text-center pt-8"> {/* Added pt-8 for spacing after page break */}
            <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
              {chapter.titolo}
            </h2>
            {/* Display other chapter metadata if needed, e.g., chapter.icona or chapter.frase_finale */}
            {chapter.frase_finale && chapter.frase_finale !== chapter.titolo && (
               <p className="text-lg text-gray-700 italic leading-relaxed mb-4">
                 &quot;{chapter.frase_finale}&quot;
               </p>
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 leading-relaxed whitespace-pre-line text-justify">
              {chapter.contenuto}
            </div>
          </div>

          {/* No separator needed if each chapter starts on a new page for printing */}
          {/* {index < chapters.length - 1 && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center space-x-2">
                <div className="h-px bg-gray-300 w-16"></div>
                <span className="text-gray-400 text-2xl">❋</span>
                <div className="h-px bg-gray-300 w-16"></div>
              </div>
            </div>
          )} */}
        </article>
      ))}

      <footer className="text-center py-8 mt-16 border-t border-gray-200 no-print">
        <p className="text-sm text-gray-500 italic">
          Il tuo Libro Vivente - {chapters.length} {chapters.length === 1 ? 'capitolo' : 'capitoli'}
        </p>
      </footer>
    </div>
  );
});

LibroVivente.displayName = 'LibroVivente';
export default LibroVivente;
