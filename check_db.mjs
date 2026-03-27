import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking DB connection...");
  
  // Try to get one profile
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, email').limit(5);
  console.log("Profiles in DB:", profiles, pError);
  
  // Try to list users via Admin API
  const { data: users, error: uError } = await supabase.auth.admin.listUsers();
  console.log(`Total auth.users: ${users?.users?.length || 0}`, uError?.message || '');
  
}

check();
