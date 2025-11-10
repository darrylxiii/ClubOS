import { useState, useEffect } from 'react';
import { useAnimatedText } from '@/hooks/useAnimatedText';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const fullText = `${greeting} ${firstName}`;
  const animatedText = useAnimatedText(fullText, "");

  useEffect(() => {
    const sessionKey = 'greeting_typewriter_played';
    const played = sessionStorage.getItem(sessionKey);
    
    if (played === 'true') {
      setHasPlayed(true);
    } else {
      // Mark as played after animation completes
      const timer = setTimeout(() => {
        sessionStorage.setItem(sessionKey, 'true');
        setHasPlayed(true);
      }, fullText.length * 80);
      
      return () => clearTimeout(timer);
    }
  }, [fullText]);

  return (
    <h1 className="text-2xl font-black uppercase tracking-tight">
      {hasPlayed ? fullText : animatedText}
    </h1>
  );
};
