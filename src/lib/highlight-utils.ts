import React from 'react';
import { cn } from '@/lib/utils';

export function highlightText(text: string, query: string, className?: string): React.ReactNode {
  if (!query || !text) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className={cn("bg-accent/20 text-accent rounded-sm px-0.5", className)}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
}
