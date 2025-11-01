import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Briefcase, CheckCircle2, MessageSquare, Calendar, Target } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  prompt: string;
  category: string;
}

interface AIQuickActionsProps {
  context: 'jobs' | 'applications' | 'tasks' | 'messages' | 'general';
  contextData?: any;
  onActionClick: (prompt: string) => void;
}

export function AIQuickActions({ context, contextData, onActionClick }: AIQuickActionsProps) {
  const getActionsForContext = (): QuickAction[] => {
    switch (context) {
      case 'jobs':
        return [
          {
            id: 'search-roles',
            label: 'Find matching roles',
            icon: Briefcase,
            prompt: 'Search for jobs that match my skills and show me the top 5 with match scores',
            category: 'Job Search'
          },
          {
            id: 'analyze-fit',
            label: 'Analyze job fit',
            icon: Target,
            prompt: contextData?.jobId 
              ? `Analyze how well job ${contextData.jobId} matches my profile`
              : 'Help me analyze if a specific job is a good fit for me',
            category: 'Analysis'
          },
          {
            id: 'generate-cover',
            label: 'Generate cover letter',
            icon: MessageSquare,
            prompt: contextData?.jobId
              ? `Generate a professional cover letter for job ${contextData.jobId}`
              : 'Help me write a cover letter for a job',
            category: 'Application'
          }
        ];

      case 'applications':
        return [
          {
            id: 'interview-prep',
            label: 'Prepare for interview',
            icon: CheckCircle2,
            prompt: contextData?.applicationId
              ? `Create an interview briefing for application ${contextData.applicationId}`
              : 'Help me prepare for an upcoming interview',
            category: 'Interview Prep'
          },
          {
            id: 'company-research',
            label: 'Research company',
            icon: Briefcase,
            prompt: contextData?.companyName
              ? `Research ${contextData.companyName} and give me key insights for my interview`
              : 'Help me research a company before my interview',
            category: 'Research'
          },
          {
            id: 'follow-up',
            label: 'Draft follow-up',
            icon: MessageSquare,
            prompt: 'Draft a professional follow-up message for my recent application',
            category: 'Communication'
          }
        ];

      case 'tasks':
        return [
          {
            id: 'suggest-task',
            label: 'What should I do next?',
            icon: Target,
            prompt: 'Analyze my tasks and suggest what I should work on next',
            category: 'Prioritization'
          },
          {
            id: 'break-down-goal',
            label: 'Break down goal',
            icon: CheckCircle2,
            prompt: 'Help me break down a complex goal into actionable tasks',
            category: 'Planning'
          },
          {
            id: 'analyze-workload',
            label: 'Analyze workload',
            icon: Sparkles,
            prompt: 'Analyze my current task load and give me recommendations',
            category: 'Analysis'
          }
        ];

      case 'messages':
        return [
          {
            id: 'draft-message',
            label: 'Draft message',
            icon: MessageSquare,
            prompt: 'Help me draft a professional message',
            category: 'Communication'
          },
          {
            id: 'follow-up-reminder',
            label: 'Schedule follow-up',
            icon: Calendar,
            prompt: 'Help me schedule a follow-up for this conversation',
            category: 'Planning'
          },
          {
            id: 'conversation-analysis',
            label: 'Analyze sentiment',
            icon: Sparkles,
            prompt: contextData?.conversationId
              ? `Analyze the sentiment of conversation ${contextData.conversationId}`
              : 'Analyze the tone of a conversation',
            category: 'Analysis'
          }
        ];

      default:
        return [
          {
            id: 'career-advice',
            label: 'Career advice',
            icon: Target,
            prompt: 'Give me personalized career advice based on my profile',
            category: 'Career'
          },
          {
            id: 'optimize-profile',
            label: 'Optimize profile',
            icon: Sparkles,
            prompt: 'Analyze my profile and suggest improvements',
            category: 'Profile'
          },
          {
            id: 'next-steps',
            label: "What's next?",
            icon: CheckCircle2,
            prompt: 'Based on my current situation, what should I focus on next?',
            category: 'Planning'
          }
        ];
    }
  };

  const actions = getActionsForContext();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Quick AI Actions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-3 hover:bg-primary/10 hover:border-primary/50 transition-all group"
                onClick={() => onActionClick(action.prompt)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium flex-1 text-left">
                    {action.label}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] self-start">
                  {action.category}
                </Badge>
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Or chat with AI for custom help
        </p>
      </CardContent>
    </Card>
  );
}
