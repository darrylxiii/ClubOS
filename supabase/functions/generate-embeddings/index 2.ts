/**
 * Generate Embeddings Edge Function
 * 
 * Generates vector embeddings for jobs and candidate profiles using OpenAI's embedding API.
 * These embeddings enable semantic search and intelligent matching.
 * 
 * Usage:
 * POST /generate-embeddings
 * Body: { entity_type: 'job' | 'profile', entity_id: string, force_regenerate?: boolean }
 * 
 * Returns: { success: boolean, embedding_generated: boolean }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
    entity_type: 'job' | 'profile';
    entity_id: string;
    force_regenerate?: boolean;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { entity_type, entity_id, force_regenerate = false }: EmbeddingRequest = await req.json();

        if (!entity_type || !entity_id) {
            return new Response(
                JSON.stringify({ error: 'entity_type and entity_id are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[Embeddings] Generating for ${entity_type}: ${entity_id}`);

        // Fetch entity data
        let textToEmbed = '';
        let table = '';

        if (entity_type === 'job') {
            table = 'jobs';
            const { data: job, error } = await supabase
                .from('jobs')
                .select('id, title, description, required_skills, nice_to_have_skills, location, employment_type, seniority_level, embedding_generated_at')
                .eq('id', entity_id)
                .single();

            if (error) throw error;
            if (!job) {
                return new Response(
                    JSON.stringify({ error: 'Job not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Check if embedding already exists and is recent
            if (!force_regenerate && job.embedding_generated_at) {
                const hoursSinceGeneration = (Date.now() - new Date(job.embedding_generated_at).getTime()) / (1000 * 60 * 60);
                if (hoursSinceGeneration < 24) {
                    console.log(`[Embeddings] Using cached embedding for job ${entity_id}`);
                    return new Response(
                        JSON.stringify({ success: true, embedding_generated: false, cached: true }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            }

            // Construct text representation of the job
            const skills = [...(job.required_skills || []), ...(job.nice_to_have_skills || [])].join(', ');
            textToEmbed = `Job Title: ${job.title}
Description: ${job.description || 'Not provided'}
Skills: ${skills}
Location: ${job.location || 'Remote'}
Employment Type: ${job.employment_type || 'Full-time'}
Seniority: ${job.seniority_level || 'Mid-level'}`;

        } else if (entity_type === 'profile') {
            table = 'profiles';
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, full_name, bio, current_title, skills, years_of_experience, location, preferred_job_types, embedding_generated_at')
                .eq('id', entity_id)
                .single();

            if (error) throw error;
            if (!profile) {
                return new Response(
                    JSON.stringify({ error: 'Profile not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Check if embedding already exists and is recent
            if (!force_regenerate && profile.embedding_generated_at) {
                const hoursSinceGeneration = (Date.now() - new Date(profile.embedding_generated_at).getTime()) / (1000 * 60 * 60);
                if (hoursSinceGeneration < 24) {
                    console.log(`[Embeddings] Using cached embedding for profile ${entity_id}`);
                    return new Response(
                        JSON.stringify({ success: true, embedding_generated: false, cached: true }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            }

            // Construct text representation of the profile
            const skills = (profile.skills || []).join(', ');
            const jobTypes = (profile.preferred_job_types || []).join(', ');
            textToEmbed = `Name: ${profile.full_name || 'Candidate'}
Current Title: ${profile.current_title || 'Not specified'}
Bio: ${profile.bio || 'Not provided'}
Skills: ${skills}
Experience: ${profile.years_of_experience || 0} years
Location: ${profile.location || 'Not specified'}
Preferred Job Types: ${jobTypes}`;
        }

        console.log(`[Embeddings] Text to embed (${textToEmbed.length} chars): ${textToEmbed.substring(0, 200)}...`);

        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: textToEmbed,
            }),
        });

        if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        console.log(`[Embeddings] Generated embedding with ${embedding.length} dimensions`);

        // Store embedding in database
        const { error: updateError } = await supabase
            .from(table)
            .update({
                embedding: embedding,
                embedding_model: 'text-embedding-3-small',
                embedding_generated_at: new Date().toISOString(),
            })
            .eq('id', entity_id);

        if (updateError) throw updateError;

        console.log(`[Embeddings] Successfully stored embedding for ${entity_type} ${entity_id}`);

        return new Response(
            JSON.stringify({
                success: true,
                embedding_generated: true,
                dimensions: embedding.length,
                model: 'text-embedding-3-small'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Embeddings] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
