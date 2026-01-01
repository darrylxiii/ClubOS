import { Badge } from "@/components/ui/badge";
import { CheckCircle, Ban, Archive } from "lucide-react";

interface CompanyStatusBadgeProps {
  isActive: boolean;
  isArchived: boolean;
}

export function CompanyStatusBadge({ isActive, isArchived }: CompanyStatusBadgeProps) {
  if (isArchived) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground border-muted">
        <Archive className="h-3 w-3" /> Archived
      </Badge>
    );
  }

  if (!isActive) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" /> Suspended
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
      <CheckCircle className="h-3 w-3" /> Active
    </Badge>
  );
}
