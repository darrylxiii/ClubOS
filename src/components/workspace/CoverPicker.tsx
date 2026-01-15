import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Link } from 'lucide-react';

interface CoverPickerProps {
  onSelect: (coverUrl: string | null) => void;
  onClose: () => void;
  currentCover?: string | null;
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
];

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1200',
  'https://images.unsplash.com/photo-1518173946687-a4c036bc3c4f?w=1200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200',
];

export function CoverPicker({ onSelect, onClose, currentCover }: CoverPickerProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      onSelect(linkUrl.trim());
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="bg-card border rounded-lg shadow-xl w-[500px] max-h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-medium">Choose cover</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="w-full justify-start px-4 pt-2">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="gradient">Gradients</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="m-0">
            <ScrollArea className="h-[300px] p-4">
              <div className="grid grid-cols-2 gap-3">
                {COVER_IMAGES.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => onSelect(url)}
                    className="relative h-24 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <img 
                      src={url} 
                      alt={`Cover ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {currentCover === url && (
                      <div className="absolute inset-0 bg-primary/20 ring-2 ring-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gradient" className="m-0">
            <ScrollArea className="h-[300px] p-4">
              <div className="grid grid-cols-3 gap-3">
                {COVER_GRADIENTS.map((gradient, index) => (
                  <button
                    key={index}
                    onClick={() => onSelect(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${gradient.match(/#[a-f0-9]{6}/gi)?.[0]};stop-opacity:1" /><stop offset="100%" style="stop-color:${gradient.match(/#[a-f0-9]{6}/gi)?.[1]};stop-opacity:1" /></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>`)}`)}
                    className="h-16 rounded-lg hover:ring-2 hover:ring-primary transition-all"
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="link" className="m-0 p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="flex-1"
                />
                <Button onClick={handleLinkSubmit} disabled={!linkUrl.trim()}>
                  <Link className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Works with any image URL from the web.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Remove Cover Button */}
        {currentCover && (
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              onClick={() => onSelect(null)}
              className="w-full text-muted-foreground"
            >
              Remove cover
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
