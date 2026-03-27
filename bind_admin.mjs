import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function bindAdminToAllCompanies() {
  const targetUUID = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5';
  
  console.log("Fetching all companies...");
  const { data: companies, error: cErr } = await supabase.from('companies').select('id');
  
  if (cErr) {
     console.error("Error fetching companies:", cErr.message);
     return;
  }
  
  console.log(`Found ${companies.length} companies. Binding Darryl as owner...`);
  
  const memberships = companies.map(c => ({
     company_id: c.id,
     user_id: targetUUID,
     role: 'owner',
     is_active: true
  }));
  
  const { error: mErr } = await supabase.from('company_members').upsert(memberships, { onConflict: 'company_id,user_id' });
  
  if (mErr) {
     console.error("Error inserting memberships:", mErr.message);
  } else {
     console.log(`Successfully bound Darryl to all ${companies.length} companies!`);
  }
}

bindAdminToAllCompanies().catch(console.error);
