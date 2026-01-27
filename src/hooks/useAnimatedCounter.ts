import { useEffect, useState, useRef } from "react";

export function useAnimatedCounter(
  end: number, 
  duration: number = 1000,
  startOnMount: boolean = true
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const previousEnd = useRef(end);
  
  useEffect(() => {
    if (!startOnMount && !hasStarted) return;
    
    if (end === 0) {
      setCount(0);
      return;
    }
    
    // If value changed, animate from current to new
    const startValue = previousEnd.current !== end ? count : 0;
    previousEnd.current = end;
    
    let startTime: number;
    let animationId: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const current = Math.floor(startValue + (end - startValue) * eased);
      setCount(current);
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [end, duration, startOnMount, hasStarted]);
  
  const start = () => setHasStarted(true);
  
  return { count, start };
}

export function useFormattedAnimatedCounter(
  end: number,
  duration: number = 1000,
  format: (value: number) => string = (v) => v.toLocaleString()
) {
  const { count, start } = useAnimatedCounter(end, duration);
  return { value: format(count), rawValue: count, start };
}