import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAI, handleAIError, AITimeoutError, createTimeoutResponse } from "../_shared/ai-fetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download file from URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await fileResp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Detect mime type from URL or response
    const contentType = fileResp.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.includes("pdf") ? "application/pdf" : contentType.split(";")[0];

    // For PDFs, Gemini needs image/* so we note it as pdf
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are QUIN, an AI assistant for The Quantum Club. You are an expert at reading receipts, invoices, and purchase documents. Extract all financial and asset data you can find. Be precise with numbers — always use the values exactly as printed. For dates, use YYYY-MM-DD format. For the suggested_category, pick from: it_hardware, office_furniture, software_purchased, software_developed, development_costs, other.`;

    const userPrompt = `Analyze this receipt/invoice image and extract all relevant asset and purchase information. Call the extract_receipt_data function with the data you find.`;

    const response = await fetchAI(
      {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ] as any,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description:
                "Extract structured data from a receipt or invoice document.",
              parameters: {
                type: "object",
                properties: {
                  asset_name: {
                    type: "string",
                    description:
                      "Primary item/product name from the receipt (e.g. 'MacBook Pro 16-inch')",
                  },
                  purchase_value_excl_vat: {
                    type: "number",
                    description: "Total amount excluding VAT/tax, in euros",
                  },
                  vat_amount: {
                    type: "number",
                    description: "VAT/tax amount in euros",
                  },
                  purchase_date: {
                    type: "string",
                    description: "Invoice/receipt date in YYYY-MM-DD format",
                  },
                  supplier: {
                    type: "string",
                    description: "Vendor/company name on the receipt",
                  },
                  invoice_reference: {
                    type: "string",
                    description: "Invoice number, order number, or reference code",
                  },
                  description: {
                    type: "string",
                    description:
                      "Brief description of the purchased item(s), including model/specs if visible",
                  },
                  suggested_category: {
                    type: "string",
                    enum: [
                      "it_hardware",
                      "office_furniture",
                      "software_purchased",
                      "software_developed",
                      "development_costs",
                      "other",
                    ],
                    description:
                      "Best-fit asset category based on the item description",
                  },
                },
                required: ["asset_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "extract_receipt_data" },
        },
      },
      { timeoutMs: 60000 }
    );

    // Handle standard AI errors (rate limit, credits)
    const aiError = handleAIError(response, corsHeaders);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI could not extract receipt data" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-receipt error:", error);

    if (error instanceof AITimeoutError) {
      return createTimeoutResponse(corsHeaders);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
