import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// FAQ responses as fallback
const getFAQResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes("no-cure-no-pay") || lowerMessage.includes("fee")) {
    return "Our no-cure-no-pay model means you only pay when we successfully place a candidate. Our standard fee is 20% of the first-year salary, paid only after the hire completes their probation period. No upfront costs or retainers.";
  } else if (lowerMessage.includes("time") || lowerMessage.includes("long")) {
    return "Our typical timeline is 2-4 weeks from brief to shortlist, with first interviews happening within the first week. For executive searches, it may take 4-8 weeks to find the perfect candidate.";
  } else if (lowerMessage.includes("industry") || lowerMessage.includes("industries")) {
    return "We specialize in Technology, Finance, Healthcare, Consulting, and high-growth startups. Our network spans globally with a focus on senior and executive-level positions across Europe, North America, and Asia-Pacific markets.";
  } else if (lowerMessage.includes("country") || lowerMessage.includes("international") || lowerMessage.includes("location")) {
    return "We work with companies worldwide. Whether you're based in Europe, North America, Asia, or anywhere else, our global network can connect you with top talent in your region or help you recruit internationally.";
  }
  
  return "I can help you with that. Our team will provide detailed information during the consultation.";
};

export function FunnelAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: "Hi! I'm here to help you with any questions about partnering with The Quantum Club. What would you like to know?",
    },
  ]);

  const quickReplies = [
    "What is the no-cure-no-pay model?",
    "How long does the process take?",
    "What industries do you work with?",
    "What are your fees?",
  ];

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setIsLoading(true);
    
    try {
      // Try to use AI backend
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage,
          context: 'partner_funnel',
          systemPrompt: `You are QUIN, the AI assistant for The Quantum Club, a luxury executive recruitment platform. 
          
Answer questions about:
- No-cure-no-pay model: Only pay when a candidate is successfully placed. 20% fee of first-year salary, paid after probation.
- Timeline: 2-4 weeks from brief to shortlist. First interviews within first week. Executive searches: 4-8 weeks.
- Industries: Technology, Finance, Healthcare, Consulting, high-growth startups.
- Global reach: Europe, North America, Asia-Pacific focus.
- Process: Submit request → Strategy call → Shortlist → Interviews → Offer → Placement

Keep responses concise, professional, and helpful. Always offer to connect them with a strategist for detailed discussions.`
        }
      });

      if (error) throw error;
      
      if (data?.response) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.response 
        }]);
      } else {
        throw new Error("No response from AI");
      }
    } catch (error) {
      // Fallback to FAQ responses
      const fallbackResponse = getFAQResponse(userMessage);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: fallbackResponse 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    setMessage(reply);
    // Use setTimeout to ensure state is updated before sending
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Ask a question..."]') as HTMLInputElement;
      if (input) {
        input.value = reply;
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }, 0);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-lg z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <MessageCircle />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col glass-effect">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">QUIN - AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by The Quantum Club</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
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

          {messages.length === 1 && (
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <Button
                    key={reply}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleQuickReply(reply)}
                  >
                    {reply}
                  </Button>
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
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !message.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
