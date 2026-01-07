import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Shield, Briefcase, CheckCircle2, AlertTriangle, Eye, Lock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClubSyncPreferences {
  matchThreshold: number;
  excludeCurrentEmployer: boolean;
  notifyBeforeApply: boolean;
  shareFullProfile: boolean;
  allowDossierSharing: boolean;
}

interface EligibleJob {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  location: string;
}

interface ClubSyncConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (preferences: ClubSyncPreferences) => void;
  eligibleJobs?: EligibleJob[];
  currentEmployer?: string;
}

export function ClubSyncConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  eligibleJobs = [],
  currentEmployer,
}: ClubSyncConfirmationDialogProps) {
  const [preferences, setPreferences] = useState<ClubSyncPreferences>({
    matchThreshold: 90,
    excludeCurrentEmployer: true,
    notifyBeforeApply: true,
    shareFullProfile: false,
    allowDossierSharing: true,
  });
  const [step, setStep] = useState<'settings' | 'preview'>('settings');

  const filteredJobs = eligibleJobs.filter(job => 
    job.matchScore >= preferences.matchThreshold &&
    (!preferences.excludeCurrentEmployer || job.company !== currentEmployer)
  );

  const handleConfirm = () => {
    onConfirm(preferences);
    onOpenChange(false);
    setStep('settings');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep('settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Enable Club Sync</DialogTitle>
              <DialogDescription className="mt-1">
                Auto-apply to matching roles on your behalf
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'settings' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 py-4"
          >
            {/* Match Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  Match Threshold
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {preferences.matchThreshold}%+
                </Badge>
              </div>
              <Slider
                value={[preferences.matchThreshold]}
                onValueChange={([value]) => setPreferences(p => ({ ...p, matchThreshold: value }))}
                min={80}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Only auto-apply to roles matching at least this percentage
              </p>
            </div>

            <Separator />

            {/* Privacy Controls */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Privacy Controls
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Exclude current employer</Label>
                    <p className="text-xs text-muted-foreground">
                      {currentEmployer ? `Hide from ${currentEmployer}` : 'Protect from current employer visibility'}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.excludeCurrentEmployer}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, excludeCurrentEmployer: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Notify before applying</Label>
                    <p className="text-xs text-muted-foreground">
                      Get a notification before each auto-apply
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifyBeforeApply}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, notifyBeforeApply: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Share full profile</Label>
                    <p className="text-xs text-muted-foreground">
                      Include salary expectations and references
                    </p>
                  </div>
                  <Switch
                    checked={preferences.shareFullProfile}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, shareFullProfile: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow dossier sharing</Label>
                    <p className="text-xs text-muted-foreground">
                      Strategists can share your profile with partners
                    </p>
                  </div>
                  <Switch
                    checked={preferences.allowDossierSharing}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, allowDossierSharing: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your data is protected. We'll only share what you explicitly consent to. 
                You can revoke Club Sync at any time.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 py-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Eligible Roles Preview</h4>
              <Badge variant="outline" className="gap-1">
                <Eye className="w-3 h-3" />
                {filteredJobs.length} roles
              </Badge>
            </div>

            {filteredJobs.length > 0 ? (
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company} • {job.location}</p>
                      </div>
                      <Badge className={cn(
                        "font-mono",
                        job.matchScore >= 95 ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                      )}>
                        {job.matchScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No roles currently match your criteria
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try lowering your match threshold
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Club Sync runs daily. You'll receive a summary of applications submitted on your behalf.
              </p>
            </div>
          </motion.div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'settings' ? (
            <>
              <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => setStep('preview')} className="w-full sm:w-auto gap-2">
                <Eye className="w-4 h-4" />
                Preview Eligible Roles
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('settings')} className="w-full sm:w-auto">
                Back to Settings
              </Button>
              <Button onClick={handleConfirm} className="w-full sm:w-auto gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Enable Club Sync
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
