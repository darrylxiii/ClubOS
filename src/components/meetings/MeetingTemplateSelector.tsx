import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileText } from "lucide-react";

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  category: "technical" | "culture" | "panel" | "executive" | "general";
  questions: string[];
  scoringRubric?: { criterion: string; weight: number }[];
}

const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: "technical-screen",
    name: "Technical Screening",
    description: "Initial technical assessment with coding challenges",
    duration: 60,
    category: "technical",
    questions: [
      "Walk me through your most challenging technical project",
      "How do you approach debugging complex issues?",
      "Describe your experience with [relevant technology]",
      "Live coding exercise: [problem description]",
    ],
    scoringRubric: [
      { criterion: "Technical Knowledge", weight: 40 },
      { criterion: "Problem Solving", weight: 30 },
      { criterion: "Code Quality", weight: 20 },
      { criterion: "Communication", weight: 10 },
    ],
  },
  {
    id: "culture-fit",
    name: "Culture Fit Interview",
    description: "Assess alignment with company values and team dynamics",
    duration: 45,
    category: "culture",
    questions: [
      "Tell me about a time you disagreed with a colleague",
      "How do you handle feedback?",
      "What motivates you in your work?",
      "Describe your ideal work environment",
    ],
    scoringRubric: [
      { criterion: "Values Alignment", weight: 35 },
      { criterion: "Team Collaboration", weight: 30 },
      { criterion: "Growth Mindset", weight: 20 },
      { criterion: "Communication Style", weight: 15 },
    ],
  },
  {
    id: "panel-interview",
    name: "Panel Interview",
    description: "Multi-stakeholder assessment with cross-functional team",
    duration: 90,
    category: "panel",
    questions: [
      "Present a case study from your previous work",
      "How would you approach [role-specific scenario]?",
      "Questions from each panel member",
      "Candidate Q&A with the team",
    ],
    scoringRubric: [
      { criterion: "Presentation Skills", weight: 25 },
      { criterion: "Domain Expertise", weight: 30 },
      { criterion: "Cross-functional Fit", weight: 25 },
      { criterion: "Leadership Potential", weight: 20 },
    ],
  },
  {
    id: "executive-interview",
    name: "Executive Interview",
    description: "Senior leadership assessment for strategic alignment",
    duration: 60,
    category: "executive",
    questions: [
      "Share your vision for this role",
      "How would you build and lead your team?",
      "Discuss a strategic initiative you've driven",
      "What's your 90-day plan?",
    ],
    scoringRubric: [
      { criterion: "Strategic Thinking", weight: 35 },
      { criterion: "Leadership Experience", weight: 30 },
      { criterion: "Executive Presence", weight: 20 },
      { criterion: "Cultural Add", weight: 15 },
    ],
  },
  {
    id: "general",
    name: "General Meeting",
    description: "Flexible format for various meeting types",
    duration: 30,
    category: "general",
    questions: [],
  },
];

interface MeetingTemplateSelectorProps {
  value?: string;
  onSelect: (template: MeetingTemplate | null) => void;
}

export function MeetingTemplateSelector({ value, onSelect }: MeetingTemplateSelectorProps) {
  const selectedTemplate = MEETING_TEMPLATES.find((t) => t.id === value);

  const getCategoryColor = (category: MeetingTemplate["category"]) => {
    const colors: Record<string, string> = {
      technical: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      culture: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      panel: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      executive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      general: "bg-muted text-muted-foreground",
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-3">
      <Select
        value={value}
        onValueChange={(v) => {
          const template = MEETING_TEMPLATES.find((t) => t.id === v);
          onSelect(template || null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a meeting template (optional)" />
        </SelectTrigger>
        <SelectContent>
          {MEETING_TEMPLATES.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span>{template.name}</span>
                <Badge variant="outline" className={`text-xs ${getCategoryColor(template.category)}`}>
                  {template.category}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTemplate && selectedTemplate.id !== "general" && (
        <div className="p-3 rounded-lg border bg-muted/50 space-y-2">
          <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {selectedTemplate.duration} min
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-4 w-4" />
              {selectedTemplate.questions.length} questions
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { MEETING_TEMPLATES };
