import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CareerInsightRequest {
  userId: string;
  includeSkillGap?: boolean;
  includeMarketPosition?: boolean;
  includeCareerTrajectory?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, includeSkillGap = true, includeMarketPosition = true, includeCareerTrajectory = true }: CareerInsightRequest = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user profile and skills
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: candidateProfile } = await supabaseClient
      .from('candidate_profiles')
      .select('*, skills, experience_years, target_roles, current_salary, target_salary')
      .eq('user_id', userId)
      .single()

    // Fetch career context snapshots
    const { data: careerSnapshots } = await supabaseClient
      .from('career_context_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch market intelligence data
    const { data: marketData } = await supabaseClient
      .from('market_intelligence')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch user's applications
    const { data: applications } = await supabaseClient
      .from('applications')
      .select('*, job_id, status, match_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Generate insights
    const insights: any = {
      generatedAt: new Date().toISOString(),
      userId,
    }

    // Skill Gap Analysis
    if (includeSkillGap) {
      const userSkills = candidateProfile?.skills || []
      const marketDemandedSkills = extractMarketSkills(marketData || [])
      
      insights.skillGap = {
        currentSkills: userSkills,
        demandedSkills: marketDemandedSkills,
        gapAnalysis: calculateSkillGap(userSkills, marketDemandedSkills),
        recommendations: generateSkillRecommendations(userSkills, marketDemandedSkills),
      }
    }

    // Market Position
    if (includeMarketPosition) {
      const currentSalary = candidateProfile?.current_salary || 0
      const targetSalary = candidateProfile?.target_salary || 0
      const experienceYears = candidateProfile?.experience_years || 0

      insights.marketPosition = {
        salaryPercentile: calculateSalaryPercentile(currentSalary, marketData || []),
        experienceLevel: categorizeExperience(experienceYears),
        competitiveness: calculateCompetitiveness(candidateProfile, applications || []),
        marketTrend: analyzeMarketTrend(marketData || []),
      }
    }

    // Career Trajectory
    if (includeCareerTrajectory) {
      insights.careerTrajectory = {
        currentPath: analyzeCareerPath(careerSnapshots || []),
        projectedGrowth: calculateProjectedGrowth(candidateProfile, marketData || []),
        nextSteps: generateNextSteps(candidateProfile, applications || []),
        timelineEstimate: estimateCareerTimeline(candidateProfile),
      }
    }

    // Cache the insights
    await supabaseClient
      .from('career_insights_cache')
      .upsert({
        user_id: userId,
        insights_data: insights,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }, { onConflict: 'user_id' })

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error generating career insights:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions
function extractMarketSkills(marketData: any[]): string[] {
  const skills = new Set<string>()
  marketData.forEach(item => {
    if (item.trending_skills) {
      (item.trending_skills as string[]).forEach(s => skills.add(s))
    }
  })
  return Array.from(skills).slice(0, 20)
}

function calculateSkillGap(userSkills: string[], demandedSkills: string[]): { missing: string[], strength: string[] } {
  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const missing = demandedSkills.filter(s => !userSkillsLower.includes(s.toLowerCase()))
  const strength = userSkills.filter(s => demandedSkills.map(d => d.toLowerCase()).includes(s.toLowerCase()))
  return { missing, strength }
}

function generateSkillRecommendations(userSkills: string[], demandedSkills: string[]): string[] {
  const gap = calculateSkillGap(userSkills, demandedSkills)
  return gap.missing.slice(0, 5).map(skill => `Consider learning ${skill} to increase your market value`)
}

function calculateSalaryPercentile(salary: number, marketData: any[]): number {
  if (!salary || marketData.length === 0) return 50
  const salaries = marketData.map(m => m.avg_salary || 0).filter(s => s > 0).sort((a, b) => a - b)
  if (salaries.length === 0) return 50
  const below = salaries.filter(s => s < salary).length
  return Math.round((below / salaries.length) * 100)
}

function categorizeExperience(years: number): string {
  if (years < 2) return 'Junior'
  if (years < 5) return 'Mid-Level'
  if (years < 10) return 'Senior'
  return 'Expert'
}

function calculateCompetitiveness(profile: any, applications: any[]): number {
  if (!profile || applications.length === 0) return 50
  const avgMatchScore = applications.reduce((sum, app) => sum + (app.match_score || 0), 0) / applications.length
  return Math.round(avgMatchScore)
}

function analyzeMarketTrend(marketData: any[]): string {
  if (marketData.length < 2) return 'stable'
  const recent = marketData[0]?.demand_level || 50
  const older = marketData[marketData.length - 1]?.demand_level || 50
  if (recent > older + 10) return 'growing'
  if (recent < older - 10) return 'declining'
  return 'stable'
}

function analyzeCareerPath(snapshots: any[]): string {
  if (snapshots.length === 0) return 'Starting career journey'
  return 'Progressing in chosen field'
}

function calculateProjectedGrowth(profile: any, marketData: any[]): { salary: number, timeline: string } {
  const currentSalary = profile?.current_salary || 0
  const projectedIncrease = analyzeMarketTrend(marketData) === 'growing' ? 0.15 : 0.08
  return {
    salary: Math.round(currentSalary * (1 + projectedIncrease)),
    timeline: '12-18 months',
  }
}

function generateNextSteps(profile: any, applications: any[]): string[] {
  const steps: string[] = []
  if (applications.length === 0) {
    steps.push('Start applying to roles that match your profile')
  }
  if (!profile?.linkedin_url) {
    steps.push('Complete your LinkedIn profile for better visibility')
  }
  steps.push('Keep your skills updated with market demands')
  return steps.slice(0, 3)
}

function estimateCareerTimeline(profile: any): { nextPromotion: string, seniorLevel: string } {
  const experience = profile?.experience_years || 0
  return {
    nextPromotion: experience < 3 ? '1-2 years' : '2-3 years',
    seniorLevel: experience < 5 ? '3-5 years' : 'Currently at or near senior level',
  }
}
