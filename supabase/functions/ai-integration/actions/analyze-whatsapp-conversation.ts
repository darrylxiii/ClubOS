
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleAnalyzeWhatsAppConversation = async ({ supabase, payload, token }: { supabase: any; payload: any, token: string | null }) => {
    const { conversationId } = payload;

    if (!conversationId) {
        throw new Error("conversationId is required");
    }

    // Fetch all messages
    const { data: messages, error: messagesError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

    if (convError) throw convError;

    // Calculate analytics
    const totalMessages = messages?.length || 0;
    const inboundMessages = messages?.filter((m: any) => m.direction === "inbound") || [];
    const outboundMessages = messages?.filter((m: any) => m.direction === "outbound") || [];

    // Calculate response times
    const responseTimes: number[] = [];
    for (let i = 1; i < (messages?.length || 0); i++) {
        const current = messages![i];
        const previous = messages![i - 1];
        if (current.direction !== previous.direction) {
            const timeDiff = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
            responseTimes.push(timeDiff / 1000 / 60); // in minutes
        }
    }
    const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Sentiment analysis summary
    const sentimentScores = messages
        ?.filter((m: any) => m.sentiment_score !== null)
        .map((m: any) => m.sentiment_score as number) || [];
    const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

    // Intent distribution
    const intents = messages?.reduce((acc: any, m: any) => {
        if (m.intent_classification) {
            acc[m.intent_classification] = (acc[m.intent_classification] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>) || {};

    // Key topics extraction (simple word frequency)
    const allContent = messages
        ?.filter((m: any) => m.content)
        .map((m: any) => m.content)
        .join(" ")
        .toLowerCase() || "";

    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "and", "or", "but", "if", "then", "else", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "not", "only", "same", "so", "than", "too", "very", "just", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "am", "for", "to", "of", "in", "on", "at", "by", "with", "about", "from"]);

    const words = allContent.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    const wordFreq = words.reduce((acc: any, word: string) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(wordFreq)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

    // Determine conversation health
    let health: "healthy" | "needs_attention" | "at_risk" = "healthy";
    if (avgSentiment < -0.3 || (conversation.unread_count || 0) > 5) {
        health = "at_risk";
    } else if (avgSentiment < 0 || avgResponseTime > 60) {
        health = "needs_attention";
    }

    // Generate action items
    const actionItems: string[] = [];
    const lastMessage = messages?.[messages.length - 1];

    if (lastMessage?.direction === "inbound" && lastMessage?.intent_classification === "question") {
        actionItems.push("Answer pending question from candidate");
    }
    if (lastMessage?.direction === "inbound" && lastMessage?.intent_classification === "interested") {
        actionItems.push("Schedule interview or follow-up call");
    }
    if ((conversation.unread_count || 0) > 0) {
        actionItems.push(`Respond to ${conversation.unread_count} unread message(s)`);
    }
    if (avgResponseTime > 120) {
        actionItems.push("Improve response time - currently averaging " + Math.round(avgResponseTime) + " minutes");
    }

    // Next best action
    let nextBestAction = "Keep the conversation going";
    if (lastMessage?.intent_classification === "interested") {
        nextBestAction = "Send available interview slots";
    } else if (lastMessage?.intent_classification === "question") {
        nextBestAction = "Answer their question";
    } else if (lastMessage?.intent_classification === "reschedule") {
        nextBestAction = "Propose alternative times";
    } else if (lastMessage?.intent_classification === "negative") {
        nextBestAction = "Address concerns or offer alternatives";
    }

    const insights = {
        summary: {
            totalMessages,
            inboundCount: inboundMessages.length,
            outboundCount: outboundMessages.length,
            avgResponseTimeMinutes: Math.round(avgResponseTime),
            avgSentiment: Math.round(avgSentiment * 100) / 100,
            health,
        },
        intents,
        topTopics,
        actionItems,
        nextBestAction,
        timeline: {
            firstMessage: messages?.[0]?.created_at,
            lastMessage: lastMessage?.created_at,
            lastDirection: lastMessage?.direction,
        },
    };

    // Store insights in analytics table
    await supabase
        .from("whatsapp_analytics")
        .upsert({
            conversation_id: conversationId,
            total_messages: totalMessages,
            inbound_messages: inboundMessages.length,
            outbound_messages: outboundMessages.length,
            avg_response_time_minutes: Math.round(avgResponseTime),
            sentiment_trend: avgSentiment,
            date: new Date().toISOString().split("T")[0],
        }, {
            onConflict: "conversation_id,date"
        });

    return { success: true, insights };
};
