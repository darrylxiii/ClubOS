import { ReactNode, memo, useEffect } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TracingProvider } from "@/lib/tracing/TracingProvider";
import { TranslationProvider, useTranslationContext } from "@/providers/TranslationProvider";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CommandProvider } from "@/contexts/CommandContext";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import { LanguageSelector } from "@/components/LanguageSelector";
import i18n, { preloadNamespacesForRoute } from "@/i18n/config";
import { initSentry } from "@/lib/sentry";
import { HelmetProvider } from "react-helmet-async";

// Initialize Sentry first
initSentry();

// Initialize QueryClient
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60000,
            gcTime: 300000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
        },
    },
});

// Configure Persistence (LocalStorage)
const persister = createSyncStoragePersister({
    storage: window.localStorage,
});

// Optimized: Memoized component with scoped invalidation to prevent full app re-renders
const LanguageSync = memo(() => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            // Scoped invalidation: Only invalidate i18n-dependent queries
            queryClient.invalidateQueries({
                predicate: (query) => {
                    return query.queryKey.some((key) =>
                        typeof key === 'string' && (key.includes('translation') || key.includes('content'))
                    );
                }
            });

            document.documentElement.lang = lng;
            document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
        };

        i18n.on('languageChanged', handleLanguageChange);
        handleLanguageChange(i18n.language);

        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [queryClient]);

    return null;
});

// Route-based namespace preloader - must be inside BrowserRouter
const RouteNamespaceLoader = memo(() => {
    const location = useLocation();
    const { isReady } = useTranslationContext();

    useEffect(() => {
        if (isReady) {
            preloadNamespacesForRoute(location.pathname);
        }
    }, [location.pathname, isReady]);

    return null;
});

// Only enable tracing in development
const isTracingEnabled = import.meta.env.DEV;

interface AppProvidersProps {
    children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <SentryErrorBoundary>
            <HelmetProvider>
                <TracingProvider enabled={isTracingEnabled}>
                    <PersistQueryClientProvider
                        client={queryClient}
                        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hours
                    >
                        <TranslationProvider>
                            <BrowserRouter>
                                <AuthProvider>
                                    <PostHogProvider>
                                        <CommandProvider>
                                            <Toaster />
                                            <Sonner />
                                            <LanguageSync />
                                            <RouteNamespaceLoader />
                                            <LanguageSelector />
                                            {children}
                                        </CommandProvider>
                                    </PostHogProvider>
                                </AuthProvider>
                            </BrowserRouter>
                        </TranslationProvider>
                    </PersistQueryClientProvider>
                </TracingProvider>
            </HelmetProvider>
        </SentryErrorBoundary>
    );
};
