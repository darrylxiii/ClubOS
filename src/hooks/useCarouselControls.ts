import { useState, useEffect, useCallback } from 'react';

interface UseCarouselControlsProps {
  totalItems: number;
  autoPlayInterval?: number;
  cardsPerView?: number;
}

export function useCarouselControls({
  totalItems,
  autoPlayInterval = 7000,
  cardsPerView = 1,
}: UseCarouselControlsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const maxIndex = Math.max(0, totalItems - cardsPerView);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
  }, [maxIndex]);

  const pause = useCallback(() => {
    setIsPaused(true);
    setIsAutoPlaying(false);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    setIsAutoPlaying(true);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || isPaused || totalItems <= cardsPerView) {
      return;
    }

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isPaused, goToNext, autoPlayInterval, totalItems, cardsPerView]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  return {
    currentIndex,
    goToNext,
    goToPrevious,
    goToIndex,
    pause,
    resume,
    isPaused,
    maxIndex,
  };
}
