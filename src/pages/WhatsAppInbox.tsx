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
import { MessageSquare, Settings, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify";
import { useRelationshipHealth } from "@/hooks/useRelationshipHealth";
import { type ConversationInsight } from "@/components/whatsapp/WhatsAppAIInsights";
export default function WhatsAppInbox() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<ConversationInsight | null>(null);

  const { conversations, loading: conversationsLoading, markAsRead } = useWhatsAppConversations();
  const { messages, loading: messagesLoading, sending, sendMessage, loadMore, hasMore, loadingMore } = useWhatsAppMessages(selectedConversationId);
  const { templates, loading: templatesLoading, syncing, syncTemplates } = useWhatsAppTemplates();

  const {
    getRelationshipScore,
    generateInsights,
    loading: healthLoading
  } = useRelationshipHealth();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count > 0) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Fetch insights/score when conversation changes
  useEffect(() => {
    const fetchInsights = async () => {
      if (!selectedConversation?.candidate_id) {
        setAiInsights(null);
        return;
      }

      console.log('Fetching relationship score for:', selectedConversation.candidate_id);
      const score = await getRelationshipScore('candidate', selectedConversation.candidate_id);

      if (score) {
        // Map basic score data to insights format
        setAiInsights({
          summary: score.relationship_summary || "No summary available yet.",
          keyTopics: score.key_topics || [],
          sentiment: (score.avg_sentiment || 0) > 0.2 ? 'positive' : (score.avg_sentiment || 0) < -0.2 ? 'negative' : 'neutral',
          sentimentScore: score.avg_sentiment || 0,
          buyingSignals: [], // Not stored in basic table
          objections: score.risk_factors || [],
          actionItems: score.recommended_action ? [{ text: score.recommended_action, priority: 'medium' }] : [],
          nextBestAction: score.recommended_action || "Review recent messages",
          relationshipScore: score.health_score || 0,
          engagementLevel: (score.engagement_score || 0) > 70 ? 'high' : (score.engagement_score || 0) > 40 ? 'medium' : 'low'
        });
      } else {
        setAiInsights(null);
      }
    };

    fetchInsights();
  }, [selectedConversation?.candidate_id, getRelationshipScore]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content, 'text');
  };

  const handleSendTemplate = async (template: any, params: Record<string, string>) => {
    const templateParams = Object.entries(params).map(([key, value]) => ({ [key]: value }));
    await sendMessage('', 'template', template.template_name, templateParams);
    setShowTemplates(false);
    notify.success("Template sent", { description: `Sent: ${template.template_name}` });
  };

  const handleRefreshInsights = async () => {
    if (!selectedConversation?.candidate_id) return;

    notify.loading("Generating AI insights...");
    try {
      const data = await generateInsights('candidate', selectedConversation.candidate_id);
      if (data) {
        // Assuming data is the ConversationInsight object
        setAiInsights(data);
        notify.dismiss();
        notify.success("Insights updated");
      }
    } catch (error) {
      notify.dismiss();
      notify.error("Failed to generate insights");
    }
  };

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
                hasMore={hasMore}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
              />
            </div>

            {/* AI Insights Panel (Desktop) */}
            {showInsights && selectedConversation && (
              <div className="w-[350px] border-l border-border hidden xl:block">
                <WhatsAppAIInsights
                  conversationId={selectedConversation.id}
                  candidateName={selectedConversation.candidate_name || 'Candidate'}
                  insights={aiInsights}
                  loading={healthLoading && !aiInsights}
                  onRefresh={handleRefreshInsights}
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
                insights={aiInsights}
                loading={healthLoading && !aiInsights}
                onRefresh={handleRefreshInsights}
                onClose={() => setShowInsights(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </RoleGate>
    </AppLayout>
  );
}
