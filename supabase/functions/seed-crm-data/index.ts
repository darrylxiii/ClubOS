import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_COMPANIES = [
  { name: "TechVentures Inc", size: "51-200", industry: "Technology" },
  { name: "Acme Corp", size: "201-500", industry: "Manufacturing" },
  { name: "StartupFlow", size: "11-50", industry: "SaaS" },
  { name: "DataDriven Ltd", size: "51-200", industry: "Analytics" },
  { name: "CloudScale Systems", size: "201-500", industry: "Cloud Services" },
  { name: "InnovateTech", size: "11-50", industry: "AI/ML" },
  { name: "GrowthLabs", size: "51-200", industry: "Marketing" },
  { name: "SecureNet Solutions", size: "201-500", industry: "Cybersecurity" },
  { name: "FinanceHub", size: "501-1000", industry: "FinTech" },
  { name: "HealthFirst", size: "201-500", industry: "Healthcare" },
  { name: "EduLearn Platform", size: "51-200", industry: "EdTech" },
  { name: "RetailMax", size: "1000+", industry: "E-commerce" },
  { name: "GreenEnergy Co", size: "201-500", industry: "CleanTech" },
  { name: "MediaStream", size: "51-200", industry: "Entertainment" },
  { name: "LogiTech Partners", size: "201-500", industry: "Logistics" },
  { name: "PropTech Solutions", size: "11-50", industry: "Real Estate" },
  { name: "FoodTech Hub", size: "51-200", industry: "Food & Beverage" },
  { name: "TravelWise", size: "201-500", industry: "Travel" },
  { name: "SportsTech", size: "51-200", industry: "Sports" },
  { name: "LegalEase", size: "51-200", industry: "LegalTech" },
];

const FIRST_NAMES = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Anna", "Robert", "Maria", "Daniel", "Sophie", "Thomas", "Laura", "William", "Kate", "Richard", "Emily", "Charles", "Olivia"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"];
const JOB_TITLES = ["CEO", "CTO", "VP of Engineering", "Head of Talent", "Director of HR", "COO", "Founder", "Co-Founder", "Head of People", "VP of Operations", "Chief People Officer", "Head of Growth"];

const STAGES: string[] = ["new", "contacted", "replied", "qualified", "meeting_booked", "proposal_sent", "closed_won", "closed_lost"];
const STAGE_DISTRIBUTION = [3, 4, 3, 3, 2, 2, 2, 1]; // Total = 20

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 3 campaigns
    const campaigns = [
      {
        name: "Q1 Tech Outreach",
        platform: "instantly",
        status: "active",
        total_prospects: 150,
        total_sent: 120,
        total_opened: 85,
        total_replied: 18,
        open_rate: 70.8,
        reply_rate: 15.0,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { target_industry: "Technology", sequence_steps: 4 },
        created_by: user.id,
      },
      {
        name: "Series A Founders",
        platform: "instantly",
        status: "active",
        total_prospects: 80,
        total_sent: 65,
        total_opened: 52,
        total_replied: 12,
        open_rate: 80.0,
        reply_rate: 18.5,
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { target_industry: "Startups", sequence_steps: 3 },
        created_by: user.id,
      },
      {
        name: "VP Engineering Hunt",
        platform: "instantly",
        status: "paused",
        total_prospects: 200,
        total_sent: 180,
        total_opened: 110,
        total_replied: 25,
        open_rate: 61.1,
        reply_rate: 13.9,
        start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { target_industry: "Engineering", sequence_steps: 5 },
        created_by: user.id,
      },
    ];

    const { data: insertedCampaigns, error: campaignError } = await supabaseAdmin
      .from("crm_campaigns")
      .insert(campaigns)
      .select("id, name");

    if (campaignError) {
      console.error("Campaign insert error:", campaignError);
      throw new Error(`Failed to insert campaigns: ${campaignError.message}`);
    }

    const campaignIds = insertedCampaigns?.map((c: { id: string }) => c.id) || [];

    // Generate 20 prospects across stages
    const prospects: any[] = [];
    let prospectIndex = 0;

    STAGE_DISTRIBUTION.forEach((count, stageIndex) => {
      for (let i = 0; i < count; i++) {
        const company = SAMPLE_COMPANIES[prospectIndex % SAMPLE_COMPANIES.length];
        const firstName = FIRST_NAMES[prospectIndex % FIRST_NAMES.length];
        const lastName = LAST_NAMES[(prospectIndex + 5) % LAST_NAMES.length];
        const fullName = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, "")}.com`;
        
        const sentiment = stageIndex >= 4 ? "hot" : stageIndex >= 2 ? "warm" : "neutral";
        const leadScore = Math.min(100, 30 + stageIndex * 10 + Math.floor(Math.random() * 20));
        const dealValue = [10000, 15000, 20000, 25000, 30000, 50000, 75000, 100000][Math.floor(Math.random() * 8)];

        prospects.push({
          full_name: fullName,
          email,
          phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          company_name: company.name,
          company_size: company.size,
          industry: company.industry,
          job_title: JOB_TITLES[prospectIndex % JOB_TITLES.length],
          linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          stage: STAGES[stageIndex],
          lead_score: leadScore,
          deal_value: dealValue,
          reply_sentiment: sentiment,
          emails_sent: Math.floor(Math.random() * 5) + 1,
          emails_opened: Math.floor(Math.random() * 3),
          last_activity_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          campaign_id: campaignIds[prospectIndex % campaignIds.length],
          assigned_to: user.id,
          source: "instantly",
          metadata: { imported_at: new Date().toISOString() },
          created_by: user.id,
        });

        prospectIndex++;
      }
    });

    const { data: insertedProspects, error: prospectError } = await supabaseAdmin
      .from("crm_prospects")
      .insert(prospects)
      .select("id, email, full_name, company_name");

    if (prospectError) {
      console.error("Prospect insert error:", prospectError);
      throw new Error(`Failed to insert prospects: ${prospectError.message}`);
    }

    // Generate 10 email replies (5 hot, 3 warm, 2 objections)
    const replyClassifications = [
      "hot_lead", "hot_lead", "hot_lead", "hot_lead", "hot_lead",
      "warm_lead", "warm_lead", "interested",
      "objection", "not_interested"
    ];

    const replyContents = [
      { subject: "Re: Partnership Opportunity", content: "This sounds great! I'd love to schedule a call this week. Are you available Thursday?" },
      { subject: "Re: Quick question", content: "Yes, we're definitely interested. Can you send over more details about pricing?" },
      { subject: "Re: Introduction", content: "Perfect timing! We were just looking for a solution like this. Let's connect." },
      { subject: "Re: Following up", content: "Thanks for reaching out. I've shared this with my team and we're very interested." },
      { subject: "Re: Exclusive offer", content: "This is exactly what we need. When can we start?" },
      { subject: "Re: Quick intro", content: "Interesting. Can you tell me more about how this works?" },
      { subject: "Re: Reaching out", content: "Thanks for the email. I'd like to learn more but timing isn't great right now." },
      { subject: "Re: Your message", content: "I saw your email. Let me discuss with my team and get back to you." },
      { subject: "Re: Partnership", content: "We already have a solution in place. What makes yours different?" },
      { subject: "Re: Introduction", content: "Thanks but we're not looking for new vendors at this time." },
    ];

    const emailReplies: any[] = [];
    const prospectList = insertedProspects || [];

    replyClassifications.forEach((classification, i) => {
      const prospect = prospectList[i % prospectList.length];
      if (prospect) {
        emailReplies.push({
          prospect_id: prospect.id,
          campaign_id: campaignIds[i % campaignIds.length],
          from_email: prospect.email,
          from_name: prospect.full_name,
          subject: replyContents[i].subject,
          body_text: replyContents[i].content,
          body_html: `<p>${replyContents[i].content}</p>`,
          classification,
          confidence_score: 0.85 + Math.random() * 0.15,
          priority: classification === "hot_lead" ? 5 : classification.includes("warm") || classification === "interested" ? 4 : 3,
          is_read: i > 5,
          replied_at: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)).toISOString(),
          metadata: { analyzed_at: new Date().toISOString() },
        });
      }
    });

    if (emailReplies.length > 0) {
      const { error: replyError } = await supabaseAdmin
        .from("crm_email_replies")
        .insert(emailReplies);

      if (replyError) {
        console.error("Reply insert error:", replyError);
        throw new Error(`Failed to insert replies: ${replyError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "CRM sample data seeded successfully",
        data: {
          campaigns: insertedCampaigns?.length || 0,
          prospects: insertedProspects?.length || 0,
          replies: emailReplies.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Seed CRM data error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to seed CRM data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
