import { Badge } from "@/components/ui/badge";
import { Database, Sparkles, Edit } from "lucide-react";

interface EnrichmentBadgeProps {
  source: 'database' | 'clearbit' | 'manual';
  className?: string;
}

export function EnrichmentBadge({ source, className = "" }: EnrichmentBadgeProps) {
  const config = {
    database: {
      icon: Database,
      label: "From Repository",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    clearbit: {
      icon: Sparkles,
      label: "Auto-enriched",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    manual: {
      icon: Edit,
      label: "Manual Entry",
      className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    },
  };

  const { icon: Icon, label, className: badgeClassName } = config[source];

  return (
    <Badge variant="outline" className={`${badgeClassName} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
