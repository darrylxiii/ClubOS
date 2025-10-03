import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, BookOpen, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface StagePreparationProps {
  stage: "applied" | "screening" | "interview" | "offer";
}

const preparationContent = {
  applied: {
    title: "Application Submitted",
    description: "Your application is being reviewed by our team. Here's what happens next:",
    actions: [
      {
        icon: FileText,
        title: "Review Your Profile",
        description: "Ensure your profile is complete and showcases your best work",
        action: "View Profile",
      },
      {
        icon: BookOpen,
        title: "Learn About QC",
        description: "Understand our exclusive approach and what makes us different",
        action: "Read More",
      },
    ],
  },
  screening: {
    title: "Initial Screening Phase",
    description: "Our team is conducting preliminary evaluations. Prepare yourself:",
    actions: [
      {
        icon: FileText,
        title: "Prepare Your Story",
        description: "Craft your professional narrative and key achievements",
        action: "View Guide",
      },
      {
        icon: Video,
        title: "Tech Check",
        description: "Ensure your setup is ready for potential video calls",
        action: "Test Setup",
      },
      {
        icon: BookOpen,
        title: "Research Tips",
        description: "Learn about effective screening strategies",
        action: "Read Tips",
      },
    ],
  },
  interview: {
    title: "Interview Stage",
    description: "Congratulations! You've been selected for an interview. Get ready:",
    actions: [
      {
        icon: Video,
        title: "Interview Prep",
        description: "Review common questions and practice your responses",
        action: "Start Prep",
      },
      {
        icon: BookOpen,
        title: "Company Research",
        description: "Deep dive into the company culture and values",
        action: "Research",
      },
      {
        icon: FileText,
        title: "Questions to Ask",
        description: "Prepare thoughtful questions to ask your interviewer",
        action: "View List",
      },
    ],
  },
  offer: {
    title: "Offer Stage",
    description: "You're at the final stage! Review and negotiate your offer:",
    actions: [
      {
        icon: FileText,
        title: "Review Offer",
        description: "Carefully examine all terms and conditions",
        action: "View Offer",
      },
      {
        icon: BookOpen,
        title: "Negotiation Guide",
        description: "Learn effective strategies for offer negotiation",
        action: "Read Guide",
      },
      {
        icon: CheckCircle2,
        title: "Next Steps",
        description: "Understand what happens after accepting an offer",
        action: "View Process",
      },
    ],
  },
};

export const StagePreparation = ({ stage }: StagePreparationProps) => {
  const content = preparationContent[stage];
  const navigate = useNavigate();

  const handleAction = (actionTitle: string) => {
    // Navigate to Interview Prep page for "Interview Prep" action
    if (actionTitle === "Interview Prep") {
      navigate("/interview-prep");
      return;
    }
    
    toast.success(`Opening ${actionTitle}`, {
      description: "This feature will be available soon.",
    });
  };

  return (
    <Card className="border border-accent/20 bg-gradient-card shadow-glow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          {content.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{content.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {content.actions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-accent/50 transition-all duration-300 group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAction(item.title)}
                  variant="outline"
                  size="sm"
                  className="w-full group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-all"
                >
                  {item.action}
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
