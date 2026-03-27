import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parsePostgresVal(val) {
  if (val === '') return null;
  return val;
}

async function diagnose() {
  const filePath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/jobs.csv';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  const rows = results.data;
  
  console.log(`Parsed ${rows.length} rows.`);
  
  // Try inserting just the first 50 jobs one by one and surface the actual error
  let checkCount = 0;
  let successCount = 0;
  let errorMap = {};
  
  for (const row of rows) {
    if (checkCount > 100) break;
    
    let cleanRow = {};
    for (const key in row) {
        if (key === 'job_embedding') continue; // Too large for logging
        cleanRow[key] = parsePostgresVal(row[key]);
    }
    
    // Auto-strip columns missing from schema just like import_mega did
    delete cleanRow.job_description_url;
    delete cleanRow.supporting_documents;
    delete cleanRow.pipeline_stages;
    delete cleanRow.job_fee_type;
    delete cleanRow.job_fee_percentage;
    delete cleanRow.job_fee_fixed;
    delete cleanRow.fee_source;
    delete cleanRow.referral_bonus_percentage;
    delete cleanRow.referral_bonus_fixed;
    delete cleanRow.show_referral_bonus;
    delete cleanRow.department;
    delete cleanRow.salary_period;
    delete cleanRow.jd_uploaded_by;
    delete cleanRow.jd_uploaded_at;
    delete cleanRow.jd_uploader_name;
    delete cleanRow.greenhouse_job_id;
    delete cleanRow.club_sync_activated_at;
    
    const { error } = await supabase.from('jobs').insert([cleanRow]);
    
    if (error) {
       if (error.code === '23505') {
           // Duplicate key, means it was already imported successfully before
           successCount++;
       } else {
           if (!errorMap[error.message]) errorMap[error.message] = 0;
           errorMap[error.message]++;
       }
    } else {
       successCount++;
    }
    checkCount++;
  }
  
  console.log(`Tested ${checkCount} jobs.`);
  console.log(`Success / Already Exists: ${successCount}`);
  console.log("Errors preventing import:");
  console.log(errorMap);
}

diagnose().catch(console.error);
