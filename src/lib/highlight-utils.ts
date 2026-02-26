import React from 'react';
import { cn } from '@/lib/utils';

export function highlightText(text: string, query: string, className?: string): React.ReactNode {
  if (!query || !text) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return React.createElement(React.Fragment, null,
    parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        React.createElement('span', { key: i, className: cn("bg-accent/20 text-accent rounded-sm px-0.5", className) }, part)
      ) : (
        part
      )
    )
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
