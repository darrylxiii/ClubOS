import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MotionContextType {
  motionEnabled: boolean;
  toggleMotion: () => void;
}

const MotionContext = createContext<MotionContextType | undefined>(undefined);

export const MotionProvider = ({ children }: { children: ReactNode }) => {
  const [motionEnabled, setMotionEnabled] = useState(() => {
    const saved = localStorage.getItem('motion-enabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('motion-enabled', String(motionEnabled));
  }, [motionEnabled]);

  const toggleMotion = () => {
    setMotionEnabled(prev => !prev);
  };

  return (
    <MotionContext.Provider value={{ motionEnabled, toggleMotion }}>
      {children}
    </MotionContext.Provider>
  );
};

export const useMotion = () => {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error('useMotion must be used within MotionProvider');
  }
  return context;
};
