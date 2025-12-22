import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PageLoader = () => {
    const [showError, setShowError] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const countdownIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        // Show error after 8 seconds (increased from 5s based on recent comprehensive testing)
        const errorTimer = setTimeout(() => {
            setShowError(true);
        }, 8000);

        return () => clearTimeout(errorTimer);
    }, []);

    useEffect(() => {
        // Countdown for reload button
        if (showError) {
            countdownIntervalRef.current = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
            };
        }
    }, [showError]);

    if (showError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="text-center space-y-6 max-w-md glass-card p-8">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Page Taking Too Long
                        </h1>
                        <p className="text-muted-foreground mb-4">
                            The application is loading slowly. This might be due to network issues or server problems.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full"
                            size="lg"
                        >
                            Reload Page {countdown > 0 && `(${countdown}s)`}
                        </Button>
                        <Button
                            onClick={() => window.location.href = '/auth'}
                            variant="ghost"
                            className="w-full"
                        >
                            Go to Login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse font-medium tracking-wider text-xs uppercase">Loading Quantum OS...</p>
        </div>
    );
};
