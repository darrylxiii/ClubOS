import { useAuth } from "@/contexts/AuthContext";
import { useApplications } from "@/hooks/useApplications";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PipelineSnapshot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: applications, isLoading } = useApplications(user?.id, false);

  if (isLoading) {
    return (
      <div className="glass-subtle rounded-2xl p-4">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  const active = applications?.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn' && a.status !== 'closed') || [];

  // Bucket into stages
  const applied = active.filter(a => a.current_stage_index === 0).length;
  const interviewing = active.filter(a => a.current_stage_index > 0 && a.current_stage_index < (a.stages?.length || 5) - 1).length;
  const finalOffer = active.filter(a => {
    const total = a.stages?.length || 5;
    return a.current_stage_index >= total - 1 || a.status === 'hired';
  }).length;

  // Most advanced application
  const topApp = active.sort((a, b) => {
    const aProgress = a.stages?.length ? a.current_stage_index / a.stages.length : 0;
    const bProgress = b.stages?.length ? b.current_stage_index / b.stages.length : 0;
    return bProgress - aProgress;
  })[0];

  if (active.length === 0) {
    return (
      <div className="glass-subtle rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No active applications</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
            Browse roles
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  }

  const stages = [
    { label: "Applied", count: applied, active: applied > 0 },
    { label: "Interview", count: interviewing, active: interviewing > 0 },
    { label: "Final / Offer", count: finalOffer, active: finalOffer > 0 },
  ];

  return (
    <div className="glass-subtle rounded-2xl p-5 space-y-4">
      {/* Stage pills */}
      <div className="flex gap-2">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className={`flex-1 rounded-xl px-3 py-2.5 text-center border transition-colors ${
              stage.active
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-card/30 border-border/20 text-muted-foreground'
            }`}
          >
            <div className="text-lg font-bold leading-none">{stage.count}</div>
            <div className="text-[11px] mt-1 tracking-wide">{stage.label}</div>
          </div>
        ))}
      </div>

      {/* Most advanced + CTA */}
      <div className="flex items-center justify-between">
        {topApp && (
          <p className="text-xs text-muted-foreground truncate flex-1 mr-4">
            <span className="text-foreground font-medium">{topApp.job?.companies?.name || topApp.company_name}</span>
            {" · "}
            {topApp.stages?.[topApp.current_stage_index]?.title || "In progress"}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs shrink-0"
          onClick={() => navigate('/applications')}
        >
          View pipeline
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
