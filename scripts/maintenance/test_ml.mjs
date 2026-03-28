import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testML() {
  console.log("=== CLUB OS AI: ML INSIGHTS OUTPUT ===");
  
  const { data: insights, error: iErr } = await supabase.from('admin_strategic_insights').select('*').order('urgency_score', { ascending: false }).limit(5);
  if (iErr) {
     console.error("Insights Error:", iErr.message);
  } else {
     console.log(`\nTop 5 Strategic AI Recommendations:`);
     insights.forEach(i => console.log(`[Score: ${i.urgency_score}] ${i.strategic_insight}`));
  }
  
  const { data: rpcData, error: rpcErr } = await supabase.rpc('calculate_weighted_pipeline');
  if (rpcErr) {
     console.error("RPC Error:", rpcErr.message);
  } else {
     console.log(`\n=== BAYESIAN PIPELINE 3.0 OUTPUT ===`);
     console.log(`Self-Learning Weighted Pipeline: €${rpcData?.[0]?.weighted_pipeline_value?.toLocaleString() || '0'}`);
  }
}

testML().catch(console.error);
