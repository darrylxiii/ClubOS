import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TextCellProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TextCell({ value, onChange, placeholder, readOnly }: TextCellProps) {
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

  if (readOnly) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        {value || '-'}
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm bg-transparent outline-none"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-text min-h-[36px]",
        !value && "text-muted-foreground"
      )}
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder || 'Empty'}
    </div>
  );
}
