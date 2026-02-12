import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ModuleFlag } from '@/hooks/useModuleFlags';

interface ModuleCardProps {
  module: ModuleFlag;
  onToggle: (id: string, enabled: boolean) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Communication: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Meetings: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Analytics: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Admin Tools': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Engagement: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function ModuleCard({ module, onToggle }: ModuleCardProps) {
  const [showRoutes, setShowRoutes] = useState(false);
  const category = module.metadata?.category ?? 'Other';
  const routes = module.metadata?.affected_routes ?? [];
  const queriesPerHour = module.metadata?.polling_queries_per_hour ?? 0;
  const descriptionLong = module.metadata?.description_long ?? module.description;

  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-border/50 transition-all ${!module.enabled ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{module.name}</h3>
              <Badge variant="outline" className={CATEGORY_COLORS[category] ?? ''}>
                {category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{descriptionLong}</p>
          </div>
          <Switch
            checked={module.enabled}
            onCheckedChange={(checked) => onToggle(module.id, checked)}
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {queriesPerHour.toLocaleString()} queries/hr
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(module.updated_at), { addSuffix: true })}
          </span>
          {routes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowRoutes(!showRoutes)}
            >
              {routes.length} route{routes.length !== 1 ? 's' : ''}
              {showRoutes ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>

        {showRoutes && routes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {routes.map((route) => (
              <code key={route} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                {route}
              </code>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
