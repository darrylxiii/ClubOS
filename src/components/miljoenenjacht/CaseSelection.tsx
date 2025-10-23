import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CaseSelectionProps {
  onSelectCase: (caseNumber: number) => void;
}

export const CaseSelection = memo(({ onSelectCase }: CaseSelectionProps) => {
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [hoveredCase, setHoveredCase] = useState<number | null>(null);

  const handleCaseClick = (caseNum: number) => {
    setSelectedCase(caseNum);
  };

  const handleConfirm = () => {
    if (selectedCase !== null) {
      onSelectCase(selectedCase);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">Choose Your Briefcase</h2>
          <p className="text-lg text-muted-foreground">
            This case is yours - it will be revealed at the end
          </p>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 md:gap-4">
          {Array.from({ length: 26 }, (_, i) => i + 1).map((caseNum) => (
            <motion.div
              key={caseNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setHoveredCase(caseNum)}
              onHoverEnd={() => setHoveredCase(null)}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedCase === caseNum
                    ? 'ring-2 ring-primary bg-primary/20'
                    : hoveredCase === caseNum
                    ? 'bg-primary/10'
                    : 'bg-card/80'
                }`}
                onClick={() => handleCaseClick(caseNum)}
              >
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl mb-2">💼</div>
                  <div className="text-xl md:text-2xl font-bold">{caseNum}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {selectedCase !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Button
              onClick={handleConfirm}
              size="lg"
              className="text-lg h-14 px-12 bg-gradient-to-r from-primary to-primary/80"
            >
              Lock in Case {selectedCase}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
});

CaseSelection.displayName = 'CaseSelection';
