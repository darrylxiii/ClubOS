import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const { messages, bookingLink } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const systemPrompt = `You are an AI booking assistant for "${bookingLink.title}", a ${bookingLink.duration_minutes}-minute meeting. 
    
Your job is to:
1. Help users find available times
2. Suggest optimal meeting times based on their preferences
3. Handle natural language time requests ("tomorrow afternoon", "next Tuesday morning", etc.)
4. Be friendly, concise, and efficient
5. When a time is confirmed, respond with a JSON object in this format: {"booking": {"date": "YYYY-MM-DD", "time": "HH:MM"}}

Current date/time: ${new Date().toISOString()}

Be conversational but professional. Always confirm dates and times clearly before booking.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI quota exceeded. Please check your Google API billing." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Try to extract booking information if present
    let booking = null;
    try {
      const bookingMatch = aiMessage.match(/\{[^}]*"booking"[^}]*\}/);
      if (bookingMatch) {
        booking = JSON.parse(bookingMatch[0]).booking;
      }
    } catch (e) {
      // No booking in response
    }

    // PHASE 3: If AI confirmed a booking, call create-booking edge function
    if (booking?.date && booking?.time) {
      console.log("[AI Assistant] Booking confirmed, calling create-booking:", booking);

      // Store the AI booking intent for the client to complete with guest details
      // The actual booking will be created when the guest fills in their info
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        booking,
        // Include booking link info for client to complete the booking
        bookingLinkId: bookingLink.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
}));
