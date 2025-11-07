import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (content: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  rows?: number;
  teamMembers: TeamMember[];
  disabled?: boolean;
  className?: string;
}

export const MentionTextarea = ({
  value,
  onChange,
  placeholder = 'Type @ to mention someone...',
  rows = 4,
  teamMembers,
  disabled,
  className
}: MentionTextareaProps) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mirrorDivRef = useRef<HTMLDivElement | null>(null);

  // Filter team members based on search
  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch]);

  // Extract mentioned user IDs from content
  const extractMentions = (content: string): string[] => {
    const mentionPattern = /@\[([a-f0-9-]{36})\]/g;
    const matches = [...content.matchAll(mentionPattern)];
    return [...new Set(matches.map(match => match[1]))];
  };

  // Calculate accurate cursor position for dropdown placement
  const getCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
    // Create or get mirror div
    if (!mirrorDivRef.current) {
      const div = document.createElement('div');
      const computed = getComputedStyle(textarea);
      
      // Copy relevant styles for accurate measurement
      const styles = [
        'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing',
        'lineHeight', 'padding', 'border', 'boxSizing', 'whiteSpace',
        'wordWrap', 'width'
      ];
      
      styles.forEach(prop => {
        (div.style as any)[prop] = (computed as any)[prop];
      });
      
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.height = 'auto';
      div.style.overflowWrap = 'break-word';
      div.style.top = '0';
      div.style.left = '-9999px';
      
      document.body.appendChild(div);
      mirrorDivRef.current = div;
    }
    
    const mirrorDiv = mirrorDivRef.current;
    
    // Mirror text up to cursor position
    const textBeforeCursor = textarea.value.slice(0, position);
    mirrorDiv.textContent = textBeforeCursor;
    
    // Add span at cursor position to measure
    const span = document.createElement('span');
    span.textContent = '|';
    mirrorDiv.appendChild(span);
    
    const spanRect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    
    return {
      top: spanRect.top - textareaRect.top + textarea.scrollTop,
      left: spanRect.left - textareaRect.left + textarea.scrollLeft
    };
  };

  // Cleanup mirror div on unmount
  useEffect(() => {
    return () => {
      if (mirrorDivRef.current && document.body.contains(mirrorDivRef.current)) {
        document.body.removeChild(mirrorDivRef.current);
      }
    };
  }, []);

  const handleTextChange = (newValue: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    // Check if user typed @ to trigger mention dropdown
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Show mentions if @ is followed by text without spaces
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        
        // Calculate dropdown position at @ symbol
        const rect = textarea.getBoundingClientRect();
        const caretCoords = getCaretCoordinates(textarea, lastAtIndex);
        
        const calculatedTop = rect.top + window.scrollY + caretCoords.top + 24;
        const calculatedLeft = rect.left + window.scrollX + caretCoords.left;
        
        // Ensure dropdown stays within viewport
        const dropdownWidth = 320;
        const dropdownHeight = 300;
        const maxLeft = window.innerWidth - dropdownWidth - 20;
        const maxTop = window.innerHeight + window.scrollY - dropdownHeight - 20;
        
        setDropdownPosition({
          top: Math.min(calculatedTop, maxTop),
          left: Math.min(calculatedLeft, maxLeft)
        });
        
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    const mentionedIds = extractMentions(newValue);
    onChange(newValue, mentionedIds);
  };

  const insertMention = (member: TeamMember) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    // Replace @search with mention
    const beforeMention = textBeforeCursor.slice(0, lastAtIndex);
    const mentionText = `@[${member.id}](${member.full_name})`;
    const newValue = beforeMention + mentionText + ' ' + textAfterCursor;

    // Update cursor position
    const newCursorPos = beforeMention.length + mentionText.length + 1;
    
    setShowMentions(false);
    setMentionSearch('');
    
    const mentionedIds = extractMentions(newValue);
    onChange(newValue, mentionedIds);

    // Set cursor position after mention
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case 'Enter':
        if (filteredMembers[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredMembers[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentions(false);
        setMentionSearch('');
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showMentions &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);

  // Update position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showMentions && textareaRef.current) {
        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
          const rect = textarea.getBoundingClientRect();
          const caretCoords = getCaretCoordinates(textarea, lastAtIndex);
          
          const calculatedTop = rect.top + window.scrollY + caretCoords.top + 24;
          const calculatedLeft = rect.left + window.scrollX + caretCoords.left;
          
          const dropdownWidth = 320;
          const dropdownHeight = 300;
          const maxLeft = window.innerWidth - dropdownWidth - 20;
          const maxTop = window.innerHeight + window.scrollY - dropdownHeight - 20;
          
          setDropdownPosition({
            top: Math.min(calculatedTop, maxTop),
            left: Math.min(calculatedLeft, maxLeft)
          });
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showMentions, value]);

  // Render content with highlighted mentions
  const renderDisplayContent = () => {
    const mentionPattern = /@\[([a-f0-9-]{36})\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(value)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: value.slice(lastIndex, match.index)
        });
      }
      
      // Add mention
      parts.push({
        type: 'mention',
        content: match[2] // The name part
      });
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push({
        type: 'text',
        content: value.slice(lastIndex)
      });
    }

    return parts;
  };

  const displayParts = renderDisplayContent();

  return (
    <div className="relative isolate">
      {/* Display layer with formatted mentions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md bg-background">
        <div className={cn(
          "w-full min-h-full p-3 text-sm whitespace-pre-wrap break-words",
          className
        )}>
          {displayParts.map((part, index) => (
            part.type === 'mention' ? (
              <span
                key={index}
                className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-semibold"
              >
                @{part.content}
              </span>
            ) : (
              <span key={index} className="text-foreground">{part.content}</span>
            )
          ))}
        </div>
      </div>

      {/* Actual textarea (text transparent to show formatted overlay) */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "relative z-10 bg-transparent resize-none text-transparent caret-foreground selection:bg-primary/30",
          className
        )}
      />

      {/* Mention dropdown - rendered via Portal at body level */}
      {showMentions && filteredMembers.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] w-80 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="p-2 border-b border-border bg-muted">
            <p className="text-xs font-medium text-muted-foreground">
              Mention someone
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                className={cn(
                  "w-full p-3 flex items-center gap-3 text-left transition-all",
                  "hover:bg-accent/50 active:bg-accent",
                  index === selectedIndex && "bg-accent/50"
                )}
                onClick={() => insertMention(member)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {member.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
