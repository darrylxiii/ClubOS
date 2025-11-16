import { useAnimatedText } from '@/hooks/useAnimatedText';
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
    <h1 className="text-2xl font-black uppercase tracking-tight">
      {animatedText}
      {showCursor && (
        <span className="animate-pulse">|</span>
      )}
    </h1>
  );
};
