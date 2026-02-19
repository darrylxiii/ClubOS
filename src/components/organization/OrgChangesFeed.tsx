import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, ArrowUpRight, TrendingUp, Flag, CheckCircle } from "lucide-react";
import type { CompanyPersonChange } from "@/hooks/usePartnerOrgIntelligence";

interface Props {
  changes: CompanyPersonChange[];
}

const CHANGE_CONFIG: Record<string, { icon: typeof UserPlus; label: string; color: string }> = {
  new_hire: { icon: UserPlus, label: 'New Hire', color: 'text-emerald-500' },
  departure: { icon: UserMinus, label: 'Departure', color: 'text-red-500' },
  title_change: { icon: ArrowUpRight, label: 'Title Change', color: 'text-blue-500' },
  promotion: { icon: TrendingUp, label: 'Promotion', color: 'text-accent' },
};

export function OrgChangesFeed({ changes }: Props) {
  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No changes detected yet</h3>
          <p className="text-sm text-muted-foreground">
            Changes will appear here after the next organization rescan.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Weekly summary
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekChanges = changes.filter(c => new Date(c.detected_at) > weekAgo);
  const weekHires = weekChanges.filter(c => c.change_type === 'new_hire').length;
  const weekDepartures = weekChanges.filter(c => c.change_type === 'departure').length;

  return (
    <div className="space-y-4">
      {weekChanges.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">
              This week: {weekHires > 0 && <span className="text-emerald-500">{weekHires} new hire{weekHires !== 1 ? 's' : ''}</span>}
              {weekHires > 0 && weekDepartures > 0 && ', '}
              {weekDepartures > 0 && <span className="text-red-500">{weekDepartures} departure{weekDepartures !== 1 ? 's' : ''}</span>}
              {weekHires === 0 && weekDepartures === 0 && <span className="text-muted-foreground">{weekChanges.length} change{weekChanges.length !== 1 ? 's' : ''}</span>}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {changes.map(change => {
          const config = CHANGE_CONFIG[change.change_type] || CHANGE_CONFIG.title_change;
          const Icon = config.icon;

          return (
            <Card key={change.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`mt-0.5 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(change.detected_at).toLocaleDateString()}
                    </span>
                    {change.is_opportunity && (
                      <Badge className="text-xs bg-accent/10 text-accent border-accent/20 gap-1">
                        <Flag className="w-3 h-3" />
                        Opportunity
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    {change.change_type === 'new_hire' && (
                      <>Joined as <span className="font-medium">{change.new_value || 'Unknown role'}</span></>
                    )}
                    {change.change_type === 'departure' && (
                      <>Left the company{change.old_value && <> (was <span className="font-medium">{change.old_value}</span>)</>}</>
                    )}
                    {change.change_type === 'title_change' && (
                      <>{change.old_value} → <span className="font-medium">{change.new_value}</span></>
                    )}
                    {change.change_type === 'promotion' && (
                      <>Promoted: {change.old_value} → <span className="font-medium">{change.new_value}</span></>
                    )}
                  </p>
                  {change.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{change.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
