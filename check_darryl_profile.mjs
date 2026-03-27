import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking Darryl profiles...");
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('email', '%darryl%');
  console.log(JSON.stringify(profiles, null, 2));

  console.log("Checking Jobs sample...");
  const { data: jobs } = await supabase.from('jobs').select('id, title, status, created_by, workspace_id').limit(3);
  console.log(jobs);
}

check().catch(console.error);
