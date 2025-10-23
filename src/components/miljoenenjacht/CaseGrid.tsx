import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BriefCase } from '@/types/miljoenenjacht';
import { soundManager } from '@/lib/miljoenenjacht/soundManager';
import { formatCurrency } from '@/lib/miljoenenjacht/utils';

interface CaseGridProps {
  cases: BriefCase[];
  playerCase: number;
  onSelectCase: (caseId: number) => void;
  disabled: boolean;
}

export const CaseGrid = memo(({ cases, playerCase, onSelectCase, disabled }: CaseGridProps) => {
  const [hoveredCase, setHoveredCase] = useState<number | null>(null);
  const [revealingCase, setRevealingCase] = useState<number | null>(null);
  const [focusedCase, setFocusedCase] = useState<number | null>(null);

  const handleCaseClick = (briefCase: BriefCase) => {
    if (briefCase.opened || disabled) return;
    
    soundManager.caseClick();
    setRevealingCase(briefCase.id);
    
    setTimeout(() => {
      const isHighValue = briefCase.amount >= 100000;
      soundManager.caseReveal(isHighValue);
      onSelectCase(briefCase.id);
      
      setTimeout(() => {
        setRevealingCase(null);
      }, 500);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent, briefCase: BriefCase) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCaseClick(briefCase);
    }
  };

  useEffect(() => {
    if (disabled) {
      setFocusedCase(null);
    }
  }, [disabled]);

  const availableCases = cases.filter(c => c.id !== playerCase);

  return (
    <div 
      className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 md:gap-3"
      role="grid"
      aria-label="Briefcase selection grid"
    >
      {availableCases.map((briefCase, index) => (
        <motion.div
          key={briefCase.id}
          layout
          whileHover={!briefCase.opened && !disabled ? { scale: 1.05 } : {}}
          whileTap={!briefCase.opened && !disabled ? { scale: 0.95 } : {}}
          onHoverStart={() => !briefCase.opened && !disabled && setHoveredCase(briefCase.id)}
          onHoverEnd={() => setHoveredCase(null)}
        >
          <Card
            role="gridcell"
            tabIndex={!briefCase.opened && !disabled ? 0 : -1}
            aria-label={`Briefcase ${briefCase.id}${briefCase.opened ? ', opened' : ', available'}`}
            aria-disabled={briefCase.opened || disabled}
            onKeyDown={(e) => handleKeyDown(e, briefCase)}
            className={`transition-all relative overflow-hidden ${
              briefCase.opened
                ? 'opacity-40 bg-muted/30'
                : disabled
                ? 'cursor-not-allowed opacity-60'
                : hoveredCase === briefCase.id || focusedCase === briefCase.id
                ? 'bg-primary/20 cursor-pointer ring-2 ring-primary'
                : 'bg-card/80 cursor-pointer'
            }`}
            onClick={() => handleCaseClick(briefCase)}
            onFocus={() => setFocusedCase(briefCase.id)}
            onBlur={() => setFocusedCase(null)}
          >
            <CardContent className="p-3 md:p-4 text-center relative">
              <AnimatePresence mode="wait">
                {revealingCase === briefCase.id ? (
                  <motion.div
                    key="revealing"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 180 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-primary/10"
                  >
                    <div className="text-xs md:text-sm font-bold text-primary">
                      {formatCurrency(briefCase.amount)}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-2xl md:text-3xl mb-1">
                      {briefCase.opened ? '📭' : '💼'}
                    </div>
                    <div className="text-sm md:text-base font-bold">
                      {briefCase.id}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
});

CaseGrid.displayName = 'CaseGrid';
