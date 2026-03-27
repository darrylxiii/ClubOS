import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkProb() {
   const { data: jobs } = await supabase.from('jobs').select('id, title, deal_probability, deal_stage, status, is_lost');
   
   let totalProb = 0;
   let pubJobs = 0;
   
   jobs.forEach(j => {
       if (j.status === 'published' && !j.is_lost) {
           pubJobs++;
           totalProb += j.deal_probability || 10;
       }
   });
   
   console.log(`Active Published Jobs: ${pubJobs}`);
   console.log(`Average Probability: ${totalProb / pubJobs}%`);
   console.log(`First few jobs:\n${JSON.stringify(jobs.slice(0, 3), null, 2)}`);
}

checkProb().catch(console.error);
