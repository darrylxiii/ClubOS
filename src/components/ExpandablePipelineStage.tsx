import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, User, Calendar, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface PipelineStageData {
  id: string;
  title: string;
  status: "upcoming" | "current" | "completed";
  description?: string;
  preparation?: {
    title: string;
    content: string;
    resources?: { title: string; url: string }[];
  };
  interviewers?: {
    name: string;
    title: string;
    photo?: string;
    bio?: string;
    linkedin?: string;
  }[];
  scheduledDate?: string;
  duration?: string;
  location?: string;
  meetingType?: "video" | "phone" | "in-person";
  notes?: string;
}

interface ExpandablePipelineStageProps {
  stage: PipelineStageData;
  isLast?: boolean;
}

export const ExpandablePipelineStage = ({
  stage,
  isLast = false,
}: ExpandablePipelineStageProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isCompleted = stage.status === "completed";
  const isActive = stage.status === "current";
  const hasDetails = stage.description || stage.preparation || stage.interviewers || stage.scheduledDate;

  return (
    <div className="flex items-start flex-1">
      <div className="flex flex-col items-center">
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <div className="flex flex-col items-center">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 p-0 hover:scale-110 relative",
                  isCompleted
                    ? "bg-success border-success text-success-foreground hover:bg-success/90 shadow-glow"
                    : isActive
                    ? "bg-accent border-accent text-accent-foreground scale-110 shadow-glow hover:bg-accent/90"
                    : "bg-card border-border text-muted-foreground hover:border-accent/50"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">
                    {isActive ? "●" : "○"}
                  </span>
                )}
                {hasDetails && (
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 absolute -bottom-1 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                )}
              </Button>
            </CollapsibleTrigger>
            <p
              className={cn(
                "mt-2 text-xs font-medium text-center max-w-[80px]",
                isActive ? "text-accent font-bold" : "text-muted-foreground"
              )}
            >
              {stage.title}
            </p>
          </div>

          {hasDetails && (
            <CollapsibleContent className="mt-4 w-full min-w-[300px]">
              <Card className="border-accent/20 bg-gradient-card">
                <CardContent className="p-4 space-y-4">
                  {stage.description && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">About This Stage</h4>
                      <p className="text-xs text-muted-foreground">{stage.description}</p>
                    </div>
                  )}

                  {stage.scheduledDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-accent mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Scheduled</p>
                        <p className="text-xs text-muted-foreground">{stage.scheduledDate}</p>
                        {stage.duration && (
                          <p className="text-xs text-muted-foreground">Duration: {stage.duration}</p>
                        )}
                        {stage.meetingType && (
                          <div className="flex items-center gap-1 mt-1">
                            {stage.meetingType === "video" && <Video className="w-3 h-3" />}
                            <span className="text-xs capitalize">{stage.meetingType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {stage.interviewers && stage.interviewers.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Who You'll Meet
                      </h4>
                      <div className="space-y-3">
                        {stage.interviewers.map((interviewer, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={interviewer.photo} alt={interviewer.name} />
                              <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{interviewer.name}</p>
                              <p className="text-xs text-muted-foreground">{interviewer.title}</p>
                              {interviewer.bio && (
                                <p className="text-xs text-muted-foreground mt-1">{interviewer.bio}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage.preparation && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {stage.preparation.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">{stage.preparation.content}</p>
                      {stage.preparation.resources && stage.preparation.resources.length > 0 && (
                        <div className="space-y-1">
                          {stage.preparation.resources.map((resource, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs"
                              asChild
                            >
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                {resource.title}
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {stage.notes && (
                    <div className="p-2 rounded bg-secondary/30 border border-border">
                      <p className="text-xs text-muted-foreground italic">{stage.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
      {!isLast && (
        <div
          className={cn(
            "flex-1 h-0.5 mx-2 mt-6 transition-all duration-300",
            isCompleted ? "bg-gradient-accent" : "bg-border"
          )}
        />
      )}
    </div>
  );
};
