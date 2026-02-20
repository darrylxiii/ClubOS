import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchAI, handleAIError, AITimeoutError, createTimeoutResponse } from "../_shared/ai-fetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Encode an ArrayBuffer to base64 in chunks to avoid stack overflow on large files
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let result = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return btoa(result);
}

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
    // Use chunked base64 encoding — safe for large multi-page PDFs
    const base64 = arrayBufferToBase64(fileBuffer);

    const contentType = fileResp.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.includes("pdf") ? "application/pdf" : contentType.split(";")[0];
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are QUIN, financial intelligence for The Quantum Club — a recruitment company operating from the Netherlands and Dubai.

Your job: extract ALL financial data from this invoice or receipt with 100% accuracy.

CURRENCY RULES:
- Always return amounts in the invoice's ORIGINAL currency — NEVER convert to EUR.
- Detect the currency code from symbols or text: € = EUR, $ = USD, £ = GBP, د.إ or AED = AED.
- If ambiguous, prefer the currency shown next to the total amount.

VAT / TAX RULES:
- Netherlands (NL): Standard BTW rate is 21%. Detect from 'BTW', 'VAT', Dutch VAT number (NL + 9 digits).
  Set vat_rate_percent = 21 unless a different rate is printed.
- UAE / Dubai: Standard VAT is 5%. Detect from 'TRN', 'UAE VAT', 'Federal Tax Authority', 'VAT Registration'.
  Set vat_rate_percent = 5 unless the document says 0% (zero-rated export).
  If zero-rated: set vat_amount = 0, vat_rate_percent = 0, is_vat_exempt = true.
- UK: Standard rate 20%. Detect from 'GB' VAT number or 'VAT Reg No'.
- USA / US companies: Typically NO VAT. If no tax line exists: vat_amount = 0, is_vat_exempt = true.
- If the invoice has NO VAT/tax line at all: set vat_amount = 0, is_vat_exempt = true.
- Never invent VAT that isn't on the document.

AMOUNT EXTRACTION:
- amount_net = subtotal before tax (excl. VAT/tax)
- amount_gross = final total (incl. VAT/tax) — this is usually the "Total Due" or "Amount Due"
- vat_amount = the tax line amount (may be 0)
- If only gross is shown (no separate tax line): set amount_net = amount_gross, vat_amount = 0, is_vat_exempt = true
- Return numeric values only — no symbols or thousand separators. EU format "1.234,56" → 1234.56

CATEGORY:
Map the product/service to EXACTLY one of these category names (copy verbatim):
  Software & SaaS, Office & Facilities, Professional Services, Marketing & Advertising,
  Travel & Entertainment, Salaries & Benefits, Insurance & Compliance,
  Partnerships & Retainers, Other

Examples: AWS/Vercel/Figma → "Software & SaaS", law firm invoice → "Professional Services",
office rent → "Office & Facilities", flight/hotel → "Travel & Entertainment"

RECURRING:
If the document mentions "subscription", "monthly fee", "annual fee", "recurring", "auto-renew",
"plan", "licence", or billing period dates → set is_recurring_hint = true.
Detect frequency: "monthly" | "annual" | "quarterly"`;

    const userPrompt = `Analyse this invoice/receipt carefully and call the extract_invoice_data function with all extracted data.`;

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
              name: "extract_invoice_data",
              description: "Extract all structured financial data from the invoice or receipt.",
              parameters: {
                type: "object",
                properties: {
                  supplier: {
                    type: "string",
                    description: "Vendor / company name as printed on the invoice",
                  },
                  invoice_reference: {
                    type: "string",
                    description: "Invoice number, order number, or reference code",
                  },
                  purchase_date: {
                    type: "string",
                    description: "Invoice date in YYYY-MM-DD format",
                  },
                  description: {
                    type: "string",
                    description: "Brief description of the product/service, including plan name or item details",
                  },
                  currency: {
                    type: "string",
                    description: "ISO 4217 currency code detected from the document (EUR, USD, GBP, AED, etc.)",
                  },
                  amount_net: {
                    type: "number",
                    description: "Amount excluding VAT/tax, in the document's original currency. Numeric only.",
                  },
                  amount_gross: {
                    type: "number",
                    description: "Total amount including VAT/tax (Amount Due), in the document's original currency. Numeric only.",
                  },
                  vat_amount: {
                    type: "number",
                    description: "VAT or tax amount in the original currency. 0 if exempt or no tax line exists.",
                  },
                  vat_rate_percent: {
                    type: "number",
                    description: "VAT rate as a percentage (e.g. 21 for Dutch BTW, 5 for UAE VAT, 0 if exempt). Numeric only.",
                  },
                  is_vat_exempt: {
                    type: "boolean",
                    description: "True if the invoice has no VAT, is zero-rated, or explicitly marked as VAT exempt.",
                  },
                  jurisdiction: {
                    type: "string",
                    description: "Detected country or region of the vendor (e.g. Netherlands, UAE, UK, USA, Other)",
                  },
                  suggested_expense_category: {
                    type: "string",
                    enum: [
                      "Software & SaaS",
                      "Office & Facilities",
                      "Professional Services",
                      "Marketing & Advertising",
                      "Travel & Entertainment",
                      "Salaries & Benefits",
                      "Insurance & Compliance",
                      "Partnerships & Retainers",
                      "Other",
                    ],
                    description: "Best-fit expense category from the allowed list",
                  },
                  is_recurring_hint: {
                    type: "boolean",
                    description: "True if the invoice implies a recurring/subscription charge",
                  },
                  recurring_frequency_hint: {
                    type: "string",
                    enum: ["monthly", "quarterly", "annual"],
                    description: "Detected billing frequency if is_recurring_hint is true",
                  },
                },
                required: ["supplier", "currency", "amount_gross"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "extract_invoice_data" },
        },
      },
      { timeoutMs: 60000 }
    );

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

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI could not extract invoice data" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted invoice data:", JSON.stringify(extracted));

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
