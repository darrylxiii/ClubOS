import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParticipantDossier {
  executiveSummary: string;
  linkedinSnapshot: {
    headline: string;
    currentCompany: string;
    experience: Array<{ title: string; company: string; duration: string }>;
    skills: string[];
    education: string[];
  } | null;
  previousInteractions: Array<{
    type: 'meeting' | 'email' | 'whatsapp' | 'call';
    date: string;
    summary: string;
  }>;
  companyIntel: {
    companyName: string;
    recentNews: string[];
    fundingStatus: string;
    sentiment: string;
    employeeCount: string;
    industry: string;
  } | null;
  mutualConnections: string[];
  suggestedTopics: string[];
  iceBreakers: string[];
  redFlags: string[];
  thingsToAvoid: string[];
  personalityInsights: {
    communicationStyle: string;
    preferredMeetingFormat: string;
    decisionMakingStyle: string;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, meetingId, participantEmail, participantName, forceRefresh } = await req.json();

    if (!participantEmail) {
      throw new Error('participantEmail is required');
    }

    // Check for existing recent dossier (within 24 hours) unless force refresh
    if (!forceRefresh) {
      const { data: existingDossier } = await supabase
        .from('participant_dossiers')
        .select('*')
        .eq('participant_email', participantEmail)
        .or(`booking_id.eq.${bookingId || '00000000-0000-0000-0000-000000000000'},meeting_id.eq.${meetingId || '00000000-0000-0000-0000-000000000000'}`)
        .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (existingDossier) {
        return new Response(JSON.stringify({ 
          dossier: existingDossier,
          cached: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Gather data from multiple sources in parallel
    const [linkedinData, interactionHistory, companyData, mutualConnections] = await Promise.all([
      fetchLinkedInData(supabase, participantEmail, participantName),
      fetchInteractionHistory(supabase, participantEmail),
      fetchCompanyIntelligence(supabase, participantEmail),
      fetchMutualConnections(supabase, participantEmail),
    ]);

    // Generate AI-powered dossier content
    const dossierContent = await generateDossierWithAI({
      participantEmail,
      participantName,
      linkedinData,
      interactionHistory,
      companyData,
      mutualConnections,
    });

    // Determine participant type
    let participantType = 'guest';
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('host_id, guest_email')
        .eq('id', bookingId)
        .single();
      
      if (booking) {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', booking.host_id)
          .single();
        
        if (hostProfile?.email === participantEmail) {
          participantType = 'host';
        }
      }
    }

    // Store the dossier in participant_dossiers table
    const { data: savedDossier, error: saveError } = await supabase
      .from('participant_dossiers')
      .insert([{
        booking_id: bookingId || null,
        meeting_id: meetingId || null,
        participant_type: participantType,
        participant_email: participantEmail,
        participant_name: participantName || dossierContent.linkedinSnapshot?.headline?.split(' at ')[0] || participantEmail.split('@')[0],
        dossier_content: dossierContent,
        linkedin_data: linkedinData,
        interaction_history: interactionHistory,
        company_intel: companyData,
        personality_insights: dossierContent.personalityInsights,
        suggested_talking_points: dossierContent.suggestedTopics,
        ice_breakers: dossierContent.iceBreakers,
        things_to_avoid: dossierContent.thingsToAvoid,
        red_flags: dossierContent.redFlags,
        mutual_connections: mutualConnections,
        generated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving dossier:', saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({ 
      dossier: savedDossier,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating dossier:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchLinkedInData(supabase: any, email: string, name?: string): Promise<any> {
  try {
    // First check if we have cached LinkedIn data
    const { data: cachedData } = await supabase
      .from('linkedin_profile_cache')
      .select('*')
      .eq('email', email)
      .gte('fetched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (cachedData?.profile_data) {
      return cachedData.profile_data;
    }

    // Check candidate profiles for LinkedIn URL
    const { data: candidate } = await supabase
      .from('candidates')
      .select('linkedin_url, profile_data')
      .eq('email', email)
      .single();

    if (candidate?.profile_data?.linkedin) {
      return candidate.profile_data.linkedin;
    }

    // Try to enrich via LinkedIn scraper if we have the URL
    if (candidate?.linkedin_url) {
      const { data: enriched, error } = await supabase.functions.invoke('linkedin-scraper-proxycurl', {
        body: { linkedinUrl: candidate.linkedin_url }
      });

      if (!error && enriched) {
        return enriched;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching LinkedIn data:', error);
    return null;
  }
}

async function fetchInteractionHistory(supabase: any, email: string): Promise<any[]> {
  const interactions: any[] = [];

  try {
    // Fetch previous meetings
    const { data: meetings } = await supabase
      .from('bookings')
      .select('id, start_time, meeting_type, status, meeting_notes')
      .eq('guest_email', email)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(10);

    if (meetings) {
      for (const meeting of meetings) {
        interactions.push({
          type: 'meeting',
          date: meeting.start_time,
          summary: meeting.meeting_notes || `${meeting.meeting_type} meeting`,
        });
      }
    }

    // Fetch email communications
    const { data: emails } = await supabase
      .from('unified_communications')
      .select('id, created_at, subject, snippet, direction')
      .eq('participant_email', email)
      .eq('channel', 'email')
      .order('created_at', { ascending: false })
      .limit(10);

    if (emails) {
      for (const emailItem of emails) {
        interactions.push({
          type: 'email',
          date: emailItem.created_at,
          summary: emailItem.subject || emailItem.snippet?.substring(0, 100) || 'Email communication',
        });
      }
    }

    // Fetch WhatsApp messages
    const { data: whatsappMessages } = await supabase
      .from('whatsapp_messages')
      .select('id, created_at, content')
      .eq('from_number', email) // This might need adjustment based on your schema
      .order('created_at', { ascending: false })
      .limit(5);

    if (whatsappMessages) {
      for (const msg of whatsappMessages) {
        interactions.push({
          type: 'whatsapp',
          date: msg.created_at,
          summary: msg.content?.substring(0, 100) || 'WhatsApp message',
        });
      }
    }

    // Sort by date descending
    interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return interactions.slice(0, 15);
  } catch (error) {
    console.error('Error fetching interaction history:', error);
    return [];
  }
}

async function fetchCompanyIntelligence(supabase: any, email: string): Promise<any> {
  try {
    const domain = email.split('@')[1];
    if (!domain || domain.includes('gmail') || domain.includes('hotmail') || domain.includes('yahoo')) {
      return null;
    }

    // Check for cached company data
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('domain', domain)
      .single();

    if (companyData) {
      // Get recent news/sentiment if available
      const { data: sentiment } = await supabase
        .from('company_sentiment_analysis')
        .select('*')
        .eq('company_id', companyData.id)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      return {
        companyName: companyData.name,
        domain: companyData.domain,
        industry: companyData.industry,
        employeeCount: companyData.employee_count,
        fundingStatus: companyData.funding_stage,
        sentiment: sentiment?.overall_sentiment || 'neutral',
        recentNews: sentiment?.key_topics || [],
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching company intelligence:', error);
    return null;
  }
}

async function fetchMutualConnections(supabase: any, email: string): Promise<string[]> {
  try {
    // Check if this person knows anyone in our network
    const { data: connections } = await supabase
      .from('professional_connections')
      .select('connected_user_name')
      .eq('contact_email', email)
      .limit(5);

    if (connections) {
      return connections.map((c: any) => c.connected_user_name).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    return [];
  }
}

async function generateDossierWithAI(data: {
  participantEmail: string;
  participantName?: string;
  linkedinData: any;
  interactionHistory: any[];
  companyData: any;
  mutualConnections: string[];
}): Promise<ParticipantDossier> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    // Return basic dossier without AI enhancement
    return createBasicDossier(data);
  }

  try {
    const systemPrompt = `You are Club AI, an expert at creating pre-meeting intelligence briefs for The Quantum Club. 
Your task is to analyze available data about a meeting participant and generate actionable insights.

Be concise, professional, and discreet. Focus on information that helps the meeting host:
1. Build rapport quickly
2. Avoid awkward topics
3. Understand the person's background
4. Prepare relevant talking points

Never fabricate information. If data is limited, acknowledge this and focus on what's known.`;

    const userPrompt = `Create a meeting dossier for: ${data.participantName || data.participantEmail}

Available Data:
${data.linkedinData ? `LinkedIn: ${JSON.stringify(data.linkedinData)}` : 'No LinkedIn data available'}
${data.companyData ? `Company: ${JSON.stringify(data.companyData)}` : 'No company data available'}
${data.interactionHistory.length > 0 ? `Previous Interactions: ${JSON.stringify(data.interactionHistory)}` : 'No previous interactions'}
${data.mutualConnections.length > 0 ? `Mutual Connections: ${data.mutualConnections.join(', ')}` : 'No mutual connections found'}

Generate a JSON response with these exact fields:
{
  "executiveSummary": "2-3 sentence overview",
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "iceBreakers": ["opener1", "opener2"],
  "thingsToAvoid": ["topic to avoid"],
  "redFlags": ["any concerns from history"],
  "personalityInsights": {
    "communicationStyle": "direct/collaborative/analytical",
    "preferredMeetingFormat": "video/phone/in-person preference if known",
    "decisionMakingStyle": "quick/deliberate/consensus-driven"
  }
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return createBasicDossier(data);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse AI response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiDossier = JSON.parse(jsonMatch[0]);
        
        return {
          executiveSummary: aiDossier.executiveSummary || createBasicSummary(data),
          linkedinSnapshot: data.linkedinData ? {
            headline: data.linkedinData.headline || '',
            currentCompany: data.linkedinData.company || '',
            experience: data.linkedinData.experience || [],
            skills: data.linkedinData.skills || [],
            education: data.linkedinData.education || [],
          } : null,
          previousInteractions: data.interactionHistory,
          companyIntel: data.companyData,
          mutualConnections: data.mutualConnections,
          suggestedTopics: aiDossier.suggestedTopics || [],
          iceBreakers: aiDossier.iceBreakers || [],
          redFlags: aiDossier.redFlags || [],
          thingsToAvoid: aiDossier.thingsToAvoid || [],
          personalityInsights: aiDossier.personalityInsights || null,
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    return createBasicDossier(data);
  } catch (error) {
    console.error('Error generating AI dossier:', error);
    return createBasicDossier(data);
  }
}

function createBasicDossier(data: any): ParticipantDossier {
  return {
    executiveSummary: createBasicSummary(data),
    linkedinSnapshot: data.linkedinData ? {
      headline: data.linkedinData.headline || '',
      currentCompany: data.linkedinData.company || '',
      experience: data.linkedinData.experience || [],
      skills: data.linkedinData.skills || [],
      education: data.linkedinData.education || [],
    } : null,
    previousInteractions: data.interactionHistory,
    companyIntel: data.companyData,
    mutualConnections: data.mutualConnections,
    suggestedTopics: generateBasicTopics(data),
    iceBreakers: generateBasicIceBreakers(data),
    redFlags: [],
    thingsToAvoid: [],
    personalityInsights: null,
  };
}

function createBasicSummary(data: any): string {
  const parts: string[] = [];
  
  if (data.participantName) {
    parts.push(data.participantName);
  }
  
  if (data.linkedinData?.headline) {
    parts.push(data.linkedinData.headline);
  } else if (data.companyData?.companyName) {
    parts.push(`Works at ${data.companyData.companyName}`);
  }
  
  if (data.interactionHistory.length > 0) {
    parts.push(`${data.interactionHistory.length} previous interactions on record`);
  } else {
    parts.push('First-time contact');
  }
  
  return parts.join('. ') + '.';
}

function generateBasicTopics(data: any): string[] {
  const topics: string[] = [];
  
  if (data.companyData?.industry) {
    topics.push(`Industry trends in ${data.companyData.industry}`);
  }
  
  if (data.linkedinData?.skills?.length > 0) {
    topics.push(`Their expertise in ${data.linkedinData.skills[0]}`);
  }
  
  if (data.interactionHistory.length > 0) {
    topics.push('Follow up on previous conversations');
  }
  
  return topics.length > 0 ? topics : ['Introduction and role overview', 'Current challenges and goals'];
}

function generateBasicIceBreakers(data: any): string[] {
  const iceBreakers: string[] = [];
  
  if (data.mutualConnections.length > 0) {
    iceBreakers.push(`Mention mutual connection: ${data.mutualConnections[0]}`);
  }
  
  if (data.companyData?.recentNews?.length > 0) {
    iceBreakers.push(`Recent company news: ${data.companyData.recentNews[0]}`);
  }
  
  return iceBreakers.length > 0 ? iceBreakers : ['Ask about their current priorities', 'Inquire about their journey to current role'];
}
