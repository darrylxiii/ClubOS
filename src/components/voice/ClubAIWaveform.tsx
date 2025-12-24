import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ClubAIWaveformProps {
  isActive: boolean;
  type: 'input' | 'output';
  volume?: number;
  variant?: 'circular' | 'linear';
  className?: string;
}

export const ClubAIWaveform = ({ 
  isActive, 
  type, 
  volume = 0, 
  variant = 'circular',
  className 
}: ClubAIWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(new Array(32).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      if (variant === 'circular') {
        drawCircularWaveform(ctx, width, height);
      } else {
        drawLinearWaveform(ctx, width, height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    const drawCircularWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) / 3;
      const barCount = 32;
      const barWidth = 2;

      // Update bars with decay
      for (let i = 0; i < barCount; i++) {
        const targetHeight = isActive 
          ? (Math.random() * 0.5 + 0.5) * volume * 20
          : 0;
        barsRef.current[i] = barsRef.current[i] * 0.85 + targetHeight * 0.15;
      }

      // Draw bars radiating from center
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const barHeight = Math.max(2, barsRef.current[i]);
        
        const x1 = centerX + Math.cos(angle) * baseRadius;
        const y1 = centerY + Math.sin(angle) * baseRadius;
        const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = type === 'input' 
          ? 'hsl(43, 50%, 55%)' // Gold for user input
          : 'hsl(45, 20%, 95%)'; // Ivory for ClubAI output
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = isActive 
        ? (type === 'input' ? 'hsl(43, 50%, 55%)' : 'hsl(45, 20%, 95%)')
        : 'hsl(0, 0%, 40%)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const drawLinearWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const barCount = 32;
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;
      const maxHeight = height * 0.8;

      // Update bars with decay
      for (let i = 0; i < barCount; i++) {
        const targetHeight = isActive 
          ? (Math.random() * 0.5 + 0.5) * volume * maxHeight
          : 4;
        barsRef.current[i] = barsRef.current[i] * 0.85 + targetHeight * 0.15;
      }

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap) + gap / 2;
        const barHeight = Math.max(4, barsRef.current[i]);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = type === 'input' 
          ? 'hsl(43, 50%, 55%)' // Gold for user input
          : 'hsl(45, 20%, 95%)'; // Ivory for ClubAI output
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, volume, type, variant]);

  return (
    <canvas
      ref={canvasRef}
      width={variant === 'circular' ? 120 : 200}
      height={variant === 'circular' ? 120 : 40}
      className={cn('pointer-events-none', className)}
    />
  );
};
