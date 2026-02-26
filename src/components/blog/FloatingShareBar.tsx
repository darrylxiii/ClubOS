import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SocialShareButtons from './SocialShareButtons';
import { cn } from '@/lib/utils';

interface FloatingShareBarProps { url: string; title: string; description?: string; onShare?: (platform: string) => void; }

const FloatingShareBar: React.FC<FloatingShareBarProps> = ({ url, title, description, onShare }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
      setIsAtBottom(window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && !isAtBottom && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className={cn('fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 z-30 hidden md:block')}>
          <div className="flex flex-col gap-2 p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg">
            <SocialShareButtons url={url} title={title} description={description} variant="compact" onShare={onShare} className="flex-col" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingShareBar;
