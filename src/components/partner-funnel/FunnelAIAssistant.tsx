import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";

export function FunnelAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
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

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([...messages, { role: "user", content: message }]);
    
    // Simple FAQ responses
    let response = "I can help you with that. Our team will provide detailed information during the consultation.";
    
    if (message.toLowerCase().includes("no-cure-no-pay") || message.toLowerCase().includes("fee")) {
      response = "Our no-cure-no-pay model means you only pay when we successfully place a candidate. Our standard fee is 20% of the first-year salary, paid only after the hire completes their probation period. No upfront costs or retainers.";
    } else if (message.toLowerCase().includes("time") || message.toLowerCase().includes("long")) {
      response = "Our typical timeline is 2-4 weeks from brief to shortlist, with first interviews happening within the first week. For executive searches, it may take 4-8 weeks to find the perfect candidate.";
    } else if (message.toLowerCase().includes("industry") || message.toLowerCase().includes("industries")) {
      response = "We specialize in Technology, Finance, Healthcare, Consulting, and high-growth startups. Our network spans globally with a focus on senior and executive-level positions across Europe, North America, and Asia-Pacific markets.";
    } else if (message.toLowerCase().includes("country") || message.toLowerCase().includes("international") || message.toLowerCase().includes("location")) {
      response = "We work with companies worldwide. Whether you're based in Europe, North America, Asia, or anywhere else, our global network can connect you with top talent in your region or help you recruit internationally.";
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }, 500);

    setMessage("");
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
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask me anything about partnerships</p>
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
                    onClick={() => {
                      setMessage(reply);
                      handleSend();
                    }}
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
              />
              <Button size="icon" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
