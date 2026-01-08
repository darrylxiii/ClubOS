import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare,
  Settings,
  Upload,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Sparkles
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
          {steps.map((step) => {
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
