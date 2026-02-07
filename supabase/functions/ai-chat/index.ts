import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAI, handleAIError, AITimeoutError, createTimeoutResponse } from "../_shared/ai-fetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARTNER_FUNNEL_KNOWLEDGE = `
# The Quantum Club - Partner Funnel FAQ

## Pricing & Fees
- **No-Cure-No-Pay Model**: You only pay when we successfully place a candidate
- **Standard Fee**: 20% of the first-year salary
- **Payment Terms**: Paid only after the hire completes their probation period (typically 3 months)
- **No upfront costs, retainers, or hidden fees**
- **Guarantee**: If a placed candidate leaves within the probation period, we find a replacement at no additional cost

## Timeline & Process
1. **Submit Request**: Complete the partner funnel form (5 minutes)
2. **Strategy Call**: Within 24-48 hours, a dedicated strategist contacts you
3. **Brief Alignment**: We understand your needs, culture, and requirements
4. **Shortlist Delivery**: 2-4 weeks from brief to qualified shortlist
5. **First Interviews**: Typically within the first week of search
6. **Executive Searches**: May take 4-8 weeks for perfect senior-level candidates

## Industries We Serve
- **Technology**: Software, SaaS, AI/ML, Cybersecurity, Fintech
- **Finance**: Investment Banking, Private Equity, Asset Management, Insurance
- **Healthcare**: Biotech, Pharma, MedTech, Digital Health
- **Consulting**: Strategy, Management, Operations, Technology
- **High-Growth Startups**: Series A to Pre-IPO companies

## Global Reach
- **Primary Markets**: Europe (Netherlands, UK, Germany), North America, Asia-Pacific
- **We work with companies worldwide**
- **International recruitment**: We can help recruit across borders
- **Remote/Hybrid**: We support all work arrangement types

## What Makes Us Different
- **Invite-Only Network**: Access to passive candidates not actively job-seeking
- **Strategist-Led**: Dedicated human strategist for every search
- **AI-Powered Matching**: QUIN AI enhances candidate matching and insights
- **Discretion Guaranteed**: Confidential searches for sensitive roles
- **Speed**: First candidates within 1 week

## Support
- **24/7 Platform Access**: Track your searches in real-time
- **Dedicated Strategist**: Direct line to your account manager
- **Partnership Team**: hello@thequantumclub.com
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, systemPrompt } = await req.json() as {
      message: string;
      context?: string;
      systemPrompt?: string;
    };

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalSystemPrompt = systemPrompt || `You are Club AI, the AI assistant for The Quantum Club, a luxury executive recruitment platform.

${PARTNER_FUNNEL_KNOWLEDGE}

Guidelines:
- Be concise, professional, and helpful
- Use the knowledge base above to answer questions accurately
- If unsure, suggest they speak with a strategist for personalized guidance
- Keep responses under 150 words unless detail is specifically requested
- Always maintain a premium, consultative tone
- Offer to connect them with a strategist when appropriate`;

    // Use Lovable AI Gateway
    const response = await fetchAI({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }, { timeoutMs: 30000 });

    // Handle rate limits and credit exhaustion
    const errorResponse = handleAIError(response, corsHeaders);
    if (errorResponse) {
      return errorResponse;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 
      "I apologize, I couldn't process that request. Please try again or submit your partner request form for direct assistance.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Chat error:", error);
    
    // Handle timeout specifically
    if (error instanceof AITimeoutError) {
      return createTimeoutResponse(corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process request",
        response: "I apologize, I'm having trouble right now. Please complete the partner request form and a strategist will reach out with detailed answers to your questions."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
