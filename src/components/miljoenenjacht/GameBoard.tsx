import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BriefCase } from '@/types/miljoenenjacht';
import { formatCurrency } from '@/lib/miljoenenjacht/utils';

interface GameBoardProps {
  cases: BriefCase[];
  playerCase: number;
  onSelectCase: (caseId: number) => void;
  selectableCases: boolean;
}

export const GameBoard = memo(({ cases, playerCase, onSelectCase, selectableCases }: GameBoardProps) => {
  const sortedCases = [...cases].sort((a, b) => a.amount - b.amount);
  
  return (
    <div 
      className="grid grid-cols-2 gap-2 md:gap-3"
      role="list"
      aria-label="Prize amounts board"
    >
      <AnimatePresence>
        {sortedCases.map((briefCase) => (
          <motion.div
            key={briefCase.id}
            layout
            initial={{ opacity: 1, scale: 1 }}
            animate={briefCase.opened ? {
              opacity: 0.4,
              scale: 0.95,
              x: [-2, 2, -2, 0]
            } : {
              opacity: 1,
              scale: 1
            }}
            transition={briefCase.opened ? {
              duration: 0.5,
              x: { duration: 0.3 }
            } : {
              duration: 0.3
            }}
            role="listitem"
          >
            <Card
              className={`transition-all ${
                briefCase.opened
                  ? 'opacity-40 bg-muted/50 border-muted'
                  : briefCase.id === playerCase
                  ? 'ring-2 ring-primary bg-primary/10'
                  : 'bg-card/80'
              }`}
            >
              <CardContent className="p-2 md:p-3 text-center relative">
                <motion.div 
                  className={`text-sm md:text-base font-bold ${
                    briefCase.opened ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                  animate={briefCase.opened ? {
                    color: ['hsl(var(--foreground))', 'hsl(var(--muted-foreground))']
                  } : {}}
                >
                  {formatCurrency(briefCase.amount)}
                </motion.div>
                {briefCase.opened && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute inset-0 flex items-center justify-center text-2xl opacity-20"
                  >
                    ❌
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';
