import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";

interface JobCardHeaderProps {
  companyLogo: string | null;
  companyName: string;
  title: string;
  status: string;
  clubSyncBadge: React.ReactNode;
}

export const JobCardHeader = memo(({
  companyLogo,
  companyName,
  title,
  status,
  clubSyncBadge
}: JobCardHeaderProps) => {
  return (
    <div className="flex items-center gap-3 flex-1">
      <Avatar className="h-12 w-12 border-2 border-border/20 shrink-0">
        <AvatarImage src={companyLogo || undefined} alt={companyName} />
        <AvatarFallback className="bg-card/40 text-white font-bold">
          {companyName.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <CardTitle className="text-lg font-black uppercase mb-1 truncate">
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground mb-2 truncate">{companyName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className="border-border/20 text-white bg-card/20"
          >
            {status}
          </Badge>
          {clubSyncBadge}
        </div>
      </div>
    </div>
  );
});

JobCardHeader.displayName = 'JobCardHeader';
