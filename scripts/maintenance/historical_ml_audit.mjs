import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chgrkvftjfibufoopmav.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZ3JrdmZ0amZpYnVmb29wbWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NDc0NiwiZXhwIjoyMDkwMDcwNzQ2fQ.z31iPsEOvdLjnjRdj4_i4kFNwnbhrZ5xViBAYede0RI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function historicalAudit() {
  console.log("=== CLUB OS AI: HISTORICAL DATA AUDIT ===\n");
  
  // Fetch all closed/lost jobs to understand the baseline
  const { data: jobs, error } = await supabase.from('jobs').select('id, title, company_id, status, is_lost, deal_stage, created_at, closed_at');
  
  if (error) { console.error("Error:", error); return; }
  
  let totalJobs = jobs.length;
  let wonJobs = 0;
  let lostJobs = 0;
  let timeToCloseMs = [];
  
  // Variables for Company Analytics
  let companyStats = {};
  
  jobs.forEach(job => {
      // Is it a completed job? (Either Won or Lost)
      const isWon = job.status === 'closed' && !job.is_lost && (job.deal_stage === 'Placement' || job.deal_stage === 'Closed Won');
      const isLost = job.is_lost;
      
      const compId = job.company_id || 'unknown';
      if (!companyStats[compId]) companyStats[compId] = { total: 0, won: 0, lost: 0 };
      
      if (isWon || isLost) {
          companyStats[compId].total++;
          if (isWon) {
              wonJobs++;
              companyStats[compId].won++;
              
              const start = new Date(job.created_at).getTime();
              const end = job.closed_at ? new Date(job.closed_at).getTime() : new Date().getTime();
              timeToCloseMs.push(end - start);
          }
          if (isLost) {
              lostJobs++;
              companyStats[compId].lost++;
          }
      }
  });
  
  const avgTimeToCloseDays = timeToCloseMs.length > 0 
      ? (timeToCloseMs.reduce((a,b) => a+b, 0) / timeToCloseMs.length) / (1000 * 60 * 60 * 24)
      : 0;

  console.log(`Global Historical Win Rate: ${wonJobs + lostJobs > 0 ? Math.round((wonJobs / (wonJobs + lostJobs)) * 100) : 0}%`);
  console.log(`Global Average Time-to-Close: ${Math.round(avgTimeToCloseDays)} days`);
  console.log(`Total Completed Deals: ${wonJobs + lostJobs} (Won: ${wonJobs}, Lost: ${lostJobs})`);
  
  console.log("\n--- Predictive Company Weighting Vectors ---");
  for (const [id, stat] of Object.entries(companyStats)) {
      if (stat.total > 0) {
          const wr = Math.round((stat.won / stat.total) * 100);
          console.log(`Company Vector (ID: ${id.substring(0,6)}...): ${stat.total} deals -> ${wr}% Win Rate`);
      }
  }
}

historicalAudit().catch(console.error);
