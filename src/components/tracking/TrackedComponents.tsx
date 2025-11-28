import { ReactNode, useEffect, useRef } from 'react';
import { trackingService } from '@/services/trackingService';

interface TrackedSectionProps {
  children: ReactNode;
  sectionName: string;
  className?: string;
}

export function TrackedSection({ children, sectionName, className }: TrackedSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTimeRef.current = Date.now();
          } else if (startTimeRef.current > 0) {
            const timeInView = Date.now() - startTimeRef.current;
            if (timeInView > 1000) { // Only track if viewed for >1s
              trackingService.trackEvent({
                eventType: 'hover',
                elementId: sectionName,
                elementTag: 'section',
                timeOnElementMs: timeInView,
                metadata: { sectionName },
              });
            }
            startTimeRef.current = 0;
          }
        });
      },
      { threshold: 0.5 }
    );

    observerRef.current.observe(sectionRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [sectionName]);

  return (
    <div ref={sectionRef} className={className} data-tracked-section={sectionName}>
      {children}
    </div>
  );
}

interface TrackedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  actionName: string;
}

export function TrackedButton({ children, actionName, onClick, ...props }: TrackedButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackingService.trackEvent({
      eventType: 'click',
      elementTag: 'button',
      elementText: actionName,
      metadata: { actionName, buttonType: props.type || 'button' },
    });

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button onClick={handleClick} data-tracked-action={actionName} {...props}>
      {children}
    </button>
  );
}

interface TrackedLinkProps {
  children: ReactNode;
  href: string;
  linkName: string;
  className?: string;
}

export function TrackedLink({ children, href, linkName, className }: TrackedLinkProps) {
  const handleClick = () => {
    trackingService.trackEvent({
      eventType: 'click',
      elementTag: 'a',
      elementText: linkName,
      metadata: { href, linkName, destination: href },
    });
  };

  return (
    <a href={href} onClick={handleClick} className={className} data-tracked-link={linkName}>
      {children}
    </a>
  );
}

interface TrackedSearchProps {
  onSearch: (query: string) => void;
  category: 'jobs' | 'candidates' | 'companies' | 'global' | 'knowledge';
  placeholder?: string;
  className?: string;
}

export function TrackedSearch({ onSearch, category, placeholder, className }: TrackedSearchProps) {
  const searchStartRef = useRef<number>(0);

  const handleSearchStart = () => {
    searchStartRef.current = Date.now();
  };

  const handleSearchComplete = (query: string, resultsCount: number) => {
    const timeToFirstClick = searchStartRef.current > 0 ? Date.now() - searchStartRef.current : undefined;

    trackingService.trackSearch({
      searchQuery: query,
      searchCategory: category,
      resultsCount,
      timeToFirstClick,
    });

    searchStartRef.current = 0;
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    
    handleSearchStart();
    onSearch(query);
    
    // Note: resultsCount should be tracked after results are loaded
    // This is a simplified version
    setTimeout(() => handleSearchComplete(query, 0), 100);
  };

  return (
    <form onSubmit={handleSearch} className={className}>
      <input
        type="search"
        name="search"
        placeholder={placeholder}
        data-tracked-search={category}
      />
    </form>
  );
}
