import { useLazyLoad } from "@/hooks/useLazyLoad";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyMediaProps {
  src: string;
  alt?: string;
  type: 'image' | 'video';
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export function LazyMedia({ 
  src, 
  alt = '', 
  type, 
  className = '',
  autoPlay = false,
  muted = false,
  loop = false,
  controls = false
}: LazyMediaProps) {
  const { isVisible, elementRef } = useLazyLoad<HTMLDivElement>();

  if (type === 'image') {
    return (
      <div ref={elementRef} className={className}>
        {isVisible ? (
          <img 
            src={src} 
            alt={alt}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>
    );
  }

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? (
        <video 
          src={src}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          className="w-full h-full"
        />
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
}