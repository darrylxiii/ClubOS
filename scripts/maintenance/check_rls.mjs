import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
// Notice we use postgres driver or rpc to query pg_policies because REST API might not expose pg_policies
// Actually, I'll just check if the admin user is in company_members, because the RLS might only allow company_members!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRLSWorkaround() {
  const targetUUID = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5';
  
  console.log("Checking if Darryl is in company_members...");
  const { data: cm, error: cmErr } = await supabase.from('company_members').select('*').eq('user_id', targetUUID);
  console.log("Company Memberships:", cm, cmErr?.message || '');

  console.log("\nChecking how many companies exist in total...");
  const { count } = await supabase.from('companies').select('*', { count: 'exact', head: true });
  console.log("Total Companies Database count:", count);
  
  if (cm && cm.length === 0) {
      console.log("\nDarryl has NO company memberships! If Jobs RLS requires company_members, that's why he sees nothing!");
  }
}

checkRLSWorkaround().catch(console.error);
