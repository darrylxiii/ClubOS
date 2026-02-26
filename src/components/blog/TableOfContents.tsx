import React, { useState, useEffect } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ContentBlock } from '@/data/blog';
import { cn } from '@/lib/utils';
import { generateSlug } from '@/lib/highlight-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TableOfContentsProps { content: ContentBlock[]; variant?: 'mobile' | 'desktop'; }
interface TOCItem { id: string; text: string; level: number; }

const TableOfContents: React.FC<TableOfContentsProps> = ({ content, variant = 'mobile' }) => {
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const headings: TOCItem[] = content.filter(b => b.type === 'heading' && b.level).map(b => ({ id: generateSlug(b.content), text: b.content, level: b.level || 2 }));

  useEffect(() => {
    if (variant !== 'desktop') return;
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); }), { rootMargin: '-80px 0px -80% 0px' });
    headings.forEach(h => { const el = document.getElementById(h.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [headings, variant]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      navigate(`${location.pathname}#${id}`, { replace: true });
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  if (headings.length === 0) return null;

  if (variant === 'mobile') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden mb-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-xl text-left">
          <div className="flex items-center gap-2"><List className="h-5 w-5 text-muted-foreground" /><span className="font-medium text-foreground">In this article</span></div>
          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <nav className="bg-muted/30 rounded-xl p-4" aria-label="Table of contents">
            <ul className="space-y-2">{headings.map(h => (
              <li key={h.id}><button onClick={() => scrollToHeading(h.id)} className={cn("text-left w-full py-1.5 text-sm text-muted-foreground hover:text-foreground", h.level === 3 && "pl-4")}>{h.text}</button></li>
            ))}</ul>
          </nav>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <nav className="hidden md:block" aria-label="Table of contents">
      <h4 className="text-sm font-semibold text-foreground mb-3">On this page</h4>
      <ul className="space-y-2">{headings.map(h => (
        <li key={h.id}><button onClick={() => scrollToHeading(h.id)} className={cn("text-left w-full py-1 text-sm hover:text-foreground", activeId === h.id ? "text-accent font-medium" : "text-muted-foreground", h.level === 3 && "pl-3 text-xs")}>{h.text}</button></li>
      ))}</ul>
    </nav>
  );
};

export default TableOfContents;
