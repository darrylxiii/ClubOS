
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmailReplyInput {
    reply_id?: string;
    prospect_id?: string;
    from_email: string;
    from_name?: string;
    subject?: string;
    body_text: string;
    body_html?: string;
    received_at?: string;
}

interface AnalysisResult {
    classification: string;
    sentiment_score: number;
    confidence_score: number;
    urgency: string;
    intent_score?: number;
    suggested_action: string;
    suggested_reply?: string;
    ai_summary: string;
    buying_signals?: Record<string, any>;
    competitor_mentions?: string[];
    competitor_sentiment?: string;
    referral_opportunity?: boolean;
    referral_contact?: { name?: string; email?: string; title?: string };
    follow_up_timing?: string;
    follow_up_priority?: string;
    recommended_channel?: string;
    objections_detected?: Array<{ type: string; objection: string; suggested_response: string }>;
    questions_asked?: Array<{ question: string; answer_hint: string }>;
    meeting_interest_level?: string;
    smart_replies?: { professional?: string; friendly?: string; decline?: string };
    extracted_data: {
        mentioned_names?: string[];
        mentioned_dates?: string[];
        mentioned_companies?: string[];
        objections?: string[];
        questions?: string[];
        referral_contact?: { name?: string; email?: string; title?: string };
        meeting_interest?: boolean;
        budget_mentioned?: boolean;
        timeline_mentioned?: string;
    };
}

export const handleAnalyzeEmailReply = async ({ supabase, payload, token }: { supabase: any; payload: any, token: string | null }) => {
    const input = payload as EmailReplyInput;

    if (!input.body_text && !input.body_html) {
        throw new Error('Email body is required');
    }

    const emailContent = input.body_text || input.body_html || '';
    const subject = input.subject || '';

    // Call AI to analyze the email reply
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
        throw new Error('AI API key not configured');
    }

    const prompt = `You are an expert sales email analyst for The Quantum Club, a premium talent platform. Analyze this email reply from a sales outreach campaign with deep intelligence extraction.

EMAIL SUBJECT: ${subject}
EMAIL FROM: ${input.from_name || ''} <${input.from_email}>
EMAIL BODY:
${emailContent}

Analyze this reply and provide a comprehensive JSON response with the following structure:
{
  "classification": "one of: hot_lead, warm_lead, interested, objection, not_interested, out_of_office, auto_reply, bounce, unsubscribe, referral, question, spam",
  "sentiment_score": "number from -1 (very negative) to 1 (very positive)",
  "confidence_score": "number from 0 to 1 indicating confidence in classification",
  "urgency": "one of: high, medium, low",
  "intent_score": "number from 0 to 100 indicating buying intent strength",
  "suggested_action": "brief description of recommended next action",
  "suggested_reply": "if appropriate, a brief suggested reply template",
  "ai_summary": "2-3 sentence summary of the email and its implications for sales",
  
  "buying_signals": {
    "budget": {
      "mentioned": true/false,
      "amount": null or number,
      "currency": null or string,
      "confidence": 0-100
    },
    "authority": {
      "is_decision_maker": true/false,
      "decision_maker_mentioned": null or "name/title",
      "confidence": 0-100
    },
    "need": {
      "identified": true/false,
      "pain_points": ["list of pain points mentioned"],
      "requirements": ["list of requirements mentioned"],
      "confidence": 0-100
    },
    "timeline": {
      "mentioned": true/false,
      "timeframe": null or "Q1 2025, next month, etc.",
      "urgency": null or "immediate, this_quarter, this_year, exploratory",
      "confidence": 0-100
    }
  },
  
  "competitor_mentions": ["list of competitor names mentioned"],
  "competitor_sentiment": "positive, neutral, or negative if competitors mentioned",
  
  "referral_opportunity": true/false,
  "referral_contact": {"name": "", "email": "", "title": ""} or null,
  
  "follow_up_priority": "immediate, same_day, next_day, this_week, or can_wait",
  "recommended_channel": "email, phone, linkedin, or meeting",
  
  "objections_detected": [{"type": "price/timing/fit/other", "objection": "the objection", "suggested_response": "how to address it"}],
  "questions_asked": [{"question": "the question", "answer_hint": "key points to address"}],
  
  "meeting_interest_level": "high, medium, low, or none",
  
  "smart_replies": {
    "professional": "A professional response template (max 100 words)",
    "friendly": "A friendly response template (max 100 words)",
    "decline": "A polite way to acknowledge if they're not interested (max 50 words)"
  },
  
  "extracted_data": {
    "mentioned_names": ["array of people names mentioned"],
    "mentioned_dates": ["array of dates or timeframes mentioned"],
    "mentioned_companies": ["array of company names mentioned"],
    "objections": ["array of objections or concerns raised"],
    "questions": ["array of questions asked"],
    "referral_contact": {"name": "", "email": "", "title": ""} or null,
    "meeting_interest": true/false,
    "budget_mentioned": true/false,
    "timeline_mentioned": "any timeline mentioned or null"
  }
}

Classification guidelines:
- hot_lead: Explicitly interested, wants to schedule a meeting or demo, shows strong buying signals
- warm_lead: Positive response, interested but not ready for meeting, asking good questions
- interested: Shows interest, asks questions about offering
- objection: Raises concerns or objections that need addressing
- not_interested: Clear rejection or lack of interest
- out_of_office: Auto-reply indicating person is away
- auto_reply: Generic auto-reply (not out of office)
- bounce: Email delivery failure notification
- unsubscribe: Request to stop receiving emails
- referral: Suggests contacting someone else
- question: Asks questions without clear interest signal
- spam: Spam or irrelevant reply

Intent Score guidelines:
- 80-100: Ready to buy, requesting meeting/demo, strong BANT signals
- 60-79: Engaged and interested, asking detailed questions
- 40-59: Curious but non-committal, early stage exploration
- 20-39: Lukewarm, minimal engagement signals
- 0-19: Not interested or negative response

Respond ONLY with valid JSON, no additional text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are an expert email analyst. Respond only with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';

    // Parse the AI response
    let analysis: AnalysisResult;
    try {
        // Clean up the response - remove markdown code blocks if present
        const cleanedContent = aiContent
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
        console.error('Failed to parse AI response:', aiContent);
        // Return a default analysis if parsing fails
        analysis = {
            classification: 'unclassified',
            sentiment_score: 0,
            confidence_score: 0.5,
            urgency: 'medium',
            suggested_action: 'Review manually - AI analysis failed to parse',
            ai_summary: 'Unable to analyze this email automatically. Please review manually.',
            buying_signals: {},
            competitor_mentions: [],
            referral_opportunity: false,
            extracted_data: {},
            objections_detected: [],
            questions_asked: [],
            smart_replies: {}
        };
    }

    // If we have a reply_id, update the record in the database
    if (input.reply_id) {
        const intentScore = analysis.intent_score ||
            (analysis.classification === 'hot_lead' ? 85 :
                analysis.classification === 'warm_lead' ? 65 :
                    analysis.classification === 'interested' ? 50 :
                        analysis.classification === 'question' ? 40 :
                            analysis.classification === 'objection' ? 30 :
                                20);

        const { error: updateError } = await supabase
            .from('crm_email_replies')
            .update({
                classification: analysis.classification,
                sentiment_score: analysis.sentiment_score,
                confidence_score: analysis.confidence_score,
                urgency: analysis.urgency,
                suggested_action: analysis.suggested_action,
                suggested_reply: analysis.suggested_reply,
                ai_summary: analysis.ai_summary,
                extracted_data: analysis.extracted_data,
                ai_analysis: {
                    raw_response: aiContent,
                    analyzed_at: new Date().toISOString(),
                    model: 'gemini-2.5-flash',
                    buying_signals: analysis.buying_signals,
                    competitor_mentions: analysis.competitor_mentions,
                    smart_replies: analysis.smart_replies,
                },
                analyzed_at: new Date().toISOString(),
                priority: analysis.urgency === 'high' ? 5 : analysis.urgency === 'medium' ? 3 : 1,
                intent_score: intentScore,
                follow_up_priority: analysis.follow_up_priority || 'can_wait',
                smart_category: analysis.classification === 'hot_lead' ? 'hot' :
                    analysis.classification === 'warm_lead' || analysis.classification === 'interested' ? 'warm' :
                        analysis.classification === 'question' ? 'questions' :
                            analysis.classification === 'objection' ? 'objections' :
                                analysis.classification === 'out_of_office' || analysis.classification === 'auto_reply' ? 'ooo' :
                                    analysis.classification === 'not_interested' || analysis.classification === 'unsubscribe' ? 'negative' :
                                        'all',
            })
            .eq('id', input.reply_id);

        if (updateError) {
            console.error('Failed to update reply record:', updateError);
        }

        // Store detailed intelligence in crm_reply_intelligence table
        const { error: intelligenceError } = await supabase
            .from('crm_reply_intelligence')
            .upsert({
                reply_id: input.reply_id,
                prospect_id: input.prospect_id,
                intent_score: intentScore,
                conversion_probability: analysis.intent_score ? analysis.intent_score * 0.8 : null,
                buying_signals: analysis.buying_signals || {},
                competitor_mentions: analysis.competitor_mentions || [],
                competitor_sentiment: analysis.competitor_sentiment || null,
                referral_opportunity: analysis.referral_opportunity || false,
                referral_contact: analysis.referral_contact || null,
                follow_up_timing: analysis.follow_up_timing || null,
                follow_up_priority: analysis.follow_up_priority || 'can_wait',
                recommended_channel: analysis.recommended_channel || 'email',
                objections_detected: analysis.objections_detected || [],
                questions_asked: analysis.questions_asked || [],
                meeting_interest_level: analysis.meeting_interest_level || 'none',
                smart_replies: analysis.smart_replies || {},
                raw_analysis: { full_response: analysis },
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'reply_id'
            });

        if (intelligenceError) {
            console.error('Failed to store reply intelligence:', intelligenceError);
        }

        // Also update the prospect's reply sentiment
        if (input.prospect_id) {
            const { error: prospectError } = await supabase
                .from('crm_prospects')
                .update({
                    reply_sentiment: analysis.classification === 'hot_lead' ? 'hot' :
                        analysis.classification === 'warm_lead' ? 'warm' :
                            analysis.classification === 'interested' ? 'warm' :
                                analysis.classification === 'objection' ? 'objection' :
                                    analysis.classification === 'not_interested' ? 'negative' :
                                        analysis.classification === 'out_of_office' ? 'out_of_office' :
                                            analysis.classification === 'referral' ? 'referral' :
                                                analysis.classification === 'unsubscribe' ? 'unsubscribe' :
                                                    'neutral',
                    stage: analysis.classification === 'hot_lead' ? 'qualified' :
                        analysis.classification === 'unsubscribe' ? 'unsubscribed' :
                            undefined,
                    lead_score: analysis.intent_score ? Math.min(100, (analysis.intent_score + 20)) : undefined,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.prospect_id);

            if (prospectError) {
                console.error('Failed to update prospect record:', prospectError);
            }
        }
    }

    return {
        success: true,
        analysis,
        reply_id: input.reply_id,
        prospect_id: input.prospect_id,
    };
};
