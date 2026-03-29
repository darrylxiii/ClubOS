import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Eye, EyeOff, Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { useRole } from '@/contexts/RoleContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Language Switcher & Translation Debugger
 * - Always visible: Language Switcher (EN/NL)
 * - Admin only (server-backed role): Debug options
 */
// Define all 10 supported regional languages
const SUPPORTED_LANGUAGES = [
    { code: 'en', native: 'English', region: 'Global' },
    { code: 'es', native: 'Español', region: 'Global' },
    { code: 'fr', native: 'Français', region: 'Global' },
    { code: 'de', native: 'Deutsch', region: 'DACH' },
    { code: 'nl', native: 'Nederlands', region: 'Benelux' },
    { code: 'it', native: 'Italiano', region: 'Italy' },
    { code: 'pt', native: 'Português', region: 'Global' },
    { code: 'ru', native: 'Русский', region: 'CIS' },
    { code: 'ar', native: 'العربية', region: 'MENA' },
    { code: 'zh', native: '中文', region: 'APAC' },
];

export const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const { data: coverage } = useTranslationCoverage();
    const [showMissing, setShowMissing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();
    const isAuthRoute = location.pathname.startsWith('/auth');

    // Server-backed admin check via RoleContext (user_roles table)
    let isAdmin = false;
    try {
        const { currentRole } = useRole();
        isAdmin = currentRole === 'admin';
    } catch {
        // useRole throws if outside RoleProvider (e.g. public routes) — not admin
        isAdmin = false;
    }

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
                    <button 
                        className={`group flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            isAuthRoute 
                                ? 'bg-black/40 backdrop-blur-2xl border border-white/10 text-white/70 hover:bg-black/60 hover:text-white hover:border-white/20 shadow-xl' 
                                : 'bg-background/60 backdrop-blur-xl border border-border/50 text-foreground/70 hover:bg-background/80 hover:text-foreground/90 shadow-lg'
                        }`}
                        aria-label="Change language"
                    >
                        <Globe className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-12" />
                        <span className="hidden sm:inline font-semibold tracking-wide">{i18n.language.toUpperCase()}</span>
                    </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                    align="end" 
                    sideOffset={12}
                    className={`min-w-[340px] p-2 overflow-hidden overflow-y-auto max-h-[60vh] sm:max-h-none border rounded-2xl ${
                        isAuthRoute 
                            ? 'bg-black/80 backdrop-blur-3xl border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]' 
                            : 'bg-background/95 backdrop-blur-2xl border-border/50 shadow-2xl'
                    }`}
                >
                    <div className="grid grid-cols-2 gap-1.5 p-1 relative z-10">
                        {SUPPORTED_LANGUAGES.map((lang) => {
                            const isActive = i18n.language.startsWith(lang.code);
                            return (
                                <DropdownMenuItem 
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    className={`relative flex items-center gap-3 p-3 rounded-xl cursor-default transition-all duration-300 ease-out outline-none overflow-hidden group/item
                                        ${isActive 
                                            ? isAuthRoute ? 'bg-white/10 text-white' : 'bg-primary/5 text-primary' 
                                            : isAuthRoute ? 'text-white/60 hover:bg-white/5 data-[highlighted]:bg-white/5 hover:text-white data-[highlighted]:text-white' : 'text-foreground/70 hover:bg-foreground/5 data-[highlighted]:bg-foreground/5 hover:text-foreground data-[highlighted]:text-foreground'
                                        }
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-inset
                                    `}
                                >
                                    {/* Abstract Indicator Orb */}
                                    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${
                                            isActive
                                                ? isAuthRoute ? 'bg-white scale-100 shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'bg-primary scale-100 shadow-[0_0_12px_hsl(var(--primary))]'
                                                : isAuthRoute ? 'bg-white/20 scale-50 group-hover/item:scale-75 group-data-[highlighted]/item:scale-75 group-hover/item:bg-white/40 group-data-[highlighted]/item:bg-white/40' : 'bg-foreground/20 scale-50 group-hover/item:scale-75 group-data-[highlighted]/item:scale-75 group-hover/item:bg-foreground/40 group-data-[highlighted]/item:bg-foreground/40'
                                        }`} />
                                        {/* Inner detail dot for inactive states to make it look mechanical/premium */}
                                        {!isActive && (
                                            <div className={`w-1 h-1 rounded-full ${isAuthRoute ? 'bg-black/50' : 'bg-background'} relative z-10 transition-opacity duration-300 opacity-50 group-hover/item:opacity-100 group-data-[highlighted]/item:opacity-100`} />
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                        <span className={`text-[13px] font-medium tracking-wide leading-none truncate w-full ${isActive ? 'font-semibold' : ''}`}>
                                            {lang.native}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-wider leading-none truncate w-full ${isActive ? (isAuthRoute ? 'text-white/70' : 'text-primary/70') : (isAuthRoute ? 'text-white/40' : 'text-muted-foreground')}`}>
                                            {lang.region}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                    
                    {isAdmin && (
                        <div className={`mt-2 pt-2 border-t px-1 ${isAuthRoute ? 'border-white/10' : 'border-border/50'}`}>
                            <DropdownMenuItem 
                                onClick={() => setIsVisible(!isVisible)} 
                                className={`flex items-center justify-center py-2 text-xs font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                                    isAuthRoute ? 'text-white/40 hover:text-white/90 data-[highlighted]:text-white/90 hover:bg-white/10 data-[highlighted]:bg-white/10' : 'text-muted-foreground hover:text-foreground data-[highlighted]:text-foreground hover:bg-foreground/5 data-[highlighted]:bg-foreground/5'
                                }`}
                            >
                                {isVisible ? 'Close Translation Debugger' : 'Open Translation Debugger'}
                            </DropdownMenuItem>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
