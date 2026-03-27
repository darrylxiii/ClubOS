import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkCompanies() {
  console.log("Checking if 'companies' table exists and has data...");
  const { data: companies, error: cErr } = await supabase.from('companies').select('id, name').limit(3);
  console.log("Companies:", companies, cErr?.message || '');
  
  console.log("\nChecking 'workspaces'...");
  const { data: workspaces, error: wErr } = await supabase.from('workspaces').select('id, name').limit(3);
  console.log("Workspaces:", workspaces, wErr?.message || '');

  console.log("\nChecking 'jobs' company_id vs workspace_id...");
  const { data: jobs, error: jErr } = await supabase.from('jobs').select('id, title, company_id, workspace_id').limit(3);
  console.log("Jobs:", jobs, jErr?.message || '');
}

checkCompanies().catch(console.error);
