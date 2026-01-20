import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import i18n, { ALL_NAMESPACES, forceReloadLanguage } from '@/i18n/config';

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
 * TranslationProvider loads translations in the background.
 * Children are rendered immediately to avoid blocking app boot.
 * This prevents the boot timeout from triggering on slow connections.
 */
export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const [isReady, setIsReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

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

        // Load all namespaces for current language in background
        const language = i18n.language || 'en';
        console.log(`[TranslationProvider] Loading all namespaces for: ${language}`);
        
        // Load namespaces in parallel, don't block on failures
        await Promise.allSettled(
          ALL_NAMESPACES.map(ns => i18n.loadNamespaces(ns))
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

  // NON-BLOCKING: Render children immediately, translations load in background
  // This prevents the boot timeout from triggering on slow connections
  return (
    <TranslationContext.Provider value={{ isReady, currentLanguage, changeLanguage, reloadTranslations }}>
      {children}
    </TranslationContext.Provider>
  );
};
