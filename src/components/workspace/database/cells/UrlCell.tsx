import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrlCellProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
}

export function UrlCell({ value, onChange }: UrlCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      const url = value.startsWith('http') ? value : `https://${value}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="url"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm bg-transparent outline-none"
        placeholder="https://..."
      />
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-text min-h-[36px] flex items-center gap-2 group",
        !value && "text-muted-foreground"
      )}
      onClick={() => setIsEditing(true)}
    >
      {value ? (
        <>
          <span className="truncate text-primary underline">{value}</span>
          <button
            onClick={handleLinkClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </>
      ) : (
        'Empty'
      )}
    </div>
  );
}
