import { memo } from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  keywords?: string[];
  author?: string;
}

const BASE_TITLE = 'The Quantum Club';
const DEFAULT_DESCRIPTION = 'An invite-only executive members club. Elite career management for high-impact professionals.';
const DEFAULT_OG_IMAGE = 'https://app.thequantumclub.com/og-image.png';
const SITE_URL = 'https://app.thequantumclub.com';

/**
 * SEO Head Component
 * Manages meta tags, canonical URLs, and Open Graph data
 */
export const SEOHead = memo(function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
  keywords,
  author = 'The Quantum Club',
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} OS - Elite Career Management`;
  const fullCanonicalUrl = canonicalUrl ? `${SITE_URL}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {author && <meta name="author" content={author} />}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {fullCanonicalUrl && <meta property="og:url" content={fullCanonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={BASE_TITLE} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
});

export default SEOHead;
