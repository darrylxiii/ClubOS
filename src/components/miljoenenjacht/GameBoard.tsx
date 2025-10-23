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
    <div className="grid grid-cols-2 gap-2 md:gap-3">
      <AnimatePresence>
        {sortedCases.map((briefCase) => (
          <motion.div
            key={briefCase.id}
            layout
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={`${
                briefCase.opened
                  ? 'opacity-40 bg-muted/50'
                  : briefCase.id === playerCase
                  ? 'ring-2 ring-primary bg-primary/10'
                  : 'bg-card/80'
              }`}
            >
              <CardContent className="p-2 md:p-3 text-center">
                <div className={`text-sm md:text-base font-bold ${
                  briefCase.opened ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}>
                  {formatCurrency(briefCase.amount)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';
