import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { WhatsAppConversationList } from "@/components/whatsapp/WhatsAppConversationList";
import { WhatsAppChatThread } from "@/components/whatsapp/WhatsAppChatThread";
import { WhatsAppTemplateSelector } from "@/components/whatsapp/WhatsAppTemplateSelector";
import { WhatsAppAIInsights } from "@/components/whatsapp/WhatsAppAIInsights";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MessageSquare, Sparkles, Settings, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify";

export default function WhatsAppInbox() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const { conversations, loading: conversationsLoading, markAsRead } = useWhatsAppConversations();
  const { messages, loading: messagesLoading, sending, sendMessage } = useWhatsAppMessages(selectedConversationId);
  const { templates, loading: templatesLoading, syncing, syncTemplates } = useWhatsAppTemplates();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count > 0) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content, 'text');
  };

  const handleSendTemplate = async (template: any, params: Record<string, string>) => {
    const templateParams = Object.entries(params).map(([key, value]) => ({ [key]: value }));
    await sendMessage('', 'template', template.template_name, templateParams);
    setShowTemplates(false);
    notify.success("Template sent", { description: `Sent: ${template.template_name}` });
  };

  // Mock insights for now
  const mockInsights = selectedConversation ? {
    summary: "Candidate shows strong interest in the Senior Developer role. Has asked detailed questions about tech stack and team culture.",
    keyTopics: ["Tech Stack", "Remote Work", "Salary", "Team Size"],
    sentiment: "positive" as const,
    sentimentScore: 0.75,
    buyingSignals: ["Asked about start date", "Mentioned availability", "Requested job details"],
    objections: ["Concerned about commute time"],
    actionItems: [
      { text: "Schedule technical interview", priority: "high" as const },
      { text: "Send company culture deck", priority: "medium" as const }
    ],
    nextBestAction: "Schedule a follow-up call to discuss the role in detail and address the commute concern.",
    relationshipScore: 82,
    engagementLevel: "high" as const
  } : null;

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner']}>
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25d366] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">WhatsApp Business</h1>
                <p className="text-xs text-muted-foreground">
                  {conversations.length} conversations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/whatsapp-analytics')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/whatsapp-settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation List */}
            <div className="w-[380px] border-r border-border">
              <WhatsAppConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                loading={conversationsLoading}
              />
            </div>

            {/* Chat Thread */}
            <div className="flex-1">
              <WhatsAppChatThread
                conversation={selectedConversation}
                messages={messages}
                loading={messagesLoading}
                sending={sending}
                onSend={handleSendMessage}
                onOpenTemplates={() => setShowTemplates(true)}
                onOpenInsights={() => setShowInsights(true)}
                onViewProfile={() => {
                  if (selectedConversation?.candidate_id) {
                    navigate(`/candidate/${selectedConversation.candidate_id}`);
                  }
                }}
              />
            </div>

            {/* AI Insights Panel (Desktop) */}
            {showInsights && selectedConversation && (
              <div className="w-[350px] border-l border-border hidden xl:block">
                <WhatsAppAIInsights
                  conversationId={selectedConversation.id}
                  candidateName={selectedConversation.candidate_name || 'Candidate'}
                  insights={mockInsights}
                  onClose={() => setShowInsights(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Template Selector Dialog */}
        <WhatsAppTemplateSelector
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          templates={templates}
          loading={templatesLoading}
          syncing={syncing}
          onSync={syncTemplates}
          onSelect={handleSendTemplate}
        />

        {/* AI Insights Sheet (Mobile/Tablet) */}
        <Sheet open={showInsights && !!selectedConversation} onOpenChange={setShowInsights}>
          <SheetContent side="right" className="w-[350px] p-0 xl:hidden">
            {selectedConversation && (
              <WhatsAppAIInsights
                conversationId={selectedConversation.id}
                candidateName={selectedConversation.candidate_name || 'Candidate'}
                insights={mockInsights}
                onClose={() => setShowInsights(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </RoleGate>
    </AppLayout>
  );
}
