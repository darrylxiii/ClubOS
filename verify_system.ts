
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/x/dotenv/mod.ts";

const env = config({ safe: true });
const supabaseUrl = env.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRetrieval() {
    console.log("\n--- Testing 1. retrieve-context (GraphRAG) ---");
    const { data, error } = await supabase.functions.invoke('retrieve-context', {
        body: { query: "Who is a good candidate for React?", company_id: null }
    });
    if (error) console.error("Error:", error);
    else {
        console.log("Success! Matches Found:", data.matches?.length);
        if (data.matches?.length > 0) {
            console.log("Top Match:", data.matches[0].content.substring(0, 100) + "...");
        }
    }
}

async function testHeadhunter() {
    console.log("\n--- Testing 2. run-headhunter-agent ---");
    // 1. Get an open job
    let { data: jobs } = await supabase.from('jobs').select('id').eq('status', 'open').limit(1);
    if (!jobs || jobs.length === 0) {
        console.log("No open jobs found. Cannot fully test headhunter.");
        return;
    }
    const jobId = jobs[0].id;
    console.log(`Using Job ID: ${jobId}`);

    const { data, error } = await supabase.functions.invoke('run-headhunter-agent', {
        body: { jobId: jobId }
    });

    if (error) console.error("Error:", error);
    else console.log("Success! Agent output:", JSON.stringify(data, null, 2));
}

async function testSentinel() {
    console.log("\n--- Testing 3. analyze-interview-stream ---");
    const { data, error } = await supabase.functions.invoke('analyze-interview-stream', {
        body: {
            transcript_chunk: "I have 10 years of experience in Rust and I worked at Google as a VP.",
            candidate_id: null,
            session_id: "test-session"
        }
    });

    if (error) console.error("Error:", error);
    else console.log("Success! Sentinel Analysis:", JSON.stringify(data, null, 2));
}

async function run() {
    await testRetrieval();
    await testHeadhunter();
    await testSentinel();
}

run();
