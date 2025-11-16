import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook that forces React components to re-render when language changes
 * Ensures all components stay in sync with current language
 */
export const useTranslationSync = () => {
  const { i18n } = useTranslation();
  const [, setLanguage] = useState(i18n.language);
  
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('[TranslationSync] Language changed to:', lng);
      setLanguage(lng);
      
      // Update document attributes
      document.documentElement.lang = lng;
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
      
      // Broadcast to all components via custom event
      window.dispatchEvent(new CustomEvent('languageChange', { detail: lng }));
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    // Set initial state
    handleLanguageChange(i18n.language);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  return { currentLanguage: i18n.language };
};
