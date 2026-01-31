import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bookmark, Search, Clock, ThumbsUp, Calendar, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MessageTemplate {
  id: string;
  category: 'thanks' | 'scheduling' | 'follow-up' | 'general';
  icon: React.ElementType;
  label: string;
  content: string;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // Thanks & Acknowledgment
  {
    id: 'thanks-update',
    category: 'thanks',
    icon: ThumbsUp,
    label: 'Thank for update',
    content: 'Thanks for the update! I appreciate you keeping me in the loop.',
  },
  {
    id: 'thanks-info',
    category: 'thanks',
    icon: ThumbsUp,
    label: 'Thank for info',
    content: 'Thank you for sharing this information. Very helpful!',
  },
  {
    id: 'got-it',
    category: 'thanks',
    icon: ThumbsUp,
    label: 'Got it',
    content: 'Got it, thanks! Will do.',
  },
  {
    id: 'sounds-good',
    category: 'thanks',
    icon: ThumbsUp,
    label: 'Sounds good',
    content: 'Sounds good! Looking forward to it.',
  },
  // Scheduling
  {
    id: 'available-confirm',
    category: 'scheduling',
    icon: Calendar,
    label: 'Confirm availability',
    content: 'Yes, that time works perfectly for me. I\'ll have it in my calendar.',
  },
  {
    id: 'reschedule-request',
    category: 'scheduling',
    icon: Calendar,
    label: 'Request reschedule',
    content: 'Would it be possible to reschedule? I have a conflict at that time. I\'m flexible on [alternative times].',
  },
  {
    id: 'looking-forward',
    category: 'scheduling',
    icon: Calendar,
    label: 'Looking forward',
    content: 'Looking forward to our conversation! See you then.',
  },
  // Follow-up
  {
    id: 'status-check',
    category: 'follow-up',
    icon: Clock,
    label: 'Check status',
    content: 'Hi! I wanted to follow up on our last conversation. Is there any update on the next steps?',
  },
  {
    id: 'gentle-reminder',
    category: 'follow-up',
    icon: Clock,
    label: 'Gentle reminder',
    content: 'Just a gentle reminder about this. Please let me know if you need any additional information from my side.',
  },
  {
    id: 'follow-up-interview',
    category: 'follow-up',
    icon: Clock,
    label: 'Post-interview',
    content: 'Thank you for taking the time to speak with me today. I really enjoyed learning more about the role and the team.',
  },
  // General
  {
    id: 'need-clarification',
    category: 'general',
    icon: HelpCircle,
    label: 'Ask clarification',
    content: 'Could you please clarify what you mean by this? I want to make sure I understand correctly.',
  },
  {
    id: 'happy-to-help',
    category: 'general',
    icon: HelpCircle,
    label: 'Happy to help',
    content: 'Happy to help! Let me know if you need anything else.',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  thanks: 'Thanks & Acknowledgment',
  scheduling: 'Scheduling',
  'follow-up': 'Follow-up',
  general: 'General',
};

interface MessageTemplatesPanelProps {
  onSelectTemplate: (content: string) => void;
}

export function MessageTemplatesPanel({ onSelectTemplate }: MessageTemplatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTemplates = MESSAGE_TEMPLATES.filter(template =>
    template.label.toLowerCase().includes(search.toLowerCase()) ||
    template.content.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  const handleSelect = (template: MessageTemplate) => {
    onSelectTemplate(template.content);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="Quick replies"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="space-y-1">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className={cn(
                          "w-full flex items-start gap-2 p-2 rounded-md text-left",
                          "hover:bg-accent transition-colors"
                        )}
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {template.label}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.content}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {filteredTemplates.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No templates found
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
