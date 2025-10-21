import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route per cancellare tutti i dati dal database
 * ATTENZIONE: Questo endpoint cancellerà TUTTI i dati!
 * 
 * Uso: POST /api/admin/clear-database
 * Body: { "confirm": "CLEAR_ALL_DATA" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verifica di sicurezza
    if (body.confirm !== 'CLEAR_ALL_DATA') {
      return NextResponse.json(
        { error: 'Conferma richiesta. Invia { "confirm": "CLEAR_ALL_DATA" }' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Verifica che l'utente sia autenticato (opzionale, per sicurezza)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticazione richiesta' },
        { status: 401 }
      );
    }
    
    const results = {
      deletedRecords: 0,
      deletedFiles: 0,
      errors: [] as string[],
      details: [] as string[]
    };
    
    // Lista delle tabelle da svuotare (in ordine per rispettare le foreign keys)
    const tables = [
      'shared_chapters',  // Tabella dei capitoli condivisi
      'libro',           // Tabella del libro (capitoli nel libro)
      'capitoli'         // Tabella principale dei capitoli
    ];
    
    // Cancellazione tabelle
    for (const table of tables) {
      try {
        // Prima conta i record
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          results.errors.push(`Errore nel contare ${table}: ${countError.message}`);
          continue;
        }
        
        if (count === 0) {
          results.details.push(`Tabella ${table} già vuota`);
          continue;
        }
        
        // Cancella tutti i record dell'utente corrente (per sicurezza RLS)
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id); // Solo i dati dell'utente corrente
        
        if (deleteError) {
          results.errors.push(`Errore cancellazione ${table}: ${deleteError.message}`);
        } else {
          results.deletedRecords += count || 0;
          results.details.push(`Cancellati ${count} record da ${table}`);
        }
      } catch (error) {
        results.errors.push(`Errore generale su ${table}: ${error}`);
      }
    }
    
    // Cancellazione storage bucket 'book_covers' (solo file dell'utente)
    try {
      const userFolder = user.id;
      const { data: files, error: listError } = await supabase.storage
        .from('book_covers')
        .list(userFolder, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (listError) {
        results.errors.push(`Errore nel listare i file: ${listError.message}`);
      } else if (files && files.length > 0) {
        // Cancella tutti i file dell'utente
        const filePaths = files.map(file => `${userFolder}/${file.name}`);
        const { error: removeError } = await supabase.storage
          .from('book_covers')
          .remove(filePaths);
        
        if (removeError) {
          results.errors.push(`Errore cancellazione file: ${removeError.message}`);
        } else {
          results.deletedFiles = files.length;
          results.details.push(`Cancellati ${files.length} file dal bucket book_covers`);
        }
      } else {
        results.details.push('Nessun file da cancellare nel bucket book_covers');
      }
    } catch (storageError) {
      results.errors.push(`Errore storage: ${storageError}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cancellazione completata',
      ...results
    });
    
  } catch (error) {
    console.error('Errore API clear-database:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Metodo GET per ottenere informazioni sui dati presenti
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticazione richiesta' },
        { status: 401 }
      );
    }
    
    const stats = {
      capitoli: 0,
      libro: 0,
      shared_chapters: 0,
      files: 0
    };
    
    // Conta i record in ogni tabella
    const tables = ['capitoli', 'libro', 'shared_chapters'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!error && count !== null) {
        stats[table as keyof typeof stats] = count;
      }
    }
    
    // Conta i file nel storage
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('book_covers')
        .list(user.id);
      
      if (!listError && files) {
        stats.files = files.length;
      }
    } catch (storageError) {
      // Ignora errori del storage per le statistiche
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      stats
    });
    
  } catch (error) {
    console.error('Errore API get stats:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}