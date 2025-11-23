import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, TrendingUp } from "lucide-react";

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
    if (!savedData) return null;

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRelativeTime = (isoString: string) => {
        const timestamp = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const progressPercentage = Math.round(((savedData.currentStep + 1) / totalSteps) * 100);

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2">
                        👋 Welcome Back!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 pt-4">
                        <p className="text-base">
                            You have an incomplete partnership request saved.
                        </p>

                        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{formatDate(savedData.timestamp)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{getRelativeTime(savedData.timestamp)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                    Step {savedData.currentStep + 1} of {totalSteps} ({progressPercentage}% complete)
                                </span>
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
                    <AlertDialogCancel onClick={onStartFresh} className="sm:flex-1">
                        Start Fresh
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onContinue}
                        className="sm:flex-1 bg-primary hover:bg-primary/90"
                        autoFocus
                    >
                        Continue Where I Left Off
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
