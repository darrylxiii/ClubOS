import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findMissing() {
  console.log("Checking candidate_profiles...");
  
  // 1. Get all Candidate Profiles from the CSV
  const csvPath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/candidate_profiles.csv';
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  const csvIds = results.data.map(r => r.id);
  
  // 2. Get all Candidate Profiles from the DB
  const { data: dbProfiles, error } = await supabase.from('candidate_profiles').select('id');
  if (error) { console.error(error); return; }
  const dbIds = new Set(dbProfiles.map(r => r.id));
  
  // 3. Find the missing one
  const missingIds = csvIds.filter(id => !dbIds.has(id));
  
  if (missingIds.length > 0) {
    console.log(`Missing candidate_profiles IDs:`, missingIds);
    // Find who they are from the profiles table
    for (const missingId of missingIds) {
       const rawRow = results.data.find(r => r.id === missingId);
       // Get profile details if possible (assuming candidate_profiles has a related id or we check public.profiles)
       const { data: profileObj } = await supabase.from('profiles').select('email, full_name').eq('id', rawRow.id).single();
       console.log(`MISSING CANDIDATE Profile:`, rawRow.id, "| Email:", profileObj?.email, "| Name:", profileObj?.full_name);
    }
  } else {
    console.log("No missing candidate profiles found! Is it possible 337 included a duplicate in CSV?");
  }
  
  
  // Also check workspace_members
  console.log("\nChecking workspace_members...");
  const wmCsvPath = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/tqc_dump/full_data_dump/workspace_members.csv';
  const wmContent = fs.readFileSync(wmCsvPath, 'utf8');
  const wmResults = Papa.parse(wmContent, { header: true, skipEmptyLines: true });
  const wmCsvKeys = wmResults.data.map(r => `${r.workspace_id}-${r.user_id}`);
  
  const { data: dbMembers } = await supabase.from('workspace_members').select('workspace_id, user_id');
  const dbWmKeys = new Set(dbMembers.map(r => `${r.workspace_id}-${r.user_id}`));
  
  const missingWmKeys = wmCsvKeys.filter(k => !dbWmKeys.has(k));
  if (missingWmKeys.length > 0) {
     for (const key of missingWmKeys) {
        const [wId, uId] = key.split('-');
        const { data: wData } = await supabase.from('workspaces').select('name').eq('id', wId).single();
        const { data: uData } = await supabase.from('profiles').select('email').eq('id', uId).single();
        console.log(`MISSING WORKSPACE MEMBER: User [${uData?.email || uId}] in Workspace [${wData?.name || wId}]`);
     }
  }

}

findMissing().catch(console.error);
