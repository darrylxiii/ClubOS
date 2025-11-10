import { useAnimatedText } from '@/hooks/useAnimatedText';

interface TypewriterGreetingProps {
  greeting: string;
  firstName: string;
}

export const TypewriterGreeting = ({ greeting, firstName }: TypewriterGreetingProps) => {
  const animatedGreeting = useAnimatedText(greeting, "");

  return (
    <h1 className="text-2xl font-black uppercase tracking-tight">
      {animatedGreeting} {firstName}
    </h1>
  );
};
