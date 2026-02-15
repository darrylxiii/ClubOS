import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Briefcase, ArrowUp, Minus } from "lucide-react";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";

interface CareerTrajectoryTimelineProps {
  candidate: any;
}

const SENIORITY_LEVELS: Record<string, number> = {
  intern: 1, trainee: 1,
  junior: 2, associate: 2,
  mid: 3, intermediate: 3,
  senior: 4, 'sr.': 4,
  lead: 5, staff: 5,
  principal: 6, architect: 6,
  head: 7, manager: 7,
  director: 8,
  vp: 9, 'vice president': 9,
  'c-level': 10, cto: 10, ceo: 10, coo: 10, cfo: 10,
};

function detectSeniority(title: string): { level: number; label: string } {
  const lower = title.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_LEVELS).sort((a, b) => b[1] - a[1])) {
    if (lower.includes(keyword)) {
      return { level, label: keyword.charAt(0).toUpperCase() + keyword.slice(1) };
    }
  }
  return { level: 3, label: 'Mid' }; // default
}

function formatDuration(months: number | undefined): string {
  if (!months) return '';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}mo`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}mo`;
}

export function CareerTrajectoryTimeline({ candidate }: CareerTrajectoryTimelineProps) {
  const workHistory = Array.isArray(candidate.work_history) ? candidate.work_history : [];

  if (workHistory.length === 0) return null;

  // Parse entries
  const entries = workHistory
    .map((entry: any) => {
      const title = entry.title || entry.job_title || entry.role || '';
      const company = entry.company || entry.company_name || entry.organization || '';
      const startDate = entry.start_date || entry.from;
      const endDate = entry.end_date || entry.to;
      const isCurrent = entry.is_current || entry.current || !endDate;
      const duration = entry.duration_months || entry.months;

      const seniority = detectSeniority(title);

      return { title, company, startDate, endDate, isCurrent, duration, seniority };
    })
    .filter((e: any) => e.title || e.company)
    .slice(0, 8); // limit display

  if (entries.length === 0) return null;

  // Detect overall trajectory
  const first = entries[entries.length - 1];
  const last = entries[0];
  const trajectory = last.seniority.level - first.seniority.level;
  const trajectoryLabel = trajectory > 1 ? 'Strong upward' : trajectory > 0 ? 'Upward' : trajectory === 0 ? 'Lateral' : 'Mixed';

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Career Trajectory
          <Badge
            variant="outline"
            className={`text-[10px] ml-auto font-normal ${
              trajectory > 0
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {trajectory > 0 ? <ArrowUp className="w-2.5 h-2.5 mr-0.5 inline" /> : <Minus className="w-2.5 h-2.5 mr-0.5 inline" />}
            {trajectoryLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {entries.map((entry, i) => {
              const prevEntry = i < entries.length - 1 ? entries[i + 1] : null;
              const levelChange = prevEntry ? entry.seniority.level - prevEntry.seniority.level : 0;

              return (
                <div key={i} className="relative pl-8">
                  {/* Dot */}
                  <div
                    className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      entry.isCurrent
                        ? 'bg-primary border-primary'
                        : 'bg-background border-muted-foreground/40'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {entry.title}
                        {entry.isCurrent && (
                          <Badge variant="outline" className="text-[9px] ml-1.5 font-normal align-middle">
                            Current
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                        {entry.company}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {entry.duration && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDuration(entry.duration)}
                        </span>
                      )}
                      {levelChange > 0 && (
                        <ArrowUp className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          {entries.length} role{entries.length !== 1 ? 's' : ''} tracked
          {candidate.years_of_experience && ` · ${candidate.years_of_experience} years total experience`}
        </div>
      </CardContent>
    </Card>
  );
}
