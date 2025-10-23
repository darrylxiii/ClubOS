import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/miljoenenjacht/utils';
import { Phone } from 'lucide-react';

interface BankerOfferProps {
  offer: number;
  expectedValue: number;
  onDeal: () => void;
  onNoDeal: () => void;
  onHesitation: () => void;
}

export const BankerOffer = memo(({ offer, expectedValue, onDeal, onNoDeal, onHesitation }: BankerOfferProps) => {
  const [showOffer, setShowOffer] = useState(false);
  const [startTime] = useState(Date.now());
  const [hasHovered, setHasHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowOffer(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleButtonHover = () => {
    if (!hasHovered) {
      setHasHovered(true);
      onHesitation();
    }
  };

  const percentage = Math.round((offer / expectedValue) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-accent/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full space-y-8"
      >
        {!showOffer ? (
          <Card className="backdrop-blur-xl bg-card/80 border-border/50">
            <CardContent className="p-12 text-center space-y-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-8xl"
              >
                📞
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">The Banker is Calling...</h2>
                <p className="text-muted-foreground">Preparing your offer</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="backdrop-blur-xl bg-card/80 border-primary/30 shadow-xl shadow-primary/20">
            <CardContent className="p-8 md:p-12 space-y-8">
              <div className="text-center space-y-4">
                <Phone className="w-16 h-16 mx-auto text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">Banker's Offer</h2>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="text-5xl md:text-7xl font-bold text-primary py-6"
                >
                  {formatCurrency(offer)}
                </motion.div>

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div>
                    <div className="font-semibold">Expected Value</div>
                    <div>{formatCurrency(expectedValue)}</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <div className="font-semibold">Offer Ratio</div>
                    <div className={percentage >= 85 ? 'text-green-500' : percentage >= 70 ? 'text-yellow-500' : 'text-red-500'}>
                      {percentage}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onNoDeal}
                  onMouseEnter={handleButtonHover}
                  className="h-16 text-lg border-2"
                >
                  NO DEAL
                </Button>
                <Button
                  size="lg"
                  onClick={onDeal}
                  onMouseEnter={handleButtonHover}
                  className="h-16 text-lg bg-gradient-to-r from-primary to-primary/80"
                >
                  DEAL! 💰
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Take the money and end the game, or continue playing?
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
});

BankerOffer.displayName = 'BankerOffer';
