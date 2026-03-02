import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Benefit-focused FAQ fallbacks — no fee percentages, no contract language
const getFAQResponse = (message: string): string => {
  const m = message.toLowerCase();

  if (m.includes("quick") || m.includes("fast") || m.includes("long") || m.includes("time") || m.includes("week")) {
    return "We typically deliver a curated shortlist within 2–4 weeks of our kickoff call, with first-round interviews often happening in the first week. For senior or executive searches it may take 4–8 weeks to get it right.";
  }
  if (m.includes("senior") || m.includes("level") || m.includes("seniority") || m.includes("executive") || m.includes("junior")) {
    return "We specialise in mid to senior-level placements — think Head of, VP, Director, C-suite, and highly specialised individual contributors. We don't do volume junior hiring.";
  }
  if (m.includes("process") || m.includes("how") || m.includes("work") || m.includes("step")) {
    return "It's simple: submit your request → we schedule a 30-minute strategy call → we send you a curated shortlist → you interview and decide. We handle all sourcing, screening, and coordination.";
  }
  if (m.includes("country") || m.includes("international") || m.includes("global") || m.includes("remote") || m.includes("location")) {
    return "Yes — we recruit internationally. Our network spans Europe, the Middle East, North America, and Asia-Pacific. Whether you need someone local or open to relocation, we can help.";
  }
  if (m.includes("industry") || m.includes("sector") || m.includes("tech") || m.includes("finance")) {
    return "We work across Technology, Finance, Healthcare, Consulting, and high-growth scale-ups. Our sweet spot is companies where the right hire materially changes the outcome.";
  }

  return "I can help with that. Our team will give you a detailed answer during the strategy call — usually within 24 hours of submitting your request.";
};

export function FunnelAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content:
        "Hi — I'm QUIN, The Quantum Club's AI assistant. Ask me anything about working with us.",
    },
  ]);

  // Benefit-oriented quick replies — no fee or contract language
  const quickReplies = [
    "How quickly can you find candidates?",
    "What seniority levels do you recruit?",
    "How does the process work?",
    "Can you recruit internationally?",
  ];

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMessage,
          context: "partner_funnel",
          systemPrompt: `You are QUIN, the AI assistant for The Quantum Club — a luxury executive recruitment platform operating from the Netherlands and Dubai.

Answer questions about:
- Speed: Shortlists in 2–4 weeks. First interviews within week 1. Senior/exec: 4–8 weeks.
- Seniority: Mid-senior to C-suite and specialist IC roles. Not volume junior hiring.
- Process: Request → 30-min strategy call → curated shortlist → interviews → placement.
- Global: Europe, Middle East, North America, Asia-Pacific. Local and relocation candidates.
- Industries: Technology, Finance, Healthcare, Consulting, high-growth scale-ups.

Tone: calm, professional, concise. Never mention specific fee percentages or contract terms — direct those questions to the strategist. Always end with an invitation to submit the request.`,
        },
      });

      if (error) throw error;

      if (data?.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        throw new Error("No response");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: getFAQResponse(userMessage) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send with the captured reply text directly
  const sendReply = (reply: string) => {
    if (isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: reply }]);
    setIsLoading(true);

    supabase.functions
      .invoke("ai-chat", {
        body: {
          message: reply,
          context: "partner_funnel",
          systemPrompt: `You are QUIN, the AI assistant for The Quantum Club. Be concise and helpful. Don't mention fees or contracts.`,
        },
      })
      .then(({ data, error }) => {
        if (error || !data?.response) throw new Error();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: getFAQResponse(reply) },
        ]);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      {/* Floating trigger — pushed up on mobile to avoid overlapping submit button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 sm:bottom-6 max-sm:bottom-20 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 sm:w-96 h-[480px] shadow-2xl z-50 flex flex-col glass-effect">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">QUIN</h3>
              <p className="text-xs text-muted-foreground">The Quantum Club AI</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick replies — shown only on first message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">Common questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => sendReply(reply)}
                    className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isLoading || !message.trim()}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
