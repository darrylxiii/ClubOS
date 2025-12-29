import { useAnimatedText } from '@/hooks/useAnimatedText';
import { Display } from '@/components/ui/typography';
import { useState, useEffect, useMemo } from 'react';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  // Detect if greeting is a raw key (contains dots or colons - not a real greeting)
  const isRawKey = greeting.includes('.') || greeting.includes(':');
  
  // Use bundled fallback if greeting looks like a raw key
  const safeGreeting = useMemo(() => {
    if (isRawKey) {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
    return greeting;
  }, [greeting, isRawKey]);
  
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
    <Display as="h1" size="sm" className="uppercase tracking-tight text-gradient">
      {animatedText}
      {showCursor && (
        <span className="animate-pulse ml-1">|</span>
      )}
    </Display>
  );
};
