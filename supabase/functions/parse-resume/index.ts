import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  yearsOfExperience?: number;
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

    const { documentId, fileUrl, candidateId, triggerNormalization = true, triggerEnrichment = true } = await req.json();

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
      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
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
      resumeText = await fileResponse.text();
    }

    if (!resumeText || resumeText.length < 50) {
      console.log("[parse-resume] Limited text extracted, using AI with URL directly");
      resumeText = `Resume file available at: ${resumeUrl}. Please analyze the resume structure and content.`;
    }

    console.log("[parse-resume] Calling AI to parse resume content...");

    // Use AI with tool calling for structured extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract structured data from resumes accurately. Call the extract_resume_data tool with the parsed information."
          },
          {
            role: "user",
            content: `Parse this resume and extract all structured data:\n\n${resumeText.substring(0, 10000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_resume_data",
              description: "Extract structured resume data",
              parameters: {
                type: "object",
                properties: {
                  skills: { type: "array", items: { type: "string" }, description: "All skills mentioned" },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        company: { type: "string" },
                        duration: { type: "string" },
                        description: { type: "string" },
                        startDate: { type: "string", description: "ISO date or YYYY-MM" },
                        endDate: { type: "string", description: "ISO date, YYYY-MM, or null if current" },
                      },
                      required: ["title", "company", "duration"],
                    },
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        degree: { type: "string" },
                        institution: { type: "string" },
                        year: { type: "string" },
                        field: { type: "string" },
                      },
                      required: ["degree", "institution"],
                    },
                  },
                  summary: { type: "string", description: "Professional summary if present" },
                  languages: { type: "array", items: { type: "string" } },
                  certifications: { type: "array", items: { type: "string" } },
                  yearsOfExperience: { type: "number", description: "Total years of professional experience" },
                  contactInfo: {
                    type: "object",
                    properties: {
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                      linkedin: { type: "string" },
                    },
                  },
                },
                required: ["skills", "experience", "education"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[parse-resume] AI API error:", errorText);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();

    // Extract from tool call response
    let parsedResume: ParsedResume;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        parsedResume = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback: try parsing from content
        const content = aiData.choices?.[0]?.message?.content || "{}";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsedResume = JSON.parse(cleaned);
      }
    } catch (parseError) {
      console.error("[parse-resume] Parse error:", parseError);
      parsedResume = { skills: [], experience: [], education: [] };
    }

    console.log("[parse-resume] Parsed:", {
      skills: parsedResume.skills?.length || 0,
      experience: parsedResume.experience?.length || 0,
      education: parsedResume.education?.length || 0,
      languages: parsedResume.languages?.length || 0,
      certifications: parsedResume.certifications?.length || 0,
      yearsOfExperience: parsedResume.yearsOfExperience,
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

    // --- PHASE 1 ENHANCEMENT: Write parsed data back to candidate_profiles ---
    if (candidateId) {
      const profileUpdate: Record<string, any> = {};

      // Work history
      if (parsedResume.experience?.length > 0) {
        profileUpdate.work_history = parsedResume.experience.map(e => ({
          title: e.title,
          company: e.company,
          duration: e.duration,
          description: e.description || null,
          start_date: e.startDate || null,
          end_date: e.endDate || null,
        }));
      }

      // Education
      if (parsedResume.education?.length > 0) {
        profileUpdate.education = parsedResume.education.map(e => ({
          degree: e.degree,
          institution: e.institution,
          year: e.year || null,
          field: e.field || null,
        }));
      }

      // Languages
      if (parsedResume.languages && parsedResume.languages.length > 0) {
        profileUpdate.languages = parsedResume.languages;
      }

      // Certifications
      if (parsedResume.certifications && parsedResume.certifications.length > 0) {
        profileUpdate.certifications = parsedResume.certifications;
      }

      // Years of experience
      if (parsedResume.yearsOfExperience && parsedResume.yearsOfExperience > 0) {
        profileUpdate.years_of_experience = parsedResume.yearsOfExperience;
      }

      // Contact info updates (only fill empty fields)
      if (parsedResume.contactInfo) {
        const { data: currentProfile } = await supabase
          .from("candidate_profiles")
          .select("phone, location, linkedin_url")
          .eq("id", candidateId)
          .single();

        if (currentProfile) {
          if (!currentProfile.phone && parsedResume.contactInfo.phone) {
            profileUpdate.phone = parsedResume.contactInfo.phone;
          }
          if (!currentProfile.location && parsedResume.contactInfo.location) {
            profileUpdate.location = parsedResume.contactInfo.location;
          }
          if (!currentProfile.linkedin_url && parsedResume.contactInfo.linkedin) {
            profileUpdate.linkedin_url = parsedResume.contactInfo.linkedin;
          }
        }
      }

      // Update profile if we have data
      if (Object.keys(profileUpdate).length > 0) {
        profileUpdate.updated_at = new Date().toISOString();
        const { error: profileError } = await supabase
          .from("candidate_profiles")
          .update(profileUpdate)
          .eq("id", candidateId);

        if (profileError) {
          console.error("[parse-resume] Profile update error:", profileError.message);
        } else {
          console.log(`[parse-resume] Updated candidate_profiles with ${Object.keys(profileUpdate).length} fields`);
        }
      }

      // Insert skills
      if (parsedResume.skills?.length > 0) {
        const { data: existingSkills } = await supabase
          .from("candidate_skills")
          .select("skill_name")
          .eq("candidate_id", candidateId);

        const existingSet = new Set((existingSkills || []).map(s => s.skill_name.toLowerCase()));
        const newSkills = parsedResume.skills.filter(s => !existingSet.has(s.toLowerCase()));

        if (newSkills.length > 0) {
          await supabase.from("candidate_skills").insert(
            newSkills.map(skill => ({
              candidate_id: candidateId,
              skill_name: skill,
              source: "resume_parse",
              proficiency_level: "intermediate",
            }))
          );
          console.log(`[parse-resume] Added ${newSkills.length} skills`);
        }
      }

      // Also write to profile_experience and profile_education tables
      // (for candidates with user-managed profiles)
      if (parsedResume.experience?.length > 0) {
        // Check if profile_id column references exist
        for (const exp of parsedResume.experience.slice(0, 10)) {
          await supabase.from("profile_experience").upsert({
            profile_id: candidateId,
            company: exp.company,
            title: exp.title,
            description: exp.description || null,
            start_date: exp.startDate || null,
            end_date: exp.endDate || null,
            is_current: !exp.endDate,
          }, { onConflict: 'profile_id,company,title', ignoreDuplicates: true }).select();
        }
      }

      if (parsedResume.education?.length > 0) {
        for (const edu of parsedResume.education.slice(0, 5)) {
          await supabase.from("profile_education").upsert({
            profile_id: candidateId,
            institution: edu.institution,
            degree: edu.degree,
            field_of_study: edu.field || null,
            graduation_year: edu.year ? parseInt(edu.year) : null,
          }, { onConflict: 'profile_id,institution,degree', ignoreDuplicates: true }).select();
        }
      }

      // Trigger skill normalization
      if (triggerNormalization && parsedResume.skills?.length > 0) {
        try {
          await supabase.functions.invoke("normalize-candidate-skills", {
            body: { candidateId },
          });
        } catch (normError) {
          console.error("[parse-resume] Skill normalization error:", normError);
        }
      }

      // Trigger enrichment (AI summary, tier, embedding)
      if (triggerEnrichment) {
        try {
          await supabase.functions.invoke("enrich-candidate-profile", {
            body: { candidate_id: candidateId },
          });
          console.log("[parse-resume] Triggered enrichment pipeline");
        } catch (enrichError) {
          console.error("[parse-resume] Enrichment trigger error:", enrichError);
        }
      }

      // Audit log
      await supabase.from("candidate_application_logs").insert({
        candidate_profile_id: candidateId,
        action: "resume_parsed",
        details: {
          document_id: documentId,
          skills_extracted: parsedResume.skills?.length || 0,
          experience_entries: parsedResume.experience?.length || 0,
          education_entries: parsedResume.education?.length || 0,
          languages: parsedResume.languages?.length || 0,
          certifications: parsedResume.certifications?.length || 0,
          years_of_experience: parsedResume.yearsOfExperience || null,
          fields_updated: Object.keys(profileUpdate),
          enrichment_triggered: triggerEnrichment,
          parsed_at: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsedResume,
        documentId,
        fieldsUpdated: candidateId ? true : false,
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
