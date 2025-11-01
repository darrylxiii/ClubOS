import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Lightbulb, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_data: any;
  type: string;
}

interface AIPageCopilotProps {
  currentPage: string;
  contextData?: any;
  onAction?: (action: string, data: any) => void;
}

export function AIPageCopilot({ currentPage, contextData, onAction }: AIPageCopilotProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadSuggestions();
    }
  }, [isOpen, currentPage, user]);

  const loadSuggestions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load AI suggestions from database
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('shown', false)
        .eq('dismissed', false)
        .order('priority', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Generate context-specific suggestions based on current page
      const contextSuggestions = generateContextSuggestions(currentPage, contextData);
      
      // Map database suggestions to interface format
      const dbSuggestions: Suggestion[] = (data || []).map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        priority: s.priority as 'low' | 'medium' | 'high' | 'urgent',
        action_data: s.action_data,
        type: s.suggestion_type
      }));
      
      setSuggestions([...contextSuggestions, ...dbSuggestions]);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateContextSuggestions = (page: string, context: any): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    switch (page) {
      case '/jobs':
        suggestions.push({
          id: 'jobs-1',
          title: 'Find matching roles',
          description: 'Search for jobs that match your skills and preferences',
          priority: 'high',
          type: 'search_jobs',
          action_data: {}
        });
        break;

      case '/applications':
        suggestions.push({
          id: 'app-1',
          title: 'Prepare for upcoming interviews',
          description: 'Generate interview questions and company research',
          priority: 'urgent',
          type: 'interview_prep',
          action_data: {}
        });
        break;

      case '/unified-tasks':
        suggestions.push({
          id: 'task-1',
          title: 'Optimize your task list',
          description: 'Let AI prioritize and schedule your tasks',
          priority: 'medium',
          type: 'task_optimization',
          action_data: {}
        });
        break;

      case '/messages':
        suggestions.push({
          id: 'msg-1',
          title: 'Draft professional messages',
          description: 'Get AI help writing follow-ups and introductions',
          priority: 'medium',
          type: 'draft_message',
          action_data: {}
        });
        break;
    }

    return suggestions;
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (onAction) {
      onAction(suggestion.type, suggestion.action_data);
    }

    // Mark as acted upon
    if (suggestion.id.startsWith('jobs') || suggestion.id.startsWith('app') || suggestion.id.startsWith('task') || suggestion.id.startsWith('msg')) {
      // Context suggestions - just close
      setIsOpen(false);
      return;
    }

    try {
      await supabase
        .from('ai_suggestions')
        .update({ acted_upon: true, shown: true })
        .eq('id', suggestion.id);
      
      loadSuggestions();
      toast.success('AI suggestion applied');
    } catch (error) {
      console.error('Error updating suggestion:', error);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_suggestions')
        .update({ dismissed: true, shown: true })
        .eq('id', suggestionId);
      
      loadSuggestions();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 rounded-full shadow-2xl h-14 w-14 z-50 bg-gradient-accent hover:scale-110 transition-all duration-300 shadow-glow"
          size="icon"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Context-aware suggestions for {currentPage}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading suggestions...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No suggestions right now. Keep up the great work!
                </p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getPriorityColor(suggestion.priority) as any}>
                      {suggestion.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(suggestion.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {suggestion.description}
                  </p>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    Take Action
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}

          <Card className="bg-muted/50 border-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Need more help?</p>
                  <p className="text-xs text-muted-foreground">
                    Chat with Club AI for personalized assistance and answers to any questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
