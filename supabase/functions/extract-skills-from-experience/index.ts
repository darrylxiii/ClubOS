import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PROFICIENCY_MAP: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate JWT in code
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_id, job_id } = await req.json();

    if (!candidate_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find the candidate's latest CV document
    const { data: cvDoc, error: docError } = await supabase
      .from('candidate_documents')
      .select('id, file_url, document_type')
      .eq('candidate_id', candidate_id)
      .in('document_type', ['cv', 'resume', 'CV', 'Resume'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docError) {
      console.error('Error fetching CV document:', docError);
      throw new Error('Failed to look up CV document');
    }

    if (!cvDoc || !cvDoc.file_url) {
      return new Response(
        JSON.stringify({ error: 'No CV/resume found for this candidate. Please upload a CV first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Download the PDF from storage
    // file_url might be a full URL or a path like "resumes/xxx/file.pdf"
    let filePath = cvDoc.file_url;
    // Strip storage URL prefix if present
    const storagePrefix = '/storage/v1/object/public/resumes/';
    if (filePath.includes(storagePrefix)) {
      filePath = filePath.split(storagePrefix).pop()!;
    } else if (filePath.startsWith('resumes/')) {
      filePath = filePath.replace('resumes/', '');
    }
    // Also handle full URLs
    if (filePath.includes('/storage/v1/object/')) {
      const parts = filePath.split('/storage/v1/object/public/resumes/');
      if (parts.length > 1) filePath = parts[1];
      else {
        const signedParts = filePath.split('/storage/v1/object/sign/resumes/');
        if (signedParts.length > 1) filePath = signedParts[1].split('?')[0];
      }
    }

    console.log(`Downloading CV from resumes/${filePath}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download CV file from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Pdf = btoa(binary);

    // 3. Fetch job requirements if job_id provided
    let jobContext = '';
    let jobRequirements: string[] = [];
    let jobNiceToHave: string[] = [];

    if (job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, requirements, nice_to_have, description')
        .eq('id', job_id)
        .single();

      if (job) {
        if (Array.isArray(job.requirements)) {
          jobRequirements = job.requirements.map((r: any) =>
            typeof r === 'string' ? r : r?.name || r?.skill || r?.label || ''
          ).filter(Boolean);
        }
        if (Array.isArray(job.nice_to_have)) {
          jobNiceToHave = job.nice_to_have.map((r: any) =>
            typeof r === 'string' ? r : r?.name || ''
          ).filter(Boolean);
        }

        jobContext = `
## Job Context: "${job.title}"

### Must-Have Requirements:
${jobRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

### Nice-to-Have:
${jobNiceToHave.map((r, i) => `${i + 1}. ${r}`).join('\n')}

For EACH must-have and nice-to-have requirement, assess whether the candidate's resume demonstrates this skill/qualification. Include the assessment in the "job_match" array.
`;
      }
    }

    // 4. Build the AI prompt
    const systemPrompt = `You are a talent intelligence system for The Quantum Club. You extract professional skills from resumes/CVs and assess them against job requirements. Be thorough and precise. Never invent credentials not found in the resume.`;

    const userPrompt = `Analyze the attached resume PDF and extract all professional skills.

${jobContext}

Return your analysis using the extract_skills_from_resume tool.

Rules:
- Extract SPECIFIC skills from the resume content (technologies, methodologies, tools, domain expertise, languages, certifications)
- Infer proficiency from context: years of experience, seniority of roles, depth of usage
  - beginner: mentioned but minimal evidence of use
  - intermediate: used in 1-2 roles or mentioned as secondary skill
  - advanced: used extensively across multiple roles, key part of responsibilities
  - expert: deep expertise, leadership in this area, 5+ years
- Include soft skills only if clearly evidenced (e.g., "managed team of 12" → Leadership)
- Maximum 40 skills
- For job matching: only mark a requirement as "matched" if the resume provides clear evidence`;

    // 5. Call Lovable AI with the PDF
    const tools: any[] = [{
      type: 'function',
      function: {
        name: 'extract_skills_from_resume',
        description: 'Extract professional skills from a resume and optionally match against job requirements',
        parameters: {
          type: 'object',
          properties: {
            skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Skill name' },
                  proficiency: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
                  category: { type: 'string', enum: ['technical', 'soft', 'domain', 'tool', 'language', 'certification'] },
                  evidence: { type: 'string', description: 'Brief evidence from the resume supporting this skill' },
                },
                required: ['name', 'proficiency', 'category'],
                additionalProperties: false,
              },
            },
            job_match: {
              type: 'array',
              description: 'Assessment of each job requirement against the resume (only if job context provided)',
              items: {
                type: 'object',
                properties: {
                  requirement: { type: 'string' },
                  matched: { type: 'boolean' },
                  evidence: { type: 'string', description: 'Evidence from the resume, or reason for no match' },
                  requirement_type: { type: 'string', enum: ['must_have', 'nice_to_have'] },
                },
                required: ['requirement', 'matched', 'requirement_type'],
                additionalProperties: false,
              },
            },
          },
          required: ['skills'],
          additionalProperties: false,
        },
      },
    }];

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${base64Pdf}` },
          },
        ],
      },
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: { type: 'function', function: { name: 'extract_skills_from_resume' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error(`AI gateway error ${status}:`, body);
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI extraction failed (${status})`);
    }

    const aiData = await aiResponse.json();

    // Parse tool call response
    let extractedSkills: any[] = [];
    let jobMatchResults: any[] = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      extractedSkills = parsed.skills || [];
      jobMatchResults = parsed.job_match || [];
    }

    if (extractedSkills.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skills_extracted: 0, message: 'No skills could be extracted from the resume' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Store skills
    const skillNames = extractedSkills.map((s: any) => s.name);

    // Update candidate_profiles.skills
    await supabase
      .from('candidate_profiles')
      .update({ skills: skillNames })
      .eq('id', candidate_id);

    // Upsert into profile_skills with integer proficiency
    const skillRows = extractedSkills.map((s: any) => ({
      user_id: candidate_id,
      skill_name: s.name,
      proficiency_level: PROFICIENCY_MAP[s.proficiency] || 2,
      category: s.category || 'technical',
      source: 'ai_cv_extraction',
    }));

    for (const row of skillRows) {
      await supabase.from('profile_skills').upsert(row, {
        onConflict: 'user_id,skill_name',
      });
    }

    console.log(`Extracted ${extractedSkills.length} skills for candidate ${candidate_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        skills_extracted: extractedSkills.length,
        skills: extractedSkills,
        job_match: jobMatchResults,
        results: [{ candidate_id, skills_extracted: extractedSkills.length, total_skills: skillNames.length }],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-skills-from-experience:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
