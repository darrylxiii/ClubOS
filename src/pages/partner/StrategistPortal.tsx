import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { motion } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Calendar,
  Sparkles,
  Mail,
  UserCircle,
} from 'lucide-react';
import { useStrategistChannel } from '@/hooks/useStrategistChannel';
import { StrategistActivityFeed } from '@/components/partner/strategist/StrategistActivityFeed';
import { SharedNotesPanel } from '@/components/partner/strategist/SharedNotesPanel';
import { AvailabilityCalendar } from '@/components/partner/strategist/AvailabilityCalendar';
import { AskStrategistDialog } from '@/components/partner/strategist/AskStrategistDialog';

export default function StrategistPortal() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const { strategist, activities, notes, isLoading } = useStrategistChannel(companyId);
  const [askOpen, setAskOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Profile skeleton */}
        <div className="rounded-xl bg-card/30 backdrop-blur border border-border/20 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no strategist assigned
  if (!strategist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-full bg-primary/10"
        >
          <UserCircle className="h-12 w-12 text-primary" />
        </motion.div>
        <h2 className="text-lg font-semibold">
          {t('strategist.noStrategist', 'No Strategist Assigned')}
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {t(
            'strategist.noStrategistDesc',
            'A dedicated talent strategist will be assigned to your account to help you find the perfect candidates. Post a role to get started.'
          )}
        </p>
        <Button asChild>
          <a href="/company-jobs/new">
            <Sparkles className="h-4 w-4 mr-2" />
            {t('strategist.postRole', 'Post a Role')}
          </a>
        </Button>
      </div>
    );
  }

  const initials = (strategist.full_name || 'TS')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Strategist profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl bg-card/30 backdrop-blur border border-border/20 p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={strategist.avatar_url || undefined} alt={strategist.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold truncate">{strategist.full_name}</h2>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {t('strategist.badge', 'Strategist')}
              </Badge>
            </div>
            {strategist.title && (
              <p className="text-sm text-muted-foreground">{strategist.title}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{strategist.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setAskOpen(true)}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              {t('strategist.ask', 'Ask')}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="/meetings">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                {t('strategist.bookCall', 'Book Call')}
              </a>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-xl bg-card/30 backdrop-blur border border-border/20 p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('strategist.activityFeed', 'Strategist Activity')}
            </h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {activities.length} {t('strategist.actions', 'actions')}
            </Badge>
          </div>
          <StrategistActivityFeed activities={activities} />
        </motion.div>

        {/* Right: Notes + Calendar */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <SharedNotesPanel notes={notes} companyId={companyId} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <AvailabilityCalendar
              strategistId={strategist.id}
              strategistName={strategist.full_name}
            />
          </motion.div>
        </div>
      </div>

      {/* Ask strategist dialog */}
      <AskStrategistDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        strategist={strategist}
      />
    </div>
  );
}
