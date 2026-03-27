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

async function fixDarryl() {
  const email = 'darryl@thequantumclub.nl';
  
  console.log("Looking up Darryl's current OAuth profile...");
  const { data: currentProfile, error: qErr } = await supabase.from('profiles').select('id').eq('email', email).single();
  
  if (!currentProfile) {
     console.error("Could not find Darryl's profile by email in the DB. Is it darryl@thequantumclub.nl or darryl.qualogy@...? Error:", qErr);
     return;
  }
  
  console.log("Darryl's CURRENT DB UUID:", currentProfile.id);
  
  // Get Darryl's OLD UUID from CSV
  const profilesCsvPath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/profiles.csv';
  const fileContent = fs.readFileSync(profilesCsvPath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  
  const oldProfile = results.data.find(r => r.email === email);
  if (!oldProfile) {
     console.error("Could not find Darryl's old profile in profiles.csv! Check the email.");
     return;
  }
  
  console.log("Darryl's OLD CSV UUID:", oldProfile.id);
  
  // Provide full access
  const cleanRow = { ...oldProfile, id: currentProfile.id };
  
  for (const k in cleanRow) {
      if (k === 'created_at' || k === 'updated_at') {
         // Keep string
      } else {
         cleanRow[k] = parsePostgresVal(cleanRow[k]);
      }
  }
  
  cleanRow.role = 'admin';
  cleanRow.system_role = 'admin';
  cleanRow.onboarding_completed = true;
  cleanRow.account_status = 'approved';
  
  const tempRolesArray = ['admin', 'partner', 'candidate'];
  if (cleanRow.roles_array === null) cleanRow.roles_array = tempRolesArray;

  const { error: pErr } = await supabase.from('profiles').upsert(cleanRow);
  if (pErr) {
     console.error("Error updating Darryl's profile:", pErr.message);
  } else {
     console.log("Successfully restored Darryl's profile data and granted Admin/Partner/Candidate access!");
  }
}

fixDarryl().catch(console.error);
