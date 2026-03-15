import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { migrateToast as toast } from "@/lib/notify";
import { logger } from "@/lib/logger";

export interface Message {
  role: "user" | "assistant";
  content: string;
  needsConfirmation?: boolean;
  confirmationMessage?: string;
  action?: {
    type: "navigate";
    path: string;
    reason: string;
  };
  mode?: "search" | "think" | "canvas" | "normal";
}

interface Conversation {
  id: string;
  messages?: Message[];
  updated_at: string;
  [key: string]: unknown;
}

const STATIC_PLACEHOLDERS = [
  ["What's the best strategy for my job search?", "How should I prepare for technical interviews?", "Can you review my career trajectory?", "What salary should I negotiate for?", "Help me optimize my LinkedIn profile"],
  ["What are the latest trends in my industry?", "Review my active applications", "Help me draft a follow-up email", "What skills should I develop next?", "Summarize my week"],
  ["Prepare me for my next interview", "What's urgent on my plate today?", "How can I improve my profile?", "Show me matching opportunities", "Help me write a cover letter"],
];

export function useClubAIChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string | null; current_title?: string | null; career_preferences?: string | null; current_salary_min?: number | null; avatar_url?: string | null } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [pendingNavigation, setPendingNavigation] = useState<{ path: string; reason: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("club-ai-0.1");
  const [selectedMode, setSelectedMode] = useState<"normal" | "search" | "think" | "canvas">("normal");
  const [dynamicPlaceholders, setDynamicPlaceholders] = useState<string[]>(STATIC_PLACEHOLDERS[0]);

  useEffect(() => {
    loadProfile();
    loadConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const idx = messages.length % STATIC_PLACEHOLDERS.length;
    setDynamicPlaceholders(STATIC_PLACEHOLDERS[idx]);
  }, [messages.length]);

  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      logger.error("Error loading profile:", { error });
    }
  }, [user]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_type", "club_ai")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setConversations((data || []).map((conv: Record<string, unknown>) => ({
        ...conv,
        id: conv.id as string,
        updated_at: conv.updated_at as string,
        messages: Array.isArray(conv.messages) ? conv.messages :
          typeof conv.messages === 'string' ? JSON.parse(conv.messages as string) : []
      })));
    } catch (error) {
      logger.error("Error loading conversations:", { error });
      toast({ title: "Failed to load conversations", variant: "destructive" });
    }
  }, [user]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.from("ai_conversations").select("*").eq("id", conversationId).maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages as unknown as Message[]);
      }
    } catch (error) {
      logger.error("Error loading conversation:", { error });
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
  }, []);

  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, conversation_type: "club_ai", messages: [], context: {} })
        .select()
        .single();
      if (error) throw error;
      setCurrentConversationId(data.id);
      setMessages([]);
      await loadConversations();
      toast({ title: "New conversation started", description: "You can now chat with Club AI" });
      return data.id;
    } catch (error) {
      logger.error("Error creating conversation:", { error });
      toast({ title: "Error", description: "Failed to create conversation", variant: "destructive" });
      return null;
    }
  }, [user, loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase.from("ai_conversations").delete().eq("id", conversationId);
      if (error) throw error;
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      await loadConversations();
      toast({ title: "Conversation deleted", description: "The conversation has been removed" });
    } catch (error) {
      logger.error("Error deleting conversation:", { error });
      toast({ title: "Error", description: "Failed to delete conversation", variant: "destructive" });
    }
  }, [currentConversationId, loadConversations]);

  const saveConversation = useCallback(async (updatedMessages: Message[]) => {
    if (!user || !currentConversationId) return;
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .update({
          messages: JSON.stringify(updatedMessages) as unknown as import("@/integrations/supabase/types").Json,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentConversationId);
      if (error) throw error;
    } catch (error) {
      logger.error("Error saving conversation:", { error });
      toast({ title: "Failed to save conversation", variant: "destructive" });
    }
  }, [user, currentConversationId]);

  const streamChat = useCallback(async ({
    messages: msgs,
    userId,
    conversationId,
    images,
    documents,
    selectedModel: model,
    onDelta,
    onDone,
  }: {
    messages: Message[];
    userId?: string;
    conversationId?: string | null;
    images?: string[];
    documents?: Array<{ name: string; type: string; content: string }>;
    selectedModel?: string;
    onDelta: (chunk: string, toolCall?: unknown) => void;
    onDone: () => void;
  }) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-ai-chat`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: msgs, userId, conversationId, images, documents, selectedModel: model }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        toast({ title: "Rate Limit Exceeded", description: "Rate limits exceeded, please try again later.", variant: "destructive" });
        throw new Error("Rate limited");
      }
      if (resp.status === 402) {
        toast({ title: "Payment Required", description: "Payment required. Please add funds to continue.", variant: "destructive" });
        throw new Error("Payment required");
      }
      throw new Error("Failed to start stream");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
          if (content) onDelta(content);
          if (toolCalls) onDelta("", toolCalls);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }
    onDone();
  }, []);

  const sendMessage = useCallback(async (messageText: string, uploadedFiles?: File[], modelOverride?: string) => {
    if (!messageText.trim() && (!uploadedFiles || uploadedFiles.length === 0)) return;

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) {
        toast({ title: "Error", description: "Failed to create conversation. Please try again.", variant: "destructive" });
        return;
      }
    }

    let mode: Message["mode"] = "normal";
    if (messageText.startsWith("[Search:")) mode = "search";
    else if (messageText.startsWith("[Think:")) mode = "think";
    else if (messageText.startsWith("[Canvas:")) mode = "canvas";

    // Process files
    let imageDataUrls: string[] = [];
    let documentData: Array<{ name: string; type: string; content: string }> = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
      const docFiles = uploadedFiles.filter(f => !f.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        try {
          imageDataUrls = await Promise.all(imageFiles.map(file =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
          ));
        } catch (error) {
          logger.error("Error converting images:", { error });
          toast({ title: "Error", description: "Failed to process uploaded images", variant: "destructive" });
          return;
        }
      }

      if (docFiles.length > 0) {
        try {
          documentData = await Promise.all(docFiles.map(file =>
            new Promise<{ name: string; type: string; content: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve({ name: file.name, type: file.type, content: e.target?.result as string });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
          ));
        } catch (error) {
          logger.error("Error processing documents:", { error });
          toast({ title: "Error", description: "Failed to process uploaded documents", variant: "destructive" });
          return;
        }
      }
    }

    const userMessage: Message = { role: "user", content: messageText, mode };
    let assistantContent = "";
    let needsConfirmation = false;
    let confirmationMessage = "";
    const pendingToolCalls: Array<{ type: string; path: string; reason: string }> = [];

    const updateAssistant = (chunk: string, toolCalls?: unknown) => {
      assistantContent += chunk;
      if (toolCalls && Array.isArray(toolCalls)) {
        toolCalls.forEach((tc: Record<string, unknown>) => {
          const fn = tc.function as Record<string, string> | undefined;
          if (fn?.name === "navigate_to_page") {
            try {
              const args = JSON.parse(fn.arguments || "{}") as { path: string; reason: string };
              pendingToolCalls.push({ type: "navigate" as const, path: args.path, reason: args.reason });
            } catch (e) {
              logger.error("Failed to parse tool call:", { error: e });
            }
          }
        });
      }

      if (assistantContent.toLowerCase().includes("<button>confirm</button>") ||
        assistantContent.toLowerCase().includes("confirm button") ||
        assistantContent.toLowerCase().includes("click to confirm")) {
        needsConfirmation = true;
        const match = assistantContent.match(/(.*?)(?:<button>confirm<\/button>|confirm button|click to confirm)/is);
        if (match) confirmationMessage = match[1].trim();
      }

      const cleanContent = assistantContent.replace(/<button>confirm<\/button>/gi, "").replace(/\*\*Confirm\*\*/gi, "").trim();

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const action = pendingToolCalls.length > 0 ? pendingToolCalls[0] : undefined;
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: cleanContent, needsConfirmation, confirmationMessage: confirmationMessage || cleanContent, action }
              : m
          );
        }
        return [...prev, { role: "assistant", content: cleanContent, needsConfirmation, confirmationMessage: confirmationMessage || cleanContent, action }];
      });
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      setIsLoading(true);
      streamChat({
        messages: updated,
        userId: user?.id,
        conversationId,
        images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        documents: documentData.length > 0 ? documentData : undefined,
        selectedModel: modelOverride,
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          setMessages((prev) => {
            saveConversation(prev).catch(e => logger.error("Save error:", { error: e }));
            loadConversations().catch(e => logger.error("Load error:", { error: e }));
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.action?.type === "navigate") {
              setTimeout(() => navigate(lastMsg.action!.path), 1500);
            }
            return prev;
          });
        },
      }).catch((error) => {
        logger.error("Error sending message:", { error });
        toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
        setIsLoading(false);
      });
      return updated;
    });
  }, [currentConversationId, createNewConversation, user, streamChat, saveConversation, loadConversations, navigate]);

  const handleConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    const confirmMessage: Message = { role: "user", content: "Yes, confirmed. Please proceed." };

    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, confirmMessage];
      setIsLoading(true);

      let assistantContent = "";
      const pendingToolCalls: Array<{ type: string; path: string; reason: string }> = [];

      const updateAssistant = (chunk: string, toolCalls?: unknown) => {
        assistantContent += chunk;
        if (toolCalls && Array.isArray(toolCalls)) {
          toolCalls.forEach((tc: Record<string, unknown>) => {
            const fn = tc.function as Record<string, string> | undefined;
            if (fn?.name === "navigate_to_page") {
              try {
                const args = JSON.parse(fn.arguments || "{}");
                pendingToolCalls.push({ type: "navigate", path: args.path, reason: args.reason });
              } catch (e) {
                logger.error("Failed to parse tool call:", { error: e });
              }
            }
          });
        }
        const cleanContent = assistantContent.replace(/<button>confirm<\/button>/gi, "").replace(/\*\*Confirm\*\*/gi, "").trim();
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const action = pendingToolCalls.length > 0 ? pendingToolCalls[0] : undefined;
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent, action } : m);
          }
          return [...prev, { role: "assistant", content: cleanContent, action }];
        });
      };

      streamChat({
        messages: updatedMessages,
        userId: user?.id,
        onDelta: updateAssistant,
        onDone: () => {
          setIsLoading(false);
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.action?.type === "navigate") {
              setTimeout(() => navigate(lastMsg.action!.path), 1500);
            }
            return prev;
          });
        },
      }).catch((error) => {
        logger.error("Error after confirmation:", { error });
        toast({ title: "Error", description: "Failed to process confirmation", variant: "destructive" });
        setIsLoading(false);
      });

      return updatedMessages;
    });
  }, [user, streamChat, navigate]);

  return {
    messages,
    isLoading,
    profile,
    showConfirmDialog,
    setShowConfirmDialog,
    pendingAction,
    setPendingAction,
    pendingNavigation,
    setPendingNavigation,
    scrollRef,
    messagesEndRef,
    conversations,
    currentConversationId,
    setCurrentConversationId,
    showConversations,
    setShowConversations,
    selectedModel,
    setSelectedModel,
    selectedMode,
    setSelectedMode,
    dynamicPlaceholders,
    createNewConversation,
    deleteConversation,
    sendMessage,
    handleConfirm,
  };
}
