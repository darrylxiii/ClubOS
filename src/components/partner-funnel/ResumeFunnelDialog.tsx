import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

interface SavedFunnelData {
    formData: any;
    currentStep: number;
    timestamp: string;
    sessionId: string;
    completed: boolean;
    expiresAt: string;
}

interface ResumeFunnelDialogProps {
    open: boolean;
    savedData: SavedFunnelData | null;
    totalSteps: number;
    onContinue: () => void;
    onStartFresh: () => void;
}

export function ResumeFunnelDialog({
    open,
    savedData,
    totalSteps,
    onContinue,
    onStartFresh
}: ResumeFunnelDialogProps) {
  const { t } = useTranslation('common');
    if (!savedData) return null;

    const progressPercentage = Math.round(((savedData.currentStep + 1) / totalSteps) * 100);

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="glass max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Welcome back
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                        <p>
                            You are <span className="font-semibold text-primary">{progressPercentage}%</span> through
                            your brief. Your progress is automatically saved.
                        </p>

                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span>Saved {formatRelativeTime(savedData.timestamp)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span>Step {savedData.currentStep + 1} of {totalSteps}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-primary" />
                                <span>{t("less_than_a_minute", "Less than a minute to finish")}</span>
                            </div>
                        </div>

                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={onStartFresh} className="flex-1">
                        Start Fresh
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onContinue} className="flex-1" autoFocus>
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
