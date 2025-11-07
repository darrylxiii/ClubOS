import { useState, useRef, useEffect, KeyboardEvent } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="relative">
      {/* Display layer (visual only) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={cn(
          "w-full min-h-full p-3 text-sm whitespace-pre-wrap break-words font-mono opacity-0",
          className
        )}>
          {displayParts.map((part, index) => (
            part.type === 'mention' ? (
              <span
                key={index}
                className="bg-primary/20 text-primary px-1 py-0.5 rounded font-medium"
              >
                @{part.content}
              </span>
            ) : (
              <span key={index}>{part.content}</span>
            )
          ))}
        </div>
      </div>

      {/* Actual textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "relative z-10 bg-transparent resize-none",
          className
        )}
      />

      {/* Mention dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-border bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">
              Mention someone
            </p>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left",
                    index === selectedIndex 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {member.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
