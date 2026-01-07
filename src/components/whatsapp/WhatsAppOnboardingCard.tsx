import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { notify } from '@/lib/notify';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  Settings,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Database,
  Loader2
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof MessageSquare;
  status: 'pending' | 'in_progress' | 'completed';
  action?: () => void;
  actionLabel?: string;
}

interface WhatsAppOnboardingCardProps {
  hasAccount: boolean;
  hasTemplates: boolean;
  hasConversations: boolean;
  onNavigate: (tab: string) => void;
}

export function WhatsAppOnboardingCard({
  hasAccount,
  hasTemplates,
  hasConversations,
  onNavigate
}: WhatsAppOnboardingCardProps) {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const isAdmin = currentRole === 'admin';

  const steps: OnboardingStep[] = [
    {
      id: 'connect',
      title: 'Connect WhatsApp Business',
      description: 'Link your WhatsApp Business account to start messaging',
      icon: Settings,
      status: hasAccount ? 'completed' : 'pending',
      action: () => onNavigate('settings'),
      actionLabel: 'Configure'
    },
    {
      id: 'templates',
      title: 'Sync Message Templates',
      description: 'Import pre-approved templates from WhatsApp',
      icon: RefreshCw,
      status: hasTemplates ? 'completed' : hasAccount ? 'pending' : 'pending',
      action: () => onNavigate('settings'),
      actionLabel: 'Sync Templates'
    },
    {
      id: 'conversations',
      title: 'Start Messaging',
      description: 'Import chats or wait for incoming messages',
      icon: MessageSquare,
      status: hasConversations ? 'completed' : 'pending',
      action: () => onNavigate('import'),
      actionLabel: 'Import Chat'
    }
  ];

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  const handleSeedDemoData = async () => {
    if (!user?.id) return;
    
    setSeeding(true);
    try {
      // Create a demo WhatsApp business account
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_business_accounts')
        .insert({
          business_account_id: 'demo_' + Date.now(),
          phone_number_id: 'demo_phone_' + Date.now(),
          display_phone_number: '+31 6 1234 5678',
          verified_name: 'The Quantum Club Demo',
          is_active: true,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Create demo conversations
      const demoConversations = [
        {
          account_id: account.id,
          candidate_phone: '+31612345678',
          candidate_name: 'Emma van der Berg',
          conversation_status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_preview: 'Thanks for reaching out! I am very interested in the Senior Developer role.',
          last_message_direction: 'inbound',
          unread_count: 2,
          is_pinned: true,
          tags: ['interested', 'senior'],
        },
        {
          account_id: account.id,
          candidate_phone: '+31687654321',
          candidate_name: 'Lucas de Jong',
          conversation_status: 'active',
          last_message_at: new Date(Date.now() - 3600000).toISOString(),
          last_message_preview: 'Could you tell me more about the remote work policy?',
          last_message_direction: 'inbound',
          unread_count: 1,
          is_pinned: false,
          tags: ['question'],
        },
        {
          account_id: account.id,
          candidate_phone: '+31698765432',
          candidate_name: 'Sophie Bakker',
          conversation_status: 'active',
          last_message_at: new Date(Date.now() - 7200000).toISOString(),
          last_message_preview: 'Perfect, I will review the offer and get back to you tomorrow.',
          last_message_direction: 'inbound',
          unread_count: 0,
          is_pinned: false,
          tags: ['positive', 'offer'],
        },
      ];

      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert(demoConversations)
        .select();

      if (convError) throw convError;

      // Create demo messages for each conversation
      for (const conv of conversations || []) {
        const demoMessages = [
          {
            account_id: account.id,
            conversation_id: conv.id,
            whatsapp_message_id: 'wamid_demo_' + Date.now() + '_1',
            direction: 'outbound',
            message_type: 'text',
            content: 'Hi! Thank you for your interest in The Quantum Club. We have an exciting Senior Developer opportunity that matches your profile.',
            status: 'read',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            account_id: account.id,
            conversation_id: conv.id,
            whatsapp_message_id: 'wamid_demo_' + Date.now() + '_2',
            direction: 'inbound',
            message_type: 'text',
            content: conv.last_message_preview,
            status: 'received',
            created_at: conv.last_message_at,
          },
        ];

        await supabase.from('whatsapp_messages').insert(demoMessages);
      }

      // Create demo templates
      const demoTemplates = [
        {
          account_id: account.id,
          template_name: 'job_opportunity_intro',
          template_category: 'MARKETING',
          language_code: 'en',
          approval_status: 'APPROVED',
          components: { body: 'Hi, we have an exciting opportunity that matches your profile!' },
        },
        {
          account_id: account.id,
          template_name: 'interview_reminder',
          template_category: 'UTILITY',
          language_code: 'en',
          approval_status: 'APPROVED',
          components: { body: 'Reminder: Your interview is scheduled soon.' },
        },
      ];

      await supabase.from('whatsapp_templates').insert(demoTemplates);

      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-metrics'] });

      notify.success('Demo data created', { description: 'Sample conversations and templates added' });
      
      // Navigate to inbox
      onNavigate('inbox');
      
      // Force page refresh to show new data
      window.location.reload();
    } catch (error: any) {
      console.error('Seed error:', error);
      notify.error('Failed to create demo data', { description: error.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Hero Section */}
      <Card className="border-[#25d366]/20 bg-gradient-to-br from-[#25d366]/5 to-transparent">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25d366] to-[#128c7e] flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to WhatsApp Business Hub</CardTitle>
          <CardDescription className="text-base max-w-lg mx-auto">
            Connect with candidates directly through WhatsApp. Set up your account to get started with enterprise messaging.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Badge variant="outline" className="bg-background">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by QUIN
            </Badge>
            <Badge variant="outline" className="bg-background">
              AI Smart Replies
            </Badge>
            <Badge variant="outline" className="bg-background">
              Template Messaging
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Setup Progress</CardTitle>
              <CardDescription>Complete these steps to start messaging</CardDescription>
            </div>
            <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-sm">
              {completedSteps}/{steps.length} complete
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = step.status === 'completed';
            
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  isComplete 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isComplete ? 'bg-green-500/20' : 'bg-muted'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isComplete ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {!isComplete && step.action && (
                  <Button size="sm" variant="outline" onClick={step.action}>
                    {step.actionLabel}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Admin: Seed Demo Data */}
      {isAdmin && !hasConversations && (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Admin: Seed Demo Data</h3>
                <p className="text-sm text-muted-foreground">
                  Create sample conversations and templates to test the UI without connecting to WhatsApp
                </p>
              </div>
              <Button 
                onClick={handleSeedDemoData} 
                disabled={seeding}
                variant="outline"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Seed Demo Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onNavigate('import')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Import Existing Chats</h3>
              <p className="text-sm text-muted-foreground">Upload WhatsApp exports to sync history</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onNavigate('settings')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold">Configure Integration</h3>
              <p className="text-sm text-muted-foreground">Set up webhooks and API credentials</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
