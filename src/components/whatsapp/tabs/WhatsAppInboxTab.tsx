import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { WhatsAppConversationList } from '@/components/whatsapp/WhatsAppConversationList';
import { WhatsAppChatThread } from '@/components/whatsapp/WhatsAppChatThread';
import { WhatsAppTemplateSelector } from '@/components/whatsapp/WhatsAppTemplateSelector';
import { WhatsAppAIInsights } from '@/components/whatsapp/WhatsAppAIInsights';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sparkles, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/notify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WhatsAppInboxTab() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    unreadOnly: false,
    needsReply: false,
  });

  const { conversations, loading: conversationsLoading, markAsRead } = useWhatsAppConversations();
  const { messages, loading: messagesLoading, sending, sendMessage } = useWhatsAppMessages(selectedConversationId);
  const { templates, loading: templatesLoading, syncing, syncTemplates } = useWhatsAppTemplates();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = c.candidate_name?.toLowerCase().includes(query);
      const matchesPhone = c.candidate_phone?.includes(query);
      if (!matchesName && !matchesPhone) return false;
    }
    if (filters.unreadOnly && (c.unread_count || 0) === 0) return false;
    if (filters.needsReply && c.last_message_direction !== 'inbound') return false;
    return true;
  });

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unread_count && selectedConversation.unread_count > 0) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, selectedConversation?.unread_count, markAsRead]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content, 'text');
  };

  const handleSendTemplate = async (template: any, params: Record<string, string>) => {
    const templateParams = Object.entries(params).map(([key, value]) => ({ [key]: value }));
    await sendMessage('', 'template', template.template_name, templateParams);
    setShowTemplates(false);
    notify.success('Template sent', { description: `Sent: ${template.template_name}` });
  };

  // Mock insights
  const mockInsights = selectedConversation ? {
    summary: 'Candidate shows strong interest in the Senior Developer role. Has asked detailed questions about tech stack and team culture.',
    keyTopics: ['Tech Stack', 'Remote Work', 'Salary', 'Team Size'],
    sentiment: 'positive' as const,
    sentimentScore: 0.75,
    buyingSignals: ['Asked about start date', 'Mentioned availability', 'Requested job details'],
    objections: ['Concerned about commute time'],
    actionItems: [
      { text: 'Schedule technical interview', priority: 'high' as const },
      { text: 'Send company culture deck', priority: 'medium' as const }
    ],
    nextBestAction: 'Schedule a follow-up call to discuss the role in detail and address the commute concern.',
    relationshipScore: 82,
    engagementLevel: 'high' as const
  } : null;

  return (
    <div className="h-full flex">
      {/* Conversation List */}
      <div className="w-[340px] border-r border-border flex flex-col shrink-0">
        {/* Search & Filters */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  Filters
                  {(filters.unreadOnly || filters.needsReply) && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {[filters.unreadOnly, filters.needsReply].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                  checked={filters.unreadOnly}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, unreadOnly: checked }))}
                >
                  Unread only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.needsReply}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, needsReply: checked }))}
                >
                  Needs reply
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">
              {filteredConversations.length} conversations
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <WhatsAppConversationList
            conversations={filteredConversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            loading={conversationsLoading}
          />
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 min-w-0">
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
        <div className="w-[320px] border-l border-border hidden xl:block shrink-0">
          <WhatsAppAIInsights
            conversationId={selectedConversation.id}
            candidateName={selectedConversation.candidate_name || 'Candidate'}
            insights={mockInsights}
            onClose={() => setShowInsights(false)}
          />
        </div>
      )}

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
    </div>
  );
}
