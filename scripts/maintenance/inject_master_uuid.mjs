import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixProfile() {
  const targetUUID = '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5';
  
  const profileData = {
     full_name: 'Darryl Mehilal',
     avatar_url: 'https://chgrkvftjfibufoopmav.supabase.co/storage/v1/object/public/avatars/8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5/1759805972352.jpg',
     system_role: 'admin',
     account_status: 'approved',
     roles_array: ['admin', 'partner', 'candidate'],
     current_title: 'Founder'
  };
  
  const { error: pErr } = await supabase.from('profiles').update(profileData).eq('id', targetUUID);
  
  if (pErr) {
     console.error("Profile Update Error:", pErr.message);
  } else {
     console.log("Master profile successfully updated with Admin privileges!");
  }
}

fixProfile().catch(console.error);
