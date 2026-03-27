import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Coins, Loader2, Pause, Play, Scan, Users } from "lucide-react";
import type { ScanEstimate, ScanJob } from "@/hooks/usePartnerOrgIntelligence";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string;
  activeScanJob: ScanJob | null;
  scanning: boolean;
  getEstimate: () => Promise<ScanEstimate | null>;
  onStartScan: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function ScanProgressDialog({
  open,
  onOpenChange,
  companyName,
  activeScanJob,
  scanning,
  getEstimate,
  onStartScan,
  onPause,
  onResume,
}: Props) {
  const { t } = useTranslation('common');
  const [estimate, setEstimate] = useState<ScanEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  useEffect(() => {
    if (open && !scanning && !activeScanJob) {
      setLoadingEstimate(true);
      getEstimate().then(est => {
        setEstimate(est);
        setLoadingEstimate(false);
      });
    }
  }, [open, scanning, activeScanJob, getEstimate]);

  const progress = activeScanJob
    ? activeScanJob.total_employees_found > 0
      ? Math.round((activeScanJob.profiles_enriched / activeScanJob.total_employees_found) * 100)
      : 0
    : 0;

  const handleStart = () => {
    onStartScan();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            {scanning ? 'Scan in Progress' : 'Organization Scan'}
          </DialogTitle>
          <DialogDescription>
            {companyName && `Scanning ${companyName}'s LinkedIn organization.`}
          </DialogDescription>
        </DialogHeader>

        {/* Scanning view */}
        {scanning && activeScanJob ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("profiles_enriched", "Profiles enriched")}</span>
                <span className="font-mono">
                  {activeScanJob.profiles_enriched} / {activeScanJob.total_employees_found}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{activeScanJob.status}</Badge>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{activeScanJob.credits_used || 0} credits used</span>
              </div>
              {activeScanJob.profiles_failed > 0 && (
                <div className="col-span-2 text-xs text-red-500">
                  {activeScanJob.profiles_failed} profiles failed
                </div>
              )}
            </div>
          </div>
        ) : loadingEstimate ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : estimate ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{estimate.headcount} employees detected</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-muted-foreground" />
                <span>~{estimate.totalEstimate} credits</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Employee listing: ~{estimate.listingCredits} credits</p>
              <p>Profile enrichment: ~{estimate.enrichmentCredits} credits</p>
              <p>Monthly spend so far: {estimate.monthlySpendSoFar} credits</p>
            </div>

            {estimate.warning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{estimate.warning}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Unable to get estimate. The company may not have a valid LinkedIn URL.
          </div>
        )}

        <DialogFooter>
          {scanning && activeScanJob ? (
            <div className="flex gap-2 w-full">
              {activeScanJob.status === 'paused' ? (
                <Button onClick={onResume} className="flex-1 gap-2">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              ) : (
                <Button variant="outline" onClick={onPause} className="flex-1 gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={!estimate || estimate.headcount === 0}
                className="flex-1 gap-2"
              >
                <Scan className="w-4 h-4" />
                Start Scan
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
