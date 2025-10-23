import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BriefCase } from '@/types/miljoenenjacht';

interface CaseGridProps {
  cases: BriefCase[];
  playerCase: number;
  onSelectCase: (caseId: number) => void;
  disabled: boolean;
}

export const CaseGrid = memo(({ cases, playerCase, onSelectCase, disabled }: CaseGridProps) => {
  const [hoveredCase, setHoveredCase] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 md:gap-3">
      {cases
        .filter(c => c.id !== playerCase)
        .map((briefCase) => (
          <motion.div
            key={briefCase.id}
            whileHover={!briefCase.opened && !disabled ? { scale: 1.05 } : {}}
            whileTap={!briefCase.opened && !disabled ? { scale: 0.95 } : {}}
            onHoverStart={() => !briefCase.opened && !disabled && setHoveredCase(briefCase.id)}
            onHoverEnd={() => setHoveredCase(null)}
          >
            <Card
              className={`transition-all ${
                briefCase.opened
                  ? 'opacity-40 bg-muted/30'
                  : disabled
                  ? 'cursor-not-allowed opacity-60'
                  : hoveredCase === briefCase.id
                  ? 'bg-primary/20 cursor-pointer'
                  : 'bg-card/80 cursor-pointer'
              }`}
              onClick={() => !briefCase.opened && !disabled && onSelectCase(briefCase.id)}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-2xl md:text-3xl mb-1">
                  {briefCase.opened ? '📭' : '💼'}
                </div>
                <div className="text-sm md:text-base font-bold">
                  {briefCase.id}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
    </div>
  );
});

CaseGrid.displayName = 'CaseGrid';
