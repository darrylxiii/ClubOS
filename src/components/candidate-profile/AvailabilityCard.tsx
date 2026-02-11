import { motion } from 'framer-motion';
import { Clock, MapPin, Building2, Globe2, Languages, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { candidateProfileTokens } from '@/config/candidate-profile-tokens';
import { cn } from '@/lib/utils';

interface AvailabilityCardProps {
  candidate: Record<string, any>;
  className?: string;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize break-words">{String(value)}</p>
      </div>
    </div>
  );
}

export function AvailabilityCard({ candidate, className }: AvailabilityCardProps) {
  const {
    notice_period,
    available_hours_per_week,
    industry_preference,
    company_size_preference,
    remote_work_aspiration,
    preferred_language,
    desired_locations,
  } = candidate;

  const locations = Array.isArray(desired_locations) ? desired_locations.filter(Boolean) : [];

  const hasData =
    notice_period ||
    available_hours_per_week != null ||
    industry_preference ||
    company_size_preference ||
    remote_work_aspiration ||
    preferred_language ||
    locations.length > 0;

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...candidateProfileTokens.animations.smooth, delay: 0.15 }}
      className={cn(
        candidateProfileTokens.glass.card,
        'rounded-xl p-4 sm:p-5',
        candidateProfileTokens.shadows.sm,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Availability & Preferences</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <InfoRow icon={Clock} label="Notice Period" value={notice_period} />
        <InfoRow icon={Briefcase} label="Hours/Week" value={available_hours_per_week} />
        <InfoRow icon={Building2} label="Industry" value={industry_preference} />
        <InfoRow icon={Building2} label="Company Size" value={company_size_preference} />
        <InfoRow icon={Globe2} label="Remote Aspiration" value={remote_work_aspiration} />
        <InfoRow icon={Languages} label="Preferred Language" value={preferred_language} />
      </div>

      {locations.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Desired Locations</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {locations.map((loc: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {loc}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
