import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function extractMath() {
   const { data: jobs } = await supabase.from('jobs').select('id, title, salary_min, salary_max, status, is_lost, company_id, target_hire_count');
   const { data: companies } = await supabase.from('companies').select('id, name, placement_fee_percentage');
   
   let exactSum = 0;
   
   for (const j of jobs) {
       if (j.status !== 'published' || j.is_lost) continue;
       
       let salary = j.salary_max || j.salary_min || 0;
       
       // Only sum if it has a real salary, not a fallback
       if (salary > 0) {
           const c = companies.find(comp => comp.id === j.company_id);
           const fee = c?.placement_fee_percentage || 20; // use industry standard if missing, assuming old app did
           
           const val = salary * (fee / 100) * (j.target_hire_count || 1);
           exactSum += val;
       }
   }
   
   console.log(`Sum of pipeline using EXACT salaries only (no fallback): €${exactSum.toLocaleString()}`);
}

extractMath().catch(console.error);
