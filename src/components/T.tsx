import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

interface TProps {
  /** Translation key in format "namespace:path.to.key" */
  k: string;
  /** Fallback text if translation missing */
  fallback?: string;
  /** Variables for interpolation */
  values?: Record<string, string | number>;
  /** Custom component to wrap the text */
  as?: keyof JSX.IntrinsicElements;
  /** Additional props for the wrapper element */
  [key: string]: any;
}

/**
 * Translation wrapper component for easy i18n integration
 * 
 * @example
 * <T k="common:actions.save" fallback="Save" />
 * <T k="common:time.daysAgo" values={{ count: 5 }} fallback="5 days ago" />
 * <T k="common:welcome" as="h1" className="text-xl" fallback="Welcome" />
 */
export const T = ({ k, fallback, values, as: Component = 'span', ...props }: TProps) => {
  const { t, i18n } = useTranslation();
  
  // Extract namespace and key
  const [namespace, ...keyParts] = k.split(':');
  const key = keyParts.join(':');
  
  if (!namespace || !key) {
    logger.warn('Invalid translation key format', { componentName: 'T', key: k, expected: 'namespace:key' });
    return <Component {...props}>{fallback || k}</Component>;
  }
  
  const translated = t(k, { ...values, defaultValue: fallback || key });
  
  // In development, show visual indicator when translation is missing
  if (process.env.NODE_ENV === 'development' && translated === k) {
    logger.warn('Missing translation', { componentName: 'T', key: k, language: i18n.language });
    return (
      <Component {...props} title={`Missing: ${k}`} style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}>
        {fallback || key}
      </Component>
    );
  }
  
  return <Component {...props}>{translated}</Component>;
};
