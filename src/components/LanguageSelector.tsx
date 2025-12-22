import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Eye, EyeOff, Globe } from 'lucide-react';
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Language Switcher & Translation Debugger
 * - Always visible: Language Switcher (EN/NL)
 * - Admin only: Debug options (Show/Hide Missing)
 */
export const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const { data: coverage } = useTranslationCoverage();
    const { user } = useAuth(); // Need to check role here if possible, or just user existence for now
    const [showMissing, setShowMissing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Check if admin (this is a basic check, enhance with useRole if needed)
    const isAdmin = user?.email?.includes('darryl') || user?.user_metadata?.role === 'admin';

    // Listen for trigger event from QuickAccessHub (keep legacy debug trigger)
    useEffect(() => {
        const handler = () => {
            localStorage.removeItem('show-translation-debugger');
            setIsVisible(true);
        };
        window.addEventListener('show-translation-debugger', handler);
        return () => window.removeEventListener('show-translation-debugger', handler);
    }, []);

    useEffect(() => {
        if (showMissing) {
            document.body.classList.add('translation-debug-mode');
        } else {
            document.body.classList.remove('translation-debug-mode');
        }
    }, [showMissing]);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
            {/* 1. Debug Panel (Admin Only & Visible) */}
            {isAdmin && isVisible && (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[250px] mb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Languages className="h-4 w-4" />
                            <span className="text-sm font-medium">Translation Debug</span>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setIsVisible(false)}
                        >
                            <EyeOff className="h-3 w-3" />
                        </Button>
                    </div>

                    <div className="space-y-1 text-xs">
                        {coverage && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Missing:</span>
                                    <Badge variant={coverage.missingKeys.length > 0 ? 'destructive' : 'default'}>
                                        {coverage.missingKeys.length}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Overall:</span>
                                    <Badge variant="outline">{coverage.overallCompletion}%</Badge>
                                </div>
                            </>
                        )}
                    </div>

                    <Button
                        size="sm"
                        variant={showMissing ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => setShowMissing(!showMissing)}
                    >
                        {showMissing ? <EyeOff className="h-3 w-3 mr-2" /> : <Eye className="h-3 w-3 mr-2" />}
                        {showMissing ? 'Hide' : 'Show'} Missing
                    </Button>
                </div>
            )}

            {/* 2. Public Language Switcher (Always Visible) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-md bg-background/80 backdrop-blur-sm">
                        <Globe className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changeLanguage('en')}>
                        English
                        {i18n.language === 'en' && <span className="ml-2">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('nl')}>
                        Nederlands
                        {i18n.language === 'nl' && <span className="ml-2">✓</span>}
                    </DropdownMenuItem>
                    {isAdmin && (
                        <DropdownMenuItem onClick={() => setIsVisible(!isVisible)} className="text-xs text-muted-foreground border-t mt-1 pt-1">
                            {isVisible ? 'Hide Debugger' : 'Show Debugger'}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
