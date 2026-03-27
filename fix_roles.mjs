import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRoles() {
  const targetUUID = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5';
  
  console.log("Checking user_roles...");
  const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', targetUUID);
  console.log("Darryl's Current Roles:", roles);
  
  // Let's force add him as Admin!
  const { error } = await supabase.from('user_roles').upsert([
    { user_id: targetUUID, role: 'admin' },
    { user_id: targetUUID, role: 'partner' },
    { user_id: targetUUID, role: 'candidate' }
  ], { onConflict: 'user_id,role' });
  
  if (error) {
     console.error("Failed to add roles:", error.message);
  } else {
     console.log("Successfully added admin, partner, and candidate roles to Darryl!");
  }
}

checkRoles().catch(console.error);
