import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

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

const tableOrder = [
  'workspace_members',
  'jobs',
  'candidate_profiles',
  'applications',
  'interviews',
  'messages',
  'notifications',
  'company_candidate_feedback'
];

async function upsertWithRetry(tableName, chunk) {
  let currentChunk = [...chunk];
  let retries = 20;
  
  while (retries > 0 && currentChunk.length > 0) {
    const { error } = await supabase.from(tableName).insert(currentChunk);
    
    if (!error) {
       return { success: true, count: currentChunk.length };
    }
    
    if (error.code === '23505') { 
      break; 
    }
    
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
    
    // Otherwise fallback to row-by-row parsing
    break;
  }
  
  // Row by row fallback to skip bad rows
  let successCount = 0;
  let printLimit = 1;

  for (const row of currentChunk) {
    let currentRow = {...row};
    let rowRetries = 20;

    while (rowRetries > 0) {
      const { error: rowErr } = await supabase.from(tableName).insert([currentRow]);
      
      if (!rowErr) { 
        successCount++; 
        break; 
      }
      
      if (rowErr.code === '23505') { 
        successCount++; // Treat dupes as success for import scripts
        break; 
      }
      
      const match = rowErr.message.match(/Could not find the '(.*?)' column/);
      if (match) {
        delete currentRow[match[1]];
        rowRetries--;
        continue;
      }
      
      if (tableName === 'notifications' && rowErr.message.includes('violates not-null constraint')) {
        currentRow.message = "System Notification";
        rowRetries--;
        continue;
      }

      if (printLimit > 0) {
         console.log(`  Row skip [${tableName}]: ${rowErr.message}`);
         printLimit--;
      }
      break;
    }
  }

  return { success: true, count: successCount };
}

async function importTable(tableName) {
  const filePath = `/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/${tableName}.csv`;
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${tableName} - file not found.`);
    return;
  }
  
  console.log(`\nImporting ${tableName}...`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const rows = results.data;
  if (rows.length === 0) return;
  
  const cleanRows = rows.map(row => {
    const cleanRow = {};
    for (const key in row) {
      if (tableName === 'workspaces' && key === 'name' && (row[key] === '' || !row[key])) {
         cleanRow[key] = 'Unnamed Workspace';
      } else if (key === 'created_at' || key === 'updated_at') {
        cleanRow[key] = row[key];
      } else {
        cleanRow[key] = parsePostgresVal(row[key]);
      }
    }
    return cleanRow;
  });

  const chunkSize = 100;
  let successCount = 0;
  
  for (let i = 0; i < cleanRows.length; i += chunkSize) {
    const chunk = cleanRows.slice(i, i + chunkSize);
    const result = await upsertWithRetry(tableName, chunk);
    if (result.success) {
      successCount += result.count;
    }
  }
  console.log(`Successfully completed import for ${tableName}: ${successCount}/${rows.length} rows inserted/skipped.`);
}

async function run() {
  for (const table of tableOrder) {
    await importTable(table);
  }
  console.log("All done!");
}

run().catch(console.error);
