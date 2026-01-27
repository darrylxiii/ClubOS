import { useState, useEffect } from "react";
import { QuickTip } from "@/types/quickTip";
import { TipCard } from "./TipCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCarouselControls } from "@/hooks/useCarouselControls";
import { cn } from "@/lib/utils";

interface QuickTipsCarouselProps {
  tips: QuickTip[];
}

export function QuickTipsCarousel({ tips }: QuickTipsCarouselProps) {
  const [cardsPerView, setCardsPerView] = useState(3);

  const {
    currentIndex,
    goToNext,
    goToPrevious,
    goToIndex,
    pause,
    resume,
    maxIndex,
  } = useCarouselControls({
    totalItems: tips.length,
    autoPlayInterval: 7000,
    cardsPerView,
  });

  // Responsive cards per view
  useEffect(() => {
    const updateCardsPerView = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setCardsPerView(3); // Desktop: 3 cards
      } else if (width >= 768) {
        setCardsPerView(2); // Tablet: 2 cards
      } else {
        setCardsPerView(1); // Mobile: 1 card
      }
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Calculate visible tips
  const visibleTips = tips.slice(currentIndex, currentIndex + cardsPerView);

  // Pause on hover
  const handleMouseEnter = () => pause();
  const handleMouseLeave = () => resume();

  // Generate dot indicators
  const totalDots = Math.ceil(tips.length / cardsPerView);
  const activeDot = Math.floor(currentIndex / cardsPerView);

  return (
    <div
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-label="Quick tips carousel"
    >
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <motion.div
          className={cn(
            "grid gap-4",
            cardsPerView === 1 && "grid-cols-1",
            cardsPerView === 2 && "grid-cols-1 md:grid-cols-2",
            cardsPerView === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {visibleTips.map((tip, index) => (
              <TipCard key={tip.id} tip={tip} index={index} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation Arrows (Desktop only) */}
      {tips.length > cardsPerView && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4",
              "bg-background/80 backdrop-blur-sm",
              "border border-primary/20 hover:border-primary/50",
              "shadow-lg",
              "hidden md:flex",
              currentIndex === 0 && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Previous tip"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 translate-x-4",
              "bg-background/80 backdrop-blur-sm",
              "border border-primary/20 hover:border-primary/50",
              "shadow-lg",
              "hidden md:flex",
              currentIndex >= maxIndex && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Next tip"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dot Indicators */}
      {tips.length > cardsPerView && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalDots }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index * cardsPerView)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === activeDot
                  ? "w-8 bg-primary"
                  : "w-2 bg-primary/30 hover:bg-primary/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
