import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NumberCellProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}

export function NumberCell({ value, onChange }: NumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = editValue === '' ? null : parseFloat(editValue);
    if (numValue !== value) {
      onChange(isNaN(numValue as number) ? null : numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(value?.toString() || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm bg-transparent outline-none"
      />
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-text min-h-[36px]",
        value === null || value === undefined ? "text-muted-foreground" : ""
      )}
      onClick={() => setIsEditing(true)}
    >
      {value ?? 'Empty'}
    </div>
  );
}
