import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Square, Circle, Eraser, X, MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenAnnotationProps {
  isAnnotating: boolean;
  onClose: () => void;
}

type Tool = 'pen' | 'square' | 'circle' | 'eraser' | 'pointer';

export function ScreenAnnotation({ isAnnotating, onClose }: ScreenAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#FF0000');
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    if (tool === 'pointer') {
      setPointerPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  };

  const draw = (e: React.MouseEvent) => {
    if (tool === 'pointer') {
      setPointerPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = tool === 'eraser' ? '#00000000' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!isAnnotating) return null;

  return (
    <div className="fixed inset-0 z-[10005]">
      {/* Annotation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Pointer Overlay */}
      {tool === 'pointer' && (
        <div
          className="absolute pointer-events-none animate-pulse"
          style={{
            left: pointerPosition.x - 20,
            top: pointerPosition.y - 20,
            transition: 'left 0.1s, top 0.1s'
          }}
        >
          <MousePointer className="h-10 w-10 text-red-500 drop-shadow-lg" />
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card rounded-full px-4 py-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={tool === 'pen' ? 'default' : 'ghost'}
          onClick={() => setTool('pen')}
          className="rounded-full h-10 w-10 p-0"
        >
          <Pencil className="h-5 w-5" />
        </Button>
        
        <Button
          size="sm"
          variant={tool === 'square' ? 'default' : 'ghost'}
          onClick={() => setTool('square')}
          className="rounded-full h-10 w-10 p-0"
        >
          <Square className="h-5 w-5" />
        </Button>
        
        <Button
          size="sm"
          variant={tool === 'circle' ? 'default' : 'ghost'}
          onClick={() => setTool('circle')}
          className="rounded-full h-10 w-10 p-0"
        >
          <Circle className="h-5 w-5" />
        </Button>

        <Button
          size="sm"
          variant={tool === 'pointer' ? 'default' : 'ghost'}
          onClick={() => setTool('pointer')}
          className="rounded-full h-10 w-10 p-0"
        >
          <MousePointer className="h-5 w-5" />
        </Button>
        
        <Button
          size="sm"
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          onClick={() => setTool('eraser')}
          className="rounded-full h-10 w-10 p-0"
        >
          <Eraser className="h-5 w-5" />
        </Button>

        <div className="h-6 w-px bg-border/50 mx-2" />

        {/* Color Picker */}
        <div className="flex gap-1">
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-white scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-border/50 mx-2" />
        
        <Button
          size="sm"
          variant="ghost"
          onClick={clearCanvas}
          className="rounded-full h-10 px-4"
        >
          Clear
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="rounded-full h-10 w-10 p-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}