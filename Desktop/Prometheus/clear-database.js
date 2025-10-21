/**
 * Script per cancellare tutti i dati dal database Supabase
 * ATTENZIONE: Questo script cancellerà TUTTI i dati dalle tabelle principali!
 * 
 * Per eseguire:
 * 1. Assicurati che Node.js sia installato
 * 2. Installa le dipendenze: npm install @supabase/supabase-js
 * 3. Configura le variabili d'ambiente nel file .env.local
 * 4. Esegui: node clear-database.js
 */

require('dotenv').config({ path: './frontend/.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configurazione Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Errore: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devono essere configurati nel file .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDatabase() {
  console.log('🚨 ATTENZIONE: Stai per cancellare TUTTI i dati dal database!');
  console.log('⏳ Inizio cancellazione...');
  
  try {
    // Lista delle tabelle da svuotare (in ordine per rispettare le foreign keys)
    const tables = [
      'shared_chapters',  // Tabella dei capitoli condivisi
      'libro',           // Tabella del libro (capitoli nel libro)
      'capitoli'         // Tabella principale dei capitoli
    ];
    
    let totalDeleted = 0;
    
    for (const table of tables) {
      console.log(`🗑️  Cancellazione tabella: ${table}`);
      
      // Prima conta i record
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`❌ Errore nel contare i record di ${table}:`, countError.message);
        continue;
      }
      
      if (count === 0) {
        console.log(`✅ Tabella ${table} già vuota`);
        continue;
      }
      
      console.log(`📊 Trovati ${count} record in ${table}`);
      
      // Cancella tutti i record
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Condizione che matcha tutti i record
      
      if (deleteError) {
        console.error(`❌ Errore nella cancellazione di ${table}:`, deleteError.message);
      } else {
        console.log(`✅ Cancellati ${count} record da ${table}`);
        totalDeleted += count;
      }
    }
    
    // Cancellazione storage bucket 'book_covers'
    console.log('🗑️  Cancellazione storage bucket: book_covers');
    
    try {
      // Lista tutti i file nel bucket
      const { data: files, error: listError } = await supabase.storage
        .from('book_covers')
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (listError) {
        console.error('❌ Errore nel listare i file del bucket:', listError.message);
      } else if (files && files.length > 0) {
        console.log(`📊 Trovati ${files.length} file nel bucket book_covers`);
        
        // Cancella tutti i file
        const filePaths = files.map(file => file.name);
        const { error: removeError } = await supabase.storage
          .from('book_covers')
          .remove(filePaths);
        
        if (removeError) {
          console.error('❌ Errore nella cancellazione dei file:', removeError.message);
        } else {
          console.log(`✅ Cancellati ${files.length} file dal bucket book_covers`);
        }
      } else {
        console.log('✅ Bucket book_covers già vuoto');
      }
    } catch (storageError) {
      console.error('❌ Errore nell\'accesso al storage:', storageError.message);
    }
    
    console.log('\n🎉 Cancellazione completata!');
    console.log(`📊 Totale record cancellati: ${totalDeleted}`);
    console.log('\n⚠️  Nota: Se hai configurato Row Level Security (RLS), alcuni record potrebbero non essere stati cancellati se non hai i permessi necessari.');
    
  } catch (error) {
    console.error('❌ Errore generale:', error.message);
  }
}

// Richiedi conferma prima di procedere
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  Sei sicuro di voler cancellare TUTTI i dati? Digita "CONFERMA" per procedere: ', (answer) => {
  if (answer === 'CONFERMA') {
    clearDatabase().finally(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('❌ Operazione annullata.');
    rl.close();
    process.exit(0);
  }
});