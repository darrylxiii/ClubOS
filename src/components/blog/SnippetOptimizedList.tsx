import React from 'react';

interface ListItem { text: string; subItems?: string[]; }
interface SnippetOptimizedListProps { heading: string; headingLevel?: 'h2' | 'h3'; items: ListItem[]; ordered?: boolean; className?: string; }

const SnippetOptimizedList: React.FC<SnippetOptimizedListProps> = ({ heading, headingLevel = 'h2', items, ordered = true, className = '' }) => {
  const HeadingTag = headingLevel;
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <div className={`snippet-target ${className}`}>
      <HeadingTag className="text-xl font-bold mb-4 text-foreground">{heading}</HeadingTag>
      <ListTag className={`space-y-3 ${ordered ? 'list-decimal' : 'list-disc'} list-inside text-muted-foreground`}>
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            <span className="text-foreground">{item.text}</span>
            {item.subItems?.length && (
              <ul className="mt-2 ml-6 space-y-1 list-disc list-inside">
                {item.subItems.map((s, j) => <li key={j} className="text-sm">{s}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ListTag>
    </div>
  );
};

export default SnippetOptimizedList;
