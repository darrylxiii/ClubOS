import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import i18n, { CORE_NAMESPACES, forceReloadLanguage, preloadNamespacesForRoute } from '@/i18n/config';

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
 * Only core namespaces are loaded initially; route-specific namespaces load on demand.
 * 
 * NOTE: This provider must wrap BrowserRouter, so it cannot use useLocation().
 * Route-based namespace preloading is handled by RouteNamespaceLoader inside the Router.
 */
export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const [isReady, setIsReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  // Initialize core namespaces on mount
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

        // Load only core namespaces for current language (faster initial load)
        const language = i18n.language || 'en';
        console.log(`[TranslationProvider] Loading core namespaces for: ${language}`);
        
        // Load only core namespaces, don't block on failures
        await Promise.allSettled(
          CORE_NAMESPACES.map(ns => i18n.loadNamespaces(ns))
        );

        console.log('[TranslationProvider] Core translations loaded');
        setCurrentLanguage(language);
        setIsReady(true);

        // Preload route-specific namespaces in background (using window.location for initial load)
        preloadNamespacesForRoute(window.location.pathname);
      } catch (_error) {
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
    } catch (_error) {
      console.error('[TranslationProvider] Failed to change language:', error);
    }
  };

  const reloadTranslations = async () => {
    try {
      console.log('[TranslationProvider] Reloading all translations');
      await forceReloadLanguage(currentLanguage);
    } catch (_error) {
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
