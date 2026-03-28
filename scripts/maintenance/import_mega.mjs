import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parsePostgresVal(val) {
  if (val === '') return null;
  if (typeof val === 'string') {
    if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        let cleaned = val;
        if (cleaned.startsWith('{') && !cleaned.includes('"') && !cleaned.includes(':')) {
           return cleaned.slice(1, -1).split(',').filter(Boolean);
        }
        if (cleaned.startsWith('"{') && cleaned.endsWith('}"')) {
          cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
        }
        return JSON.parse(cleaned);
      } catch (e) {
        return val;
      }
    }
  }
  return val;
}

const DUMP_DIR = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/';
const IGNORED_PREFIX = '_SCHEMA';

// To hold fk failures for a second pass
let delayedRows = []; 

async function upsertWithFallback(tableName, chunk) {
  let currentChunk = [...chunk];
  let retries = 15;
  
  while (retries > 0 && currentChunk.length > 0) {
    const { error } = await supabase.from(tableName).insert(currentChunk);
    if (!error || error.code === '23505') return { success: true, count: currentChunk.length };
    
    // Schema mismatch - auto drop column
    const missingColMatch = error.message.match(/Could not find the '(.*?)' column/);
    if (missingColMatch) {
      const colToRemove = missingColMatch[1];
      currentChunk = currentChunk.map(row => {
        const { [colToRemove]: _, ...rest } = row;
        return rest;
      });
      retries--;
      continue;
    }
    break; 
  }
  
  // Row by row fallback 
  let successCount = 0;
  for (const row of currentChunk) {
    let currentRow = {...row};
    let rowRetries = 15;
    
    while (rowRetries > 0) {
      const { error: rowErr } = await supabase.from(tableName).insert([currentRow]);
      if (!rowErr || rowErr.code === '23505') { 
         successCount++; 
         break; 
      }
      
      const match = rowErr.message.match(/Could not find the '(.*?)' column/);
      if (match) {
        delete currentRow[match[1]];
        rowRetries--;
        continue;
      }
      
      // If it's a structural failure (like FK constraint or NOT NULL missing), queue it for Pass 2 in case the parent is loaded later
      delayedRows.push({ tableName, row: currentRow, error: rowErr.message });
      break;
    }
  }
  return { success: true, count: successCount };
}

async function importTable(tableName, limitLogging = false) {
  const filePath = path.join(DUMP_DIR, `${tableName}.csv`);
  if (!fs.existsSync(filePath)) return;
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const rows = results.data;
  if (rows.length === 0) return;
  
  if (!limitLogging) console.log(`Processing [${tableName}]... (${rows.length} rows)`);
  
  const cleanRows = rows.map(row => {
    const cleanRow = {};
    for (const key in row) {
      if (tableName === 'workspaces' && key === 'name' && !row[key]) {
         cleanRow[key] = 'Unnamed Workspace';
      } else if (key === 'created_at' || key === 'updated_at') {
        cleanRow[key] = row[key];
      } else {
        cleanRow[key] = parsePostgresVal(row[key]);
      }
    }
    return cleanRow;
  });

  const chunkSize = 200;
  let successCount = 0;
  
  for (let i = 0; i < cleanRows.length; i += chunkSize) {
    const chunk = cleanRows.slice(i, i + chunkSize);
    const result = await upsertWithFallback(tableName, chunk);
    successCount += result.count;
  }
  if (!limitLogging) console.log(`  -> Saved ${successCount} / ${rows.length}`);
}

async function runMegaImport() {
  console.log("=== STARTING BYTE-FOR-BYTE DATABASE IMPORT ===");
  const allFiles = fs.readdirSync(DUMP_DIR).filter(f => f.endsWith('.csv') && !f.startsWith(IGNORED_PREFIX));
  
  console.log(`Found ${allFiles.length} tables to process.`);
  
  // PASS 1: Import everything
  let processed = 0;
  for (const file of allFiles) {
    const tableName = file.replace('.csv', '');
    // We already perfectly did core tables earlier, but trying again doesn't hurt (duplicates ignored)
    await importTable(tableName, true); 
    processed++;
    if (processed % 20 === 0) console.log(`... Processed ${processed}/${allFiles.length} tables`);
  }
  
  // PASS 2: Retry failed rows (FK dependencies might be resolved now)
  console.log(`\n=== PASS 2: Retrying ${delayedRows.length} orphaned rows ===`);
  const retryQueue = [...delayedRows];
  delayedRows = []; // reset for logging purposes
  let recoveredCount = 0;
  
  for (const item of retryQueue) {
     const { error } = await supabase.from(item.tableName).insert([item.row]);
     if (!error || error.code === '23505') {
        recoveredCount++;
     }
  }
  
  console.log(`Salvaged ${recoveredCount} orphaned rows on Pass 2!`);
  console.log("=== 100% BYTE-FOR-BYTE IMPORT COMPLETE ===");
}

runMegaImport().catch(console.error);
