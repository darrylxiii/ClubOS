import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDealStagesTable() {
    const { data } = await supabase.from('deal_stages').select('*');
    console.log(data);
    
    // Output current pipeline calculation components directly
    const { data: q } = await supabase.from('jobs').select('id, title, deal_stage, deal_probability, salary_min, salary_max');
    console.log(`\nSample of current DB jobs:`);
    console.log(q.slice(0, 3));
}

checkDealStagesTable().catch(console.error);
