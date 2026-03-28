import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const dummyId = '11111111-2222-3333-4444-555555555555';
  
  const { data, error } = await supabase.from('profiles').insert([
    { id: dummyId, email: 'dummy@test.com', full_name: 'Dummy Test' }
  ]);
  
  console.log("Insert result:", { data, error });
  
  if (!error) {
    await supabase.from('profiles').delete().eq('id', dummyId);
    console.log("Deleted dummy profile.");
  }
}

check();
