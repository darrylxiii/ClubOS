import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Linkedin, MessageSquare } from "lucide-react";
import { getInitials } from "@/lib/format";

interface Interviewer {
  id: string;
  name: string;
  title: string;
  department: string;
  avatar_url?: string;
  linkedin_url?: string;
  bio?: string;
  talkingPoints: string[];
}

interface MeetYourInterviewersProps {
  interviewers: Interviewer[];
}

export function MeetYourInterviewers({ interviewers }: MeetYourInterviewersProps) {
  if (interviewers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Meet Your Interviewers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {interviewers.map((interviewer) => (
            <div
              key={interviewer.id}
              className="p-4 rounded-lg border bg-muted/30 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-background">
                  <AvatarImage src={interviewer.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(interviewer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate">{interviewer.name}</h4>
                    {interviewer.linkedin_url && (
                      <a
                        href={interviewer.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{interviewer.title}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {interviewer.department}
                  </Badge>
                </div>
              </div>

              {interviewer.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {interviewer.bio}
                </p>
              )}

              {interviewer.talkingPoints.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Suggested Topics
                  </p>
                  <ul className="space-y-1">
                    {interviewer.talkingPoints.slice(0, 3).map((point, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
