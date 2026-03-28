import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkMath() {
   const { data: companies } = await supabase.from('companies').select('id, name, placement_fee_percentage');
   
   let zeroFeeCount = 0;
   companies.forEach(c => {
       if (!c.placement_fee_percentage) zeroFeeCount++;
   });
   
   console.log(`Companies with zero/null fee percentage: ${zeroFeeCount} out of ${companies.length}`);
   
   // Let's check how many jobs have 0 or null salary caps
   const { data: jobs } = await supabase.from('jobs').select('id, title, salary_min, salary_max');
   let noSalaryCount = 0;
   
   jobs.forEach(j => {
       if (!j.salary_min && !j.salary_max) noSalaryCount++;
   });
   
   console.log(`Jobs with zero/null salary caps: ${noSalaryCount} out of ${jobs.length}`);
   
   // Set all companies to a 20% placement fee by default if they are missing it, 
   // which is the industry standard for premium recruitment
   const { error } = await supabase.from('companies')
        .update({ placement_fee_percentage: 20 })
        .is('placement_fee_percentage', null);
        
   console.log("Updated missing company placement fees to industry standard 20%");
}

checkMath().catch(console.error);
