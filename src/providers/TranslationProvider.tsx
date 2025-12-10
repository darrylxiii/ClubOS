import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import i18n, { ALL_NAMESPACES, forceReloadLanguage } from '@/i18n/config';
import { Loader2 } from 'lucide-react';

interface TranslationContextType {
  isReady: boolean;
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  reloadTranslations: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType>({
  isReady: false,
  currentLanguage: 'en',
  changeLanguage: async () => {},
  reloadTranslations: async () => {},
});

export const useTranslationContext = () => useContext(TranslationContext);

interface TranslationProviderProps {
  children: ReactNode;
}

/**
 * TranslationProvider ensures all translations are loaded before rendering children.
 * This prevents flash of untranslated content (FOUTC).
 */
export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const [isReady, setIsReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    const initTranslations = async () => {
      try {
        console.log('[TranslationProvider] Initializing translations...');
        
        // Wait for i18next to initialize
        if (!i18n.isInitialized) {
          await new Promise<void>((resolve) => {
            i18n.on('initialized', () => resolve());
          });
        }

        // Load all namespaces for current language
        const language = i18n.language || 'en';
        console.log(`[TranslationProvider] Loading all namespaces for: ${language}`);
        
        await Promise.all(
          ALL_NAMESPACES.map(ns => 
            i18n.loadNamespaces(ns).catch(err => {
              console.warn(`[TranslationProvider] Failed to load ${ns}:`, err);
            })
          )
        );

        console.log('[TranslationProvider] All translations loaded');
        setCurrentLanguage(language);
        setIsReady(true);
      } catch (error) {
        console.error('[TranslationProvider] Error loading translations:', error);
        // Still set ready to avoid blocking the app
        setIsReady(true);
      }
    };

    initTranslations();

    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      console.log('[TranslationProvider] Language changed to:', lng);
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const changeLanguage = async (lang: string) => {
    try {
      console.log(`[TranslationProvider] Changing language to: ${lang}`);
      await forceReloadLanguage(lang);
      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    } catch (error) {
      console.error('[TranslationProvider] Failed to change language:', error);
    }
  };

  const reloadTranslations = async () => {
    try {
      console.log('[TranslationProvider] Reloading all translations');
      await forceReloadLanguage(currentLanguage);
    } catch (error) {
      console.error('[TranslationProvider] Failed to reload translations:', error);
    }
  };

  // Show loading state while translations load
  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Loading translations...</p>
      </div>
    );
  }

  return (
    <TranslationContext.Provider value={{ isReady, currentLanguage, changeLanguage, reloadTranslations }}>
      {children}
    </TranslationContext.Provider>
  );
};
