import { Badge } from "@/components/ui/badge";

interface EntityBadgeProps {
  entity: string | null;
  className?: string;
}

const ENTITY_MAP: Record<string, { flag: string; label: string }> = {
  tqc_nl: { flag: '🇳🇱', label: 'NL' },
  tqc_dubai: { flag: '🇦🇪', label: 'Dubai' },
};

export function EntityBadge({ entity, className }: EntityBadgeProps) {
  const info = ENTITY_MAP[entity || 'tqc_nl'] || ENTITY_MAP.tqc_nl;

  return (
    <Badge variant="outline" className={className}>
      <span className="mr-1">{info.flag}</span>
      {info.label}
    </Badge>
  );
}
