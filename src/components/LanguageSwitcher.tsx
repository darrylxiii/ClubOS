import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
      toast.error("Failed to change language. Please try again.");
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
          className="relative overflow-hidden group z-[60] rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all outline-none" 
          disabled={isChanging}
        >
          <AnimatePresence mode="wait">
            {isChanging ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="relative z-10"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="globe"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: isOpen ? 180 : 0 }}
                whileHover={{ rotate: 90, scale: 1.1 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                className="relative z-10"
              >
                <Globe className="h-4 w-4 text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md pointer-events-none" />
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
