import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';

const categoryCTAs: Record<string, { message: string; cta: string; link: string }> = {
  'career-insights': {
    message: 'Get matched to roles that fit your ambitions.',
    cta: 'Explore opportunities',
    link: '/auth',
  },
  'talent-strategy': {
    message: 'See how we source exceptional talent for companies like yours.',
    cta: 'Partner with us',
    link: '/partnerships',
  },
  'industry-trends': {
    message: 'Stay ahead with curated executive briefings.',
    cta: 'Join the briefing list',
    link: '/auth',
  },
  'leadership': {
    message: 'Connect with a network of senior leaders.',
    cta: 'Apply for membership',
    link: '/auth',
  },
};

const defaultCTA = {
  message: 'Ready for your next move?',
  cta: 'Apply as Talent',
  link: '/auth',
};

const ScrollCTA: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { category } = useParams<{ category?: string }>();

  const ctaConfig = categoryCTAs[category || ''] || defaultCTA;

  useEffect(() => {
    const handleScroll = () => {
      if (dismissed) return;
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPercent > 0.6);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              {ctaConfig.message}
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <Link
                to={ctaConfig.link}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
              >
                {ctaConfig.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-2"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollCTA;
