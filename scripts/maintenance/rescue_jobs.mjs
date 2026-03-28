import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function customCSVParse(fileContent) {
    let rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < fileContent.length; i++) {
        let char = fileContent[i];
        let nextChar = fileContent[i+1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++; // skip next
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // Push the last row if it exists
    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    
    return rows;
}

function parsePostgresVal(val) {
  if (val === '') return null;
  return val;
}

async function rescueJobs() {
  console.log("=== RESCUING MISSING JOBS ===");
  const filePath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/jobs.csv';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const rawRows = customCSVParse(fileContent);
  console.log(`Custom parser extracted: ${rawRows.length} total rows`);
  
  if (rawRows.length < 2) return;
  
  const headers = rawRows[0];
  const actualDataRows = rawRows.slice(1).filter(r => r.length > 1);
  console.log(`Valid data rows: ${actualDataRows.length}`);
  
  const objects = actualDataRows.map(rowCols => {
      let obj = {};
      for (let i = 0; i < headers.length; i++) {
          if (rowCols[i] !== undefined) {
             obj[headers[i]] = parsePostgresVal(rowCols[i]);
          }
      }
      return obj;
  });
  
  let successCount = 0;
  let errorMap = {};
  
  for (let i = 0; i < objects.length; i++) {
      let cleanRow = {...objects[i]};
      
      // Handle schema differences
      const columnsToRemove = [
          'job_description_url', 'view_count', 'applicant_count', 'published_days',
          'supporting_documents', 'pipeline_stages', 'job_fee_type', 'job_fee_percentage',
          'job_fee_fixed', 'fee_source', 'referral_bonus_percentage', 'referral_bonus_fixed',
          'show_referral_bonus', 'department', 'salary_period', 'jd_uploaded_by',
          'jd_uploaded_at', 'jd_uploader_name', 'greenhouse_job_id', 'club_sync_activated_at',
          'external_url', 'nice_to_have', 'experience_level', 'seniority_level', 'location_type'
      ];
      
      for (const col of columnsToRemove) {
          delete cleanRow[col];
      }
      
      // Clean up values
      if (!cleanRow.company_id || cleanRow.company_id === 'null' || cleanRow.company_id.trim() === '') {
         // Some jobs might have no company_id? Skip or set to null.
         delete cleanRow.company_id;
      }
      
      if (!cleanRow.job_embedding || typeof cleanRow.job_embedding !== 'string' || !cleanRow.job_embedding.startsWith('[')) {
          delete cleanRow.job_embedding;
      }
      
      const { error } = await supabase.from('jobs').insert([cleanRow]);
      
      if (!error || error.code === '23505') {
          successCount++;
      } else {
          // If it fails due to a missing column, log it and we can delete it
          const match = error.message.match(/Could not find the '(.*?)' column/);
          if (match) {
             const col = match[1];
             delete cleanRow[col];
             // retry once
             const { error: retryErr } = await supabase.from('jobs').insert([cleanRow]);
             if (!retryErr || retryErr.code === '23505') successCount++;
             else {
                if (!errorMap[retryErr.message]) errorMap[retryErr.message] = 0;
                errorMap[retryErr.message]++;
             }
          } else {
            if (!errorMap[error.message]) errorMap[error.message] = 0;
            errorMap[error.message]++;
          }
      }
  }
  
  console.log(`\nRescue Complete.`);
  console.log(`Successfully Saved / Already Existed: ${successCount}`);
  if (Object.keys(errorMap).length > 0) {
      console.log("Errors preventing insertion:", errorMap);
  }
}

rescueJobs().catch(console.error);
