import React, { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { ContentBlock } from '@/data/blog';
import CTACallout from './CTACallout';
import { cn } from '@/lib/utils';
import { generateSlug } from '@/lib/highlight-utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ArticleContentProps {
  content: ContentBlock[];
  className?: string;
}

const ArticleContent: React.FC<ArticleContentProps> = ({ content, className }) => {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const renderInlineCTA = () => {
    return (
      <div key="midpoint-cta" className="my-8 py-5 px-6 border-l-2 border-border bg-muted/30 rounded-r-xl">
        <p className="text-sm text-foreground/70 mb-2">
          The Quantum Club connects exceptional professionals with opportunities that match their ambitions.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
        >
          Explore membership
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'paragraph': {
        const isFirstParagraph = index === 0 || content.slice(0, index).every(b => b.type !== 'paragraph');
        if (isFirstParagraph && block.content?.length) {
          return (
            <p key={index} className="text-foreground/80 leading-[1.8] mb-8 text-lg">
              <span className="float-left font-sans text-6xl font-bold text-primary leading-none mr-3 mt-1">{block.content.charAt(0)}</span>
              {block.content.slice(1)}
            </p>
          );
        }
        return <p key={index} className="text-foreground/80 leading-[1.8] mb-6 text-lg">{block.content}</p>;
      }
      case 'heading': {
        const HeadingTag = `h${block.level || 2}` as keyof React.JSX.IntrinsicElements;
        const styles: Record<number, string> = { 2: 'text-2xl md:text-3xl font-semibold mt-12 mb-6', 3: 'text-xl md:text-2xl font-semibold mt-10 mb-4', 4: 'text-lg md:text-xl font-medium mt-8 mb-3' };
        const slug = generateSlug(block.content);
        return (
          <HeadingTag key={index} id={slug} className={cn("text-foreground scroll-mt-24 group relative flex items-center gap-2", styles[block.level || 2])}>
            <span>{block.content}</span>
            <button onClick={() => copyLink(slug)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted" aria-label={`Copy link to ${block.content}`}>
              {copiedSlug === slug ? <Check className="h-4 w-4 text-accent" /> : <Link2 className="h-4 w-4 text-muted-foreground" />}
            </button>
          </HeadingTag>
        );
      }
      case 'image':
        return (
          <figure key={index} className="my-8">
            <img src={block.imageUrl || '/placeholder.svg'} alt={block.imageAlt || ''} className="w-full rounded-2xl" loading="lazy" />
            {block.caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{block.caption}</figcaption>}
          </figure>
        );
      case 'quote':
        return (
          <blockquote key={index} className="my-12 relative px-8 py-6">
            <span className="absolute top-0 left-0 text-7xl font-sans text-primary/20 leading-none select-none">"</span>
            <p className="relative z-10 text-xl md:text-2xl font-sans text-foreground italic leading-relaxed pl-6">{block.content}</p>
            {block.caption && <cite className="block mt-4 pl-6 text-sm text-muted-foreground not-italic font-medium">— {block.caption}</cite>}
            <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-primary via-accent to-primary rounded-full" />
          </blockquote>
        );
      case 'list':
        return (
          <div key={index} className="my-6">
            {block.content && <p className="font-medium text-foreground mb-3">{block.content}</p>}
            <ul className="space-y-2">
              {block.items?.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/80">
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-accent mt-2.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'callout':
        return (
          <div key={index} className="flex items-start gap-3 p-4 md:p-5 bg-muted/40 border border-border/50 rounded-xl my-8">
            <Lightbulb className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{block.content}</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Build content with inline CTAs every 5th block (after 3rd, 8th, 13th, etc.)
  const contentWithCTAs: React.ReactNode[] = [];
  let ctaCounter = 0;
  content.forEach((block, index) => {
    contentWithCTAs.push(renderBlock(block, index));
    // Inject CTA after every 5th content block, starting after the 3rd
    if ((index + 1) >= 3 && (index + 1 - 3) % 5 === 0) {
      contentWithCTAs.push(renderInlineCTA(ctaCounter));
      ctaCounter++;
    }
  });

  return (
    <article className={cn("max-w-prose", className)}>
      {contentWithCTAs}
    </article>
  );
};

export default ArticleContent;
