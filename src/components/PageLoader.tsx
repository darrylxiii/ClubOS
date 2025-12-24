import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cache reset utility - also available from index.html inline script
const resetCache = async () => {
    try {
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
        // Clear all caches
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        // Clear PWA storage
        ['pwa-update-dismissed', 'pwa-install-dismissed', 'sb-auth-token'].forEach(k => {
            try { localStorage.removeItem(k); } catch {}
        });
        console.log('[PageLoader] Cache cleared. Reloading...');
    } catch (e) {
        console.error('[PageLoader] Failed to clear cache:', e);
    }
    // Force hard reload with cache bust
    window.location.href = window.location.href.split('?')[0] + '?cache_bust=' + Date.now();
};

export const PageLoader = () => {
    const [showError, setShowError] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Show error after 5 seconds (reduced from 8s for faster recovery)
        timeoutRef.current = window.setTimeout(() => {
            setShowError(true);
        }, 5000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleResetCache = async () => {
        setIsResetting(true);
        await resetCache();
    };

    if (showError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
                <div className="text-center space-y-6 max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
                    <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground mb-2">
                            Unable to Load Application
                        </h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            The app didn't start properly. This is usually caused by a cached version conflict.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <Button
                            onClick={handleResetCache}
                            disabled={isResetting}
                            className="w-full gap-2"
                            size="lg"
                        >
                            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                            {isResetting ? 'Clearing Cache...' : 'Reset Cache & Reload'}
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="w-full"
                        >
                            Try Again
                        </Button>
                        <Button
                            onClick={() => window.location.href = '/auth'}
                            variant="ghost"
                            className="w-full gap-2 text-muted-foreground"
                        >
                            <LogIn className="w-4 h-4" />
                            Go to Login
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        If the problem persists, try opening in an incognito window
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse font-medium tracking-wider text-xs uppercase">
                Loading Quantum OS...
            </p>
        </div>
    );
};
