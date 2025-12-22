import { useAnimatedText } from '@/hooks/useAnimatedText';
import { Display } from '@/components/ui/typography';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  const { t } = useTranslation();
  // Use translated greeting if available
  const translatedGreeting = t('onboarding:welcome.greeting', greeting);
  const fullText = `${translatedGreeting} ${firstName}`;
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
    <Display as="h1" size="sm" className="uppercase tracking-tight text-gradient">
      {animatedText}
      {showCursor && (
        <span className="animate-pulse ml-1">|</span>
      )}
    </Display>
  );
};
