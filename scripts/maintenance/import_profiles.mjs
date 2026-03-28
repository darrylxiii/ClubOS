import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
// Using the provided service role key
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parsePostgresVal(val) {
  if (val === '') return null; // Convert empty strings to null
  if (typeof val === 'string') {
    if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        // Handle double-escaped strings like "{""key"": value}" -> '{"key": value}'
        let cleaned = val;
        if (cleaned.startsWith('"{') && cleaned.endsWith('}"')) {
          cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
        } else if (cleaned.startsWith('{""') || cleaned.startsWith('{"')) {
           // Normal JSON string but potentially with postgres array syntax vs json syntax
        }
        
        // Postgres arrays {a,b,c} vs JSON {"a":"b"}
        if (cleaned.startsWith('{') && !cleaned.includes('"')) {
             // Postgres array e.g. {Amsterdam,London}
             return cleaned.slice(1, -1).split(',').filter(Boolean);
        }
        
        return JSON.parse(cleaned);
      } catch (e) {
        // If it fails to parse as JSON, maybe it's a string that just starts with {
        return val;
      }
    }
  }
  return val;
}

async function importProfiles(filePath) {
  console.log(`Reading ${filePath}...`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const results = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const rows = results.data;
  console.log(`Found ${rows.length} rows to import.`);
  
  let successCount = 0;
  
  for (const row of rows) {
    const id = row.id;
    const email = row.email;
    
    if (id && email) {
      // 1. Recreate auth.user to satisfy foreign keys
      const { data: user, error: authError } = await supabase.auth.admin.createUser({
        id: id,
        email: email,
        password: 'TempPassword123!',
        email_confirm: true,
      });
      
      if (authError && !authError.message.includes('already registered')) {
        console.warn(`Failed to create auth user for ${email}:`, authError.message);
        // Continue anyway, maybe it exists but the error is different
      } else if (!authError) {
        console.log(`Created auth.user for ${email}`);
      }
    }

    // 2. Clean up the row for insertion
    const cleanRow = {};
    for (const key in row) {
      cleanRow[key] = parsePostgresVal(row[key]);
    }
    
    // 3. Upsert profile
    const { error: upsertError } = await supabase.from('profiles').upsert(cleanRow);
    
    if (upsertError) {
      console.error(`Error upserting profile for ${email || id}:`, upsertError.message);
    } else {
      successCount++;
    }
  }
  
  console.log(`Finished importing profiles. Successfully inserted/updated ${successCount}/${rows.length} records.`);
}

const dumpPath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/profiles.csv';
importProfiles(dumpPath).catch(console.error);

