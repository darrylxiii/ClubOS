import { useAnimatedText } from '@/hooks/useAnimatedText';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  const { t } = useTranslation('common');
  // Detect if greeting is a raw key (contains dots or colons - not a real greeting)
  const isRawKey = greeting.includes('.') || greeting.includes(':');

  // Use bundled fallback if greeting looks like a raw key
  const safeGreeting = useMemo(() => {
    if (isRawKey) {
      const hour = new Date().getHours();
      if (hour < 12) return t('greeting.morning', 'Good morning');
      if (hour < 18) return t('greeting.afternoon', 'Good afternoon');
      return t('greeting.evening', 'Good evening');
    }
    return greeting;
  }, [greeting, isRawKey, t]);
  
  const fullText = `${safeGreeting} ${firstName}`;
  const animatedText = useAnimatedText(fullText, "");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (animatedText === fullText) {
      setShowCursor(false);
    } else {
      setShowCursor(true);
    }
  }, [animatedText, fullText]);

  return (
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
      {animatedText}
      {showCursor && (
        <span className="animate-pulse ml-1">|</span>
      )}
    </h1>
  );
};
