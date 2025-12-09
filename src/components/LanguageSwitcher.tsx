import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { changeLanguageWithReload, clearTranslationCache } from '@/i18n/config';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Load user's preferred language on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single();
        
        if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
          // Clear cache and reload with user's preferred language
          await changeLanguageWithReload(profile.preferred_language);
        }
      }
    };
    
    loadUserLanguage();
  }, []);

  // Apply RTL for Arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleChangeLanguage = async (code: string) => {
    if (code === i18n.language || isChanging) return;
    
    setIsChanging(true);
    setIsOpen(false);
    
    const targetLang = languages.find(l => l.code === code);
    const loadingToast = toast.loading(`Switching to ${targetLang?.name}...`);
    
    try {
      // Clear cache for the target language to ensure fresh data
      clearTranslationCache(code);
      
      // Use our new reload function
      const success = await changeLanguageWithReload(code);
      
      if (!success) {
        throw new Error('Language change failed');
      }
      
      // Persist to user profile (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: code })
          .eq('id', user.id);
      }
      
      toast.dismiss(loadingToast);
      toast.success(`Language changed to ${targetLang?.name}`);
      
      // Force page re-render by triggering a state update
      window.dispatchEvent(new Event('languageChange'));
    } catch (error) {
      console.error('[LanguageSwitcher] Error changing language:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to change language. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative z-[60]" 
          disabled={isChanging}
        >
          {isChanging ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Globe className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[100]">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isChanging}
          >
            <div className="flex items-center">
              <span className="mr-2 text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {i18n.language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
