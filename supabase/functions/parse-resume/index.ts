import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface ParsedResume {
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
    field?: string;
  }>;
  summary?: string;
  languages?: string[];
  certifications?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[parse-resume] Starting resume parsing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, fileUrl, candidateId, triggerNormalization = true } = await req.json();

    if (!documentId && !fileUrl) {
      throw new Error("Either documentId or fileUrl is required");
    }

    // If documentId provided, fetch the file URL
    let resumeUrl = fileUrl;
    let docRecord: any = null;

    if (documentId) {
      const { data: document, error: docError } = await supabase
        .from("candidate_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (docError || !document) {
        throw new Error("Document not found");
      }

      docRecord = document;
      resumeUrl = document.file_url;
    }

    console.log("[parse-resume] Fetching resume from:", resumeUrl);

    // Fetch the resume file
    const fileResponse = await fetch(resumeUrl);
    if (!fileResponse.ok) {
      throw new Error("Failed to fetch resume file");
    }

    const contentType = fileResponse.headers.get("content-type") || "";
    let resumeText = "";

    // Handle different file types
    if (contentType.includes("pdf")) {
      // For PDFs, we'll extract text using AI vision or fallback to metadata
      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Use AI to extract text from PDF
      console.log("[parse-resume] Extracting text from PDF via AI...");
      
      const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text content from this resume PDF. Return just the raw text, preserving the structure as much as possible. Focus on: personal info, work experience, education, skills, and certifications."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
        }),
      });

      if (extractionResponse.ok) {
        const extractionData = await extractionResponse.json();
        resumeText = extractionData.choices?.[0]?.message?.content || "";
      }
    } else {
      // For text-based formats (doc, docx might come as text)
      resumeText = await fileResponse.text();
    }

    if (!resumeText || resumeText.length < 50) {
      console.log("[parse-resume] Limited text extracted, using AI with URL directly");
      resumeText = `Resume file available at: ${resumeUrl}. Please analyze the resume structure and content.`;
    }

    console.log("[parse-resume] Calling AI to parse resume content...");

    // Use AI to parse structured data from resume text
    const parsePrompt = `Analyze this resume and extract structured information in JSON format:

RESUME TEXT:
${resumeText.substring(0, 8000)}

Return a JSON object with these fields:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Brief description of role",
      "startDate": "2020-01",
      "endDate": null
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "University Name",
      "year": "2018",
      "field": "Computer Science"
    }
  ],
  "summary": "Professional summary if present",
  "languages": ["English", "Dutch"],
  "certifications": ["AWS Certified", "PMP"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "+31...",
    "location": "Amsterdam, Netherlands",
    "linkedin": "linkedin.com/in/..."
  }
}

Return ONLY valid JSON, no markdown formatting or explanations.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract structured data from resumes accurately. Always return valid JSON only."
          },
          {
            role: "user",
            content: parsePrompt
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[parse-resume] AI API error:", errorText);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Clean and parse JSON
    let parsedResume: ParsedResume;
    try {
      const cleanedJson = aiContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedResume = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("[parse-resume] JSON parse error:", parseError);
      parsedResume = {
        skills: [],
        experience: [],
        education: [],
      };
    }

    console.log("[parse-resume] Parsed resume:", {
      skills: parsedResume.skills?.length || 0,
      experience: parsedResume.experience?.length || 0,
      education: parsedResume.education?.length || 0,
    });

    // Update the document with parsing results
    if (docRecord) {
      await supabase
        .from("candidate_documents")
        .update({
          parsing_results: parsedResume,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
    }

    // Update candidate profile with parsed data if candidateId provided
    if (candidateId && parsedResume.skills?.length > 0) {
      // Get existing skills
      const { data: existingSkills } = await supabase
        .from("candidate_skills")
        .select("skill_name")
        .eq("candidate_id", candidateId);

      const existingSkillNames = new Set(existingSkills?.map(s => s.skill_name.toLowerCase()) || []);
      
      // Add new skills
      const newSkills = parsedResume.skills.filter(s => !existingSkillNames.has(s.toLowerCase()));
      
      if (newSkills.length > 0) {
        const skillInserts = newSkills.map(skill => ({
          candidate_id: candidateId,
          skill_name: skill,
          source: "resume_parse",
          proficiency_level: "intermediate",
        }));

        await supabase.from("candidate_skills").insert(skillInserts);
        console.log(`[parse-resume] Added ${newSkills.length} new skills for candidate`);
      }

      // Trigger skill normalization if enabled
      if (triggerNormalization) {
        try {
          await supabase.functions.invoke("normalize-candidate-skills", {
            body: { candidateId },
          });
          console.log("[parse-resume] Triggered skill normalization");
        } catch (normError) {
          console.error("[parse-resume] Skill normalization error:", normError);
        }
      }
    }

    // Log to application logs
    if (candidateId) {
      await supabase.from("candidate_application_logs").insert({
        candidate_profile_id: candidateId,
        action: "resume_parsed",
        details: {
          document_id: documentId,
          skills_extracted: parsedResume.skills?.length || 0,
          experience_entries: parsedResume.experience?.length || 0,
          education_entries: parsedResume.education?.length || 0,
          parsed_at: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsedResume,
        documentId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[parse-resume] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
