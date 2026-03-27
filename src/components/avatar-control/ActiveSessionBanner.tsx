import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useActiveAvatarSession } from '@/hooks/useAvatarSessions';
import { useSessionJobs } from '@/hooks/useSessionJobs';
import { CompanyJobSelector } from '@/components/avatar-control/CompanyJobSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Radio, Clock, X, ArrowRightLeft, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export function ActiveSessionBanner() {
  const { t } = useTranslation('common');
  const { mySession, endSession } = useActiveAvatarSession();
  const { data: sessionJobs = [], switchJob } = useSessionJobs(mySession?.id);
  const [switchOpen, setSwitchOpen] = useState(false);

  if (!mySession) return null;

  const accountLabel = mySession.linkedin_avatar_accounts?.label ?? 'Unknown Account';
  const jobTitle = mySession.jobs?.title ?? 'No job';
  const currentSessionJob = sessionJobs.find(sj => !sj.ended_at);

  const handleSwitchJob = (newJobId: string) => {
    if (!currentSessionJob || !mySession) return;
    switchJob.mutate(
      {
        session_id: mySession.id,
        current_session_job_id: currentSessionJob.id,
        new_job_id: newJobId,
      },
      { onSuccess: () => setSwitchOpen(false) }
    );
  };

  return (
    <>
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 mx-4 mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <Radio className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
          <div className="min-w-0 text-sm flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">{t("active", "Active:")}</span>
            <span className="text-muted-foreground">{accountLabel}</span>
            <span className="text-muted-foreground">·</span>
            <Briefcase className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[200px]">{jobTitle}</span>
            <span className="text-muted-foreground">·</span>
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              until {format(new Date(mySession.expected_end_at), 'HH:mm')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setSwitchOpen(true)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Switch Job
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => endSession.mutate(mySession.id)}
            disabled={endSession.isPending}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            End
          </Button>
        </div>
      </div>

      {/* Switch Job Dialog — Company-first */}
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("switch_job", "Switch Job")}</DialogTitle>
          </DialogHeader>
          <CompanyJobSelector
            selectedJobId={currentSessionJob?.job_id ?? ''}
            onSelect={(id) => handleSwitchJob(id)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
