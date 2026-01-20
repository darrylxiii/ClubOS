import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeamActivity } from "@/hooks/useTeamActivity";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamActivityCardProps {
  jobId: string;
}

export const TeamActivityCard = ({ jobId }: TeamActivityCardProps) => {
  const { teamMembers, loading } = useTeamActivity(jobId);
  const navigate = useNavigate();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-black uppercase text-sm">Team Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const memberCount = teamMembers.length;
  const memberText = memberCount === 1 ? "team member working" : "team members collaborating";

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-black uppercase text-sm">Team Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {memberCount === 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <Avatar key={i} className="border-2 border-background opacity-40">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    ?
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">No team activity yet</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <div className="flex -space-x-2">
                {teamMembers.map((member) => (
                  <Tooltip key={member.user_id}>
                    <TooltipTrigger asChild>
                      <Avatar
                        className="border-2 border-background cursor-pointer transition-transform hover:scale-110 hover:z-10"
                        onClick={() => navigate(`/profile/${member.user_id}`)}
                      >
                        {member.profiles.avatar_url ? (
                          <AvatarImage src={member.profiles.avatar_url} alt={member.profiles.full_name || "User"} />
                        ) : null}
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {getInitials(member.profiles.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{member.profiles.full_name || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {formatDistanceToNow(new Date(member.last_activity), { addSuffix: true })}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">
              {memberCount} {memberText}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
