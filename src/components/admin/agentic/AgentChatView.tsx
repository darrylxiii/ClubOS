import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Send, Plus, Settings2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AgentInstructionsPanel from './AgentInstructionsPanel';

interface Agent {
  agent_name: string;
  display_name: string;
  description: string | null;
  autonomy_level: string | null;
  capabilities: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentChatView({ initialAgent }: { initialAgent?: string }) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(initialAgent || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      const { data } = await supabase
        .from('agent_registry')
        .select('agent_name, display_name, description, autonomy_level, capabilities')
        .eq('is_active', true)
        .order('display_name');
      if (data) {
        setAgents(data);
        if (!selectedAgent && data.length > 0) {
          setSelectedAgent(initialAgent || data[0].agent_name);
        }
      }
      setLoading(false);
    };
    loadAgents();
  }, []);

  // Load conversation when agent changes
  useEffect(() => {
    if (!selectedAgent || !user?.id) return;
    const loadConversation = async () => {
      const { data } = await supabase
        .from('agent_conversations')
        .select('id, messages')
        .eq('agent_name', selectedAgent)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setMessages((data.messages as unknown as ChatMessage[]) || []);
        setConversationId(data.id);
      } else {
        setMessages([]);
        setConversationId(null);
      }
    };
    loadConversation();
  }, [selectedAgent, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !selectedAgent) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistic update
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: {
          agent_name: selectedAgent,
          message: userMessage,
          conversation_id: conversationId,
        },
      });

      if (error) throw error;

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      if (data.conversation_id) setConversationId(data.conversation_id);
    } catch (err) {
      toast.error('Failed to get response from agent');
      // Remove optimistic message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const currentAgent = agents.find((a) => a.agent_name === selectedAgent);

  if (loading) {
    return <Skeleton className="h-[600px] rounded-xl" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Agent Selector Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select an agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.agent_name} value={agent.agent_name}>
                <div className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  {agent.display_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentAgent && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentAgent.autonomy_level || 'manual'}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {currentAgent.description?.slice(0, 60)}
              {(currentAgent.description?.length || 0) > 60 ? '...' : ''}
            </span>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowInstructions(!showInstructions)}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={startNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions && selectedAgent && (
        <AgentInstructionsPanel agentName={selectedAgent} />
      )}

      {/* Chat Messages */}
      <Card variant="static" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {currentAgent?.display_name || 'Agent'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Start a conversation. Ask questions, give instructions, or review past decisions.
              </p>
              {currentAgent?.capabilities && currentAgent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  {currentAgent.capabilities.slice(0, 4).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px]">
                      {cap}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card/60 border border-border/30 text-foreground rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bot className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">
                      {currentAgent?.display_name}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-card/60 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t border-border/20 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-muted/20 border border-border/30 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              placeholder={`Message ${currentAgent?.display_name || 'agent'}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sending}
            />
            <Button
              variant="primary"
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Powered by QUIN • Responses informed by agent memory, decisions, and your feedback
          </p>
        </div>
      </Card>
    </div>
  );
}
