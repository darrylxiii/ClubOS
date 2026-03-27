import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, Mail, Linkedin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VisibilitySettings {
  show_candidate_names: boolean;
  show_candidate_emails: boolean;
  show_candidate_linkedin: boolean;
  show_salary_data: boolean;
  show_match_scores: boolean;
  show_ai_summary: boolean;
  show_contact_info: boolean;
}

interface SharedCandidateCardProps {
  application: {
    id: string;
    full_name: string;
    current_title?: string;
    current_company?: string;
    email?: string;
    linkedin_url?: string;
    match_score?: number;
    ai_summary?: string;
    applied_at?: string;
  };
  visibility: VisibilitySettings;
}

export function SharedCandidateCard({ application, visibility }: SharedCandidateCardProps) {
  const { t } = useTranslation('common');
  const displayName = visibility.show_candidate_names
    ? application.full_name
    : 'Candidate';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const matchScore = application.match_score;

  const scoreColor =
    matchScore && matchScore >= 80
      ? 'text-emerald-500'
      : matchScore && matchScore >= 60
      ? 'text-amber-500'
      : 'text-muted-foreground';

  return (
    <div className="group rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 hover:border-border/60 hover:bg-card/80 transition-all duration-200 space-y-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 border border-border/30">
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{displayName}</p>

          {(application.current_title || application.current_company) && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              {application.current_title && (
                <>
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">{application.current_title}</span>
                </>
              )}
              {application.current_company && (
                <>
                  <span className="text-border">·</span>
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{application.current_company}</span>
                </>
              )}
            </div>
          )}
        </div>

        {visibility.show_match_scores && matchScore !== undefined && (
          <div className={cn('flex items-center gap-1 shrink-0', scoreColor)}>
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-bold">{matchScore}%</span>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {visibility.show_ai_summary && application.ai_summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 border-l-2 border-primary/20 pl-2">
          {application.ai_summary}
        </p>
      )}

      {/* Contact row */}
      {(visibility.show_candidate_emails || visibility.show_candidate_linkedin) && (
        <div className="flex items-center gap-3 pt-1">
          {visibility.show_candidate_emails && application.email && (
            <a
              href={`mailto:${application.email}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[140px]">{application.email}</span>
            </a>
          )}
          {visibility.show_candidate_linkedin && application.linkedin_url && (
            <a
              href={application.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="w-3 h-3" />
              <span>{t("linkedin", "LinkedIn")}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
