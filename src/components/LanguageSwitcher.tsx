import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [isChanging, setIsChanging] = useState(false);
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
          await i18n.changeLanguage(profile.preferred_language);
        }
      }
    };
    
    loadUserLanguage();
  }, [i18n]);

  // Apply RTL for Arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const changeLanguage = async (code: string) => {
    if (code === i18n.language) return; // Already on this language
    
    setIsChanging(true);
    const loadingToast = toast.loading(`Switching to ${languages.find(l => l.code === code)?.name}...`);
    
    try {
      // Change language first
      await i18n.changeLanguage(code);
      
      // Force all components to re-render with new translations
      queryClient.invalidateQueries();
      
      // Persist to user profile (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: code })
          .eq('id', user.id);
        
        if (error) {
          console.error('[LanguageSwitcher] Failed to save language preference:', error);
        }
      }
      
      // Broadcast language change event to all components
      window.dispatchEvent(new CustomEvent('languageChange', { detail: code }));
      
      toast.dismiss(loadingToast);
      toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
    } catch (error) {
      console.error('[LanguageSwitcher] Error changing language:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to change language');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" disabled={isChanging}>
          {isChanging ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
          <Globe className="h-5 w-5" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2 text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
