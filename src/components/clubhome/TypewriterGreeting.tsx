import { useAnimatedText } from '@/hooks/useAnimatedText';
import { useState, useEffect } from 'react';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  const fullText = `${greeting} ${firstName}`;
  const animatedText = useAnimatedText(fullText, "");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    // Hide cursor when animation completes
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
