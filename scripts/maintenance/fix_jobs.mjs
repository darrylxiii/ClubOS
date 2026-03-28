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

async function fixJobs() {
  const fallbackId = 'b5c66945-1888-4124-a519-21aee0726e0a'; // Romy's ID, which is verified to exist in auth.users
  console.log("Using guaranteed Fallback User ID for orphaned jobs:", fallbackId);

  const filePath = `/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/jobs.csv`;
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const rows = results.data;
  const cleanRows = rows.map(row => {
    const cleanRow = {};
    for (const key in row) {
      if (key === 'created_at' || key === 'updated_at') {
        cleanRow[key] = row[key];
      } else {
        cleanRow[key] = parsePostgresVal(row[key]);
      }
    }
    
    // Schema mismatch fixes for jobs
    delete cleanRow['external_url'];
    delete cleanRow['urgency_score_manual'];
    delete cleanRow['urgency_score_manual_set_at'];
    delete cleanRow['urgency_score_manual_set_by'];
    
    return cleanRow;
  });

  let successCount = 0;
  for (const row of cleanRows) {
    const { error } = await supabase.from('jobs').insert([row]);
    
    if (!error || error.code === '23505') {
       successCount++;
    } else if (error.code === '23503' && error.message.includes('jobs_created_by_fkey')) {
       row.created_by = fallbackId;
       const { error: retryError } = await supabase.from('jobs').insert([row]);
       if (!retryError || retryError.code === '23505') {
          successCount++;
       } else {
          console.error(`Failed to insert job "${row.title}" even with fallback ID:`, retryError.message);
       }
    } else {
       console.error(`Unhandled error for job "${row.title}":`, error.message);
    }
  }

  console.log(`\nSuccessfully imported ${successCount} out of ${rows.length} jobs!`);
}

fixJobs().catch(console.error);
