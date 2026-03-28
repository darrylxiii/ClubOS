import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Mapping of our support languages to their valid ISO 639-1 / ISO 3166-1 alpha-2 format
const SUPPORTED_HREFLANGS: Record<string, string> = {
  en: 'en',     // English
  nl: 'nl-NL',  // Dutch (Netherlands)
  de: 'de-DE',  // German
  fr: 'fr-FR',  // French
  es: 'es-ES',  // Spanish
  ru: 'ru-RU',  // Russian
  it: 'it-IT',  // Italian
  pt: 'pt-PT',  // Portuguese
  zh: 'zh-CN',  // Mandarin (Simplified)
  ar: 'ar-AE',  // Arabic
};

/**
 * SEOHelmet component automatically manages global `hreflang` tags for the application
 * based on the current active React Router location.
 */
export const SEOHelmet = () => {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  // Determine the canonical base URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://os.thequantumclub.com';

  const canonicalUrl = `${baseUrl}${pathname}`;

  return (
    <Helmet>
      <html lang={i18n.language} dir={i18n.dir()} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Generate hreflang tags for all supported markets to tell Google we have alternatives */}
      {Object.entries(SUPPORTED_HREFLANGS).map(([langKey, hrefLangCode]) => {
        // We use query params ?lang= for language overrides typically 
        // Or if we relied on subdirectories we'd alter the pathname here.
        // For a global SPA, this tells Google the alternate versions exist.
        const url = new URL(canonicalUrl);
        url.searchParams.set('lng', langKey);
        
        return (
          <link 
            key={langKey}
            rel="alternate" 
            hrefLang={hrefLangCode} 
            href={url.toString()} 
          />
        );
      })}
      
      {/* Fallback default */}
      <link 
        rel="alternate" 
        hrefLang="x-default" 
        href={canonicalUrl} 
      />
    </Helmet>
  );
};
