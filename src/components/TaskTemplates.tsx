import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: Array<{
    title: string;
    task_type: string;
    priority: string;
    estimated_duration_minutes: number;
    description: string;
    order: number;
  }>;
  totalDuration: number;
}

const templates: TaskTemplate[] = [
  {
    id: 'interview-prep-complete',
    name: 'Complete Interview Preparation',
    description: 'Full preparation package for technical interviews',
    icon: '🎯',
    totalDuration: 480,
    tasks: [
      {
        title: 'Research company culture and values',
        task_type: 'research',
        priority: 'high',
        estimated_duration_minutes: 60,
        description: 'Deep dive into company mission, values, recent news, and employee reviews',
        order: 1,
      },
      {
        title: 'Review job description and requirements',
        task_type: 'interview_prep',
        priority: 'high',
        estimated_duration_minutes: 30,
        description: 'Identify key skills and requirements, prepare examples for each',
        order: 2,
      },
      {
        title: 'Prepare STAR stories (5-7 examples)',
        task_type: 'interview_prep',
        priority: 'high',
        estimated_duration_minutes: 90,
        description: 'Situation, Task, Action, Result stories covering leadership, problem-solving, conflict, etc.',
        order: 3,
      },
      {
        title: 'Technical skills review',
        task_type: 'skill_development',
        priority: 'high',
        estimated_duration_minutes: 120,
        description: 'Review technical concepts, algorithms, system design patterns relevant to role',
        order: 4,
      },
      {
        title: 'Prepare questions for interviewer',
        task_type: 'interview_prep',
        priority: 'medium',
        estimated_duration_minutes: 30,
        description: 'Prepare 5-10 thoughtful questions about role, team, company strategy',
        order: 5,
      },
      {
        title: 'Mock interview practice',
        task_type: 'interview_prep',
        priority: 'high',
        estimated_duration_minutes: 60,
        description: 'Practice with friend or use online platform for realistic practice',
        order: 6,
      },
      {
        title: 'Outfit and logistics preparation',
        task_type: 'interview_prep',
        priority: 'medium',
        estimated_duration_minutes: 30,
        description: 'Choose outfit, test video setup, plan route/timing, gather materials',
        order: 7,
      },
      {
        title: 'Final review and mental preparation',
        task_type: 'interview_prep',
        priority: 'medium',
        estimated_duration_minutes: 60,
        description: 'Quick review of notes, breathing exercises, positive visualization',
        order: 8,
      },
    ],
  },
  {
    id: 'job-application-workflow',
    name: 'Job Application Workflow',
    description: 'Complete process from application to follow-up',
    icon: '📄',
    totalDuration: 180,
    tasks: [
      {
        title: 'Tailor resume for role',
        task_type: 'application',
        priority: 'high',
        estimated_duration_minutes: 45,
        description: 'Customize resume highlighting relevant experience and keywords from job description',
        order: 1,
      },
      {
        title: 'Write custom cover letter',
        task_type: 'application',
        priority: 'high',
        estimated_duration_minutes: 60,
        description: 'Compelling cover letter addressing specific role requirements and company fit',
        order: 2,
      },
      {
        title: 'Complete application',
        task_type: 'application',
        priority: 'high',
        estimated_duration_minutes: 30,
        description: 'Fill out application form, upload documents, submit application',
        order: 3,
      },
      {
        title: 'Find referral connection',
        task_type: 'networking',
        priority: 'medium',
        estimated_duration_minutes: 30,
        description: 'Search LinkedIn for connections at company, request introduction',
        order: 4,
      },
      {
        title: 'Follow-up email (1 week later)',
        task_type: 'follow_up',
        priority: 'medium',
        estimated_duration_minutes: 15,
        description: 'Professional follow-up expressing continued interest',
        order: 5,
      },
    ],
  },
  {
    id: 'networking-follow-up',
    name: 'Networking Follow-up System',
    description: 'Build and maintain professional relationships',
    icon: '🤝',
    totalDuration: 120,
    tasks: [
      {
        title: 'Send thank you note',
        task_type: 'follow_up',
        priority: 'high',
        estimated_duration_minutes: 15,
        description: 'Personalized thank you within 24 hours of networking event/meeting',
        order: 1,
      },
      {
        title: 'LinkedIn connection request',
        task_type: 'networking',
        priority: 'high',
        estimated_duration_minutes: 10,
        description: 'Connect on LinkedIn with personalized message',
        order: 2,
      },
      {
        title: 'Share relevant article/resource',
        task_type: 'networking',
        priority: 'medium',
        estimated_duration_minutes: 20,
        description: 'Follow up with valuable content related to discussion',
        order: 3,
      },
      {
        title: '30-day check-in',
        task_type: 'follow_up',
        priority: 'medium',
        estimated_duration_minutes: 15,
        description: 'Casual check-in email, update on progress',
        order: 4,
      },
      {
        title: '60-day value-add touchpoint',
        task_type: 'networking',
        priority: 'low',
        estimated_duration_minutes: 30,
        description: 'Share achievement, offer help, or make introduction',
        order: 5,
      },
      {
        title: 'Quarterly relationship maintenance',
        task_type: 'networking',
        priority: 'low',
        estimated_duration_minutes: 30,
        description: 'Regular touchpoint to keep relationship warm',
        order: 6,
      },
    ],
  },
  {
    id: 'weekly-job-search',
    name: 'Weekly Job Search Routine',
    description: 'Consistent weekly activities for active job search',
    icon: '📅',
    totalDuration: 420,
    tasks: [
      {
        title: 'Search and save 10-15 relevant jobs',
        task_type: 'research',
        priority: 'high',
        estimated_duration_minutes: 60,
        description: 'Browse job boards, save positions that match criteria',
        order: 1,
      },
      {
        title: 'Apply to 3-5 positions',
        task_type: 'application',
        priority: 'high',
        estimated_duration_minutes: 180,
        description: 'Customize and submit applications for top choices',
        order: 2,
      },
      {
        title: 'Reach out to 5 new connections',
        task_type: 'networking',
        priority: 'medium',
        estimated_duration_minutes: 60,
        description: 'Expand network with professionals in target companies/roles',
        order: 3,
      },
      {
        title: 'Follow up on pending applications',
        task_type: 'follow_up',
        priority: 'medium',
        estimated_duration_minutes: 30,
        description: 'Check status and send follow-up emails where appropriate',
        order: 4,
      },
      {
        title: 'Update skills/complete learning module',
        task_type: 'skill_development',
        priority: 'medium',
        estimated_duration_minutes: 90,
        description: 'Work on certification, course, or skill gap',
        order: 5,
      },
    ],
  },
];

export const TaskTemplates = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApplyTemplate = async (template: TaskTemplate) => {
    if (!user) return;

    setLoading(template.id);
    try {
      const tasksToInsert = template.tasks.map(task => ({
        user_id: user.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        estimated_duration_minutes: task.estimated_duration_minutes,
        status: 'pending',
        metadata: {
          from_template: template.id,
          template_name: template.name,
          order: task.order,
        }
      }));

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success(
        `${template.tasks.length} tasks created from "${template.name}"! AI will schedule them automatically.`,
        { duration: 4000 }
      );
    } catch (error: unknown) {
      console.error('Error applying template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tasks from template');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Templates
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Task Templates</DialogTitle>
          <DialogDescription>
            Pre-built workflows based on Motion.ai best practices. Apply a template to instantly create a complete task sequence.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {template.tasks.length} tasks
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(template.totalDuration / 60)}h {template.totalDuration % 60}m
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  <div className="space-y-2">
                    {template.tasks.slice(0, 3).map((task, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground shrink-0">{task.order}.</span>
                        <span className="text-muted-foreground">{task.title}</span>
                      </div>
                    ))}
                    {template.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-4">
                        +{template.tasks.length - 3} more tasks...
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleApplyTemplate(template)}
                    disabled={loading === template.id}
                  >
                    {loading === template.id ? 'Creating...' : 'Apply Template'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};