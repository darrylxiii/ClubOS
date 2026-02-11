import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/unified-loader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data, error } = await supabase.functions.invoke("chat-ollama", {
        body: {
          messages: [...messages, userMessage],
          model: "llama2"
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (error) throw error;

      if (data.error) {
        notify.error("Configuration Required", { description: data.error });
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error("Error:", error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        notify.error("Timeout", { description: "AI request timed out after 30s" });
      } else {
        notify.error("Failed to get response from AI");
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-background/50 backdrop-blur border-border/50">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Assistant
        </h2>
        <p className="text-sm text-muted-foreground">Powered by your Ollama server</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation with the AI assistant
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                  }`}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                <InlineLoader text="Thinking..." />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <InlineLoader /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
};
