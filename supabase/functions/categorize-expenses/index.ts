import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { expenses } = await req.json();

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No expenses provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // Build the prompt with expense data
    const expenseList = expenses
      .map(
        (e: { id: string; description: string; vendor: string | null; amount: number }) =>
          `- ID: ${e.id}, Description: "${e.description}", Vendor: "${e.vendor || "unknown"}", Amount: €${e.amount}`
      )
      .join("\n");

    const categories = [
      "Salaries & Benefits",
      "Software & SaaS",
      "Office & Facilities",
      "Marketing & Advertising",
      "Professional Services",
      "Travel & Entertainment",
      "Other",
    ];

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expense categorization assistant for a recruitment agency. Categorize each expense into exactly one of these categories: ${categories.join(", ")}. Return the result using the suggest_categories tool.`,
          },
          {
            role: "user",
            content: `Categorize these expenses:\n${expenseList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_categories",
              description: "Return categorization for each expense",
              parameters: {
                type: "object",
                properties: {
                  categorizations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Expense ID" },
                        category: {
                          type: "string",
                          enum: categories,
                          description: "Best matching category",
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence 0-1",
                        },
                        reason: {
                          type: "string",
                          description: "Brief reason for categorization",
                        },
                      },
                      required: ["id", "category", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categorizations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_categories" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI quota exceeded. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI categorization failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No categorization result from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-expenses error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
