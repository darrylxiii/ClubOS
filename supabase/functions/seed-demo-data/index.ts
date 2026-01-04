import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { dataType, count = 10 } = await req.json();
    const results: Record<string, number> = {};

    console.log(`Seeding demo data: ${dataType}, count: ${count}`);

    // Company names for realistic demo data
    const companyNames = [
      'TechVentures BV', 'Digital Dynamics', 'CloudScale Solutions', 
      'InnovateTech NL', 'DataDriven Corp', 'AgileMinds', 
      'FutureForward Tech', 'ScaleUp Studios', 'GrowthEngine BV',
      'NextGen Innovations', 'Quantum Labs', 'Velocity Partners'
    ];

    const jobTitles = [
      'Senior Software Engineer', 'Product Manager', 'Data Scientist',
      'DevOps Engineer', 'Frontend Developer', 'Backend Developer',
      'Engineering Manager', 'CTO', 'VP Engineering', 'Tech Lead',
      'Full Stack Developer', 'Machine Learning Engineer'
    ];

    const skills = [
      'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Kubernetes',
      'PostgreSQL', 'GraphQL', 'Docker', 'Terraform', 'Go', 'Rust'
    ];

    if (dataType === 'companies' || dataType === 'all') {
      const companies = [];
      for (let i = 0; i < Math.min(count, companyNames.length); i++) {
        companies.push({
          name: companyNames[i],
          industry: ['Technology', 'SaaS', 'FinTech', 'E-commerce'][i % 4],
          company_size: ['11-50', '51-200', '201-500', '501-1000'][i % 4],
          website_url: `https://${companyNames[i].toLowerCase().replace(/\s/g, '')}.com`,
          description: `${companyNames[i]} is a leading company in the technology sector.`,
          headquarters_location: ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague'][i % 4],
          status: 'active',
        });
      }

      const { data, error } = await supabase.from('companies').insert(companies).select();
      if (error) console.error('Company insert error:', error);
      results.companies = data?.length || 0;
    }

    if (dataType === 'jobs' || dataType === 'all') {
      // Get existing companies
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .limit(10);

      if (existingCompanies?.length) {
        const jobs = [];
        for (let i = 0; i < count; i++) {
          const company = existingCompanies[i % existingCompanies.length];
          const salaryMin = 60000 + (Math.floor(Math.random() * 8) * 10000);
          jobs.push({
            company_id: company.id,
            title: jobTitles[i % jobTitles.length],
            description: `We are looking for a ${jobTitles[i % jobTitles.length]} to join our team.`,
            location: ['Amsterdam', 'Rotterdam', 'Remote', 'Hybrid'][i % 4],
            location_type: ['hybrid', 'remote', 'onsite'][i % 3],
            employment_type: 'full_time',
            salary_min: salaryMin,
            salary_max: salaryMin + 30000,
            salary_currency: 'EUR',
            required_skills: skills.slice(0, 4 + (i % 4)),
            status: 'open',
            visibility: 'public',
          });
        }

        const { data, error } = await supabase.from('jobs').insert(jobs).select();
        if (error) console.error('Job insert error:', error);
        results.jobs = data?.length || 0;
      }
    }

    if (dataType === 'candidates' || dataType === 'all') {
      const firstNames = ['Emma', 'Liam', 'Sophie', 'Noah', 'Julia', 'Lucas', 'Anna', 'Daan', 'Lisa', 'Tim'];
      const lastNames = ['de Vries', 'Jansen', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer'];

      const candidates = [];
      for (let i = 0; i < count; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];
        const salaryMin = 50000 + (Math.floor(Math.random() * 10) * 10000);
        
        candidates.push({
          full_name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}${i}@example.com`,
          current_title: jobTitles[i % jobTitles.length],
          current_company: companyNames[i % companyNames.length],
          years_of_experience: 2 + (i % 15),
          skills: skills.slice(0, 3 + (i % 5)),
          current_salary_min: salaryMin,
          desired_salary_min: salaryMin + 15000,
          desired_salary_max: salaryMin + 35000,
          desired_locations: ['Amsterdam', 'Rotterdam', 'Remote'],
          work_authorization: 'eu_citizen',
          availability_status: ['immediately', 'two_weeks', 'one_month'][i % 3],
          profile_completeness: 60 + (i % 40),
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const { data, error } = await supabase.from('candidate_profiles').insert(candidates).select();
      if (error) console.error('Candidate insert error:', error);
      results.candidates = data?.length || 0;
    }

    if (dataType === 'applications' || dataType === 'all') {
      const { data: jobs } = await supabase.from('jobs').select('id, title, company_id').limit(10);
      const { data: candidates } = await supabase.from('candidate_profiles').select('id, full_name, email').limit(20);
      const { data: companies } = await supabase.from('companies').select('id, name');

      if (jobs?.length && candidates?.length) {
        const applications = [];
        for (let i = 0; i < Math.min(count, jobs.length * 2); i++) {
          const job = jobs[i % jobs.length];
          const candidate = candidates[i % candidates.length];
          const company = companies?.find(c => c.id === job.company_id);
          
          applications.push({
            job_id: job.id,
            candidate_id: candidate.id,
            candidate_full_name: candidate.full_name,
            candidate_email: candidate.email,
            position: job.title,
            company_name: company?.name || 'Unknown Company',
            status: ['applied', 'screening', 'interviewing', 'offered', 'hired'][i % 5],
            current_stage_index: i % 5,
            match_score: 60 + Math.floor(Math.random() * 40),
            application_source: ['direct', 'referral', 'club_sync'][i % 3],
            applied_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        const { data, error } = await supabase.from('applications').insert(applications).select();
        if (error) console.error('Application insert error:', error);
        results.applications = data?.length || 0;
      }
    }

    if (dataType === 'invoices' || dataType === 'all') {
      // Create demo Moneybird invoices for revenue tracking
      const invoices = [];
      for (let i = 0; i < count; i++) {
        const invoiceDate = new Date();
        invoiceDate.setMonth(invoiceDate.getMonth() - (i % 12));
        
        invoices.push({
          moneybird_id: `demo-${Date.now()}-${i}`,
          invoice_number: `INV-2024-${1000 + i}`,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          total_amount: 15000 + Math.floor(Math.random() * 35000),
          state: 'paid',
          state_normalized: ['paid', 'open', 'pending'][i % 3],
          currency: 'EUR',
        });
      }

      const { data, error } = await supabase.from('moneybird_sales_invoices').insert(invoices).select();
      if (error) console.error('Invoice insert error:', error);
      results.invoices = data?.length || 0;
    }

    console.log('Demo data seeding complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo data seeded successfully',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Seed demo data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
