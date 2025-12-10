import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Eye, EyeOff } from 'lucide-react';
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';

/**
 * Development-only translation debugger
 * Shows current language, missing translations, and allows highlighting untranslated strings
 * Only visible when NODE_ENV === 'development'
 */
export const TranslationDebugger = () => {
  const { i18n } = useTranslation();
  const { data: coverage } = useTranslationCoverage();
  const [showMissing, setShowMissing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const currentLangData = coverage?.byLanguage[i18n.language];
  const missingCount = coverage?.missingKeys.filter(k => k.missingIn?.includes(i18n.language)).length || 0;
  
  // Listen for trigger event from QuickAccessHub
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
      // Add highlight to missing translations
      document.body.classList.add('translation-debug-mode');
    } else {
      document.body.classList.remove('translation-debug-mode');
    }
  }, [showMissing]);
  
  if (!isVisible) {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setIsVisible(true)}
      >
        <Languages className="h-4 w-4" />
      </Button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[250px]">
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
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Language:</span>
          <Badge variant="outline">{i18n.language.toUpperCase()}</Badge>
        </div>
        
        {currentLangData && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Coverage:</span>
            <Badge variant={currentLangData.percentage === 100 ? 'default' : 'secondary'}>
              {currentLangData.percentage}%
            </Badge>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Missing:</span>
          <Badge variant={missingCount > 0 ? 'destructive' : 'default'}>
            {missingCount}
          </Badge>
        </div>
        
        {coverage && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Overall:</span>
            <Badge variant="outline">{coverage.overallCompletion}%</Badge>
          </div>
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
  );
};
