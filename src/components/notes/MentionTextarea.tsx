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
  

  // Filter team members based on search
  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );
  
  console.log('[MentionTextarea] Render state', {
    showMentions,
    mentionSearch,
    teamMembersCount: teamMembers.length,
    filteredMembersCount: filteredMembers.length,
    dropdownPosition,
    willRenderDropdown: showMentions && filteredMembers.length > 0
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch]);

  // Extract mentioned user IDs from content
  const extractMentions = (content: string): string[] => {
    const mentionPattern = /@\[([a-f0-9-]{36})\]\([^)]+\)/g;
    const matches = [...content.matchAll(mentionPattern)];
    return [...new Set(matches.map(match => match[1]))];
  };

  // Calculate dropdown position based on @ symbol location
  const getDropdownPosition = (textarea: HTMLTextAreaElement, atPosition: number) => {
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseInt(style.lineHeight) || 20;
    const paddingTop = parseInt(style.paddingTop) || 12;
    const paddingLeft = parseInt(style.paddingLeft) || 12;
    
    // Count lines before @ symbol
    const textBeforeAt = textarea.value.slice(0, atPosition);
    const lines = textBeforeAt.split('\n');
    const currentLineNumber = lines.length - 1;
    
    // Calculate vertical position (use rect.top directly for fixed positioning - NO window.scrollY!)
    const top = rect.top + paddingTop + (currentLineNumber * lineHeight) + lineHeight + 4;
    
    // Calculate horizontal position
    const left = rect.left + paddingLeft;
    
    return { top, left };
  };


  const handleTextChange = (newValue: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    console.log('[MentionTextarea] handleTextChange called', {
      newValue,
      cursorPos,
      teamMembersCount: teamMembers.length
    });

    // Check if user typed @ to trigger mention dropdown
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    console.log('[MentionTextarea] Searching for @', {
      textBeforeCursor,
      lastAtIndex
    });
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      console.log('[MentionTextarea] Found @ symbol', {
        textAfterAt,
        hasSpace: textAfterAt.includes(' '),
        hasNewline: textAfterAt.includes('\n')
      });
      
      // Show mentions if @ is followed by text without spaces
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        
        // Calculate dropdown position using simplified method
        const position = getDropdownPosition(textarea, lastAtIndex);
        
        // Ensure dropdown stays within viewport (for fixed positioning, compare against window height/width directly)
        const dropdownWidth = 320;
        const dropdownHeight = 300;
        const maxLeft = window.innerWidth - dropdownWidth - 20;
        const maxTop = window.innerHeight - dropdownHeight - 20;
        
        const finalPosition = {
          top: Math.min(position.top, maxTop),
          left: Math.min(position.left, maxLeft)
        };
        
        console.log('[MentionTextarea] Setting dropdown position and showing', {
          position,
          finalPosition,
          mentionSearch: textAfterAt
        });
        
        setDropdownPosition(finalPosition);
        setShowMentions(true);
      } else {
        console.log('[MentionTextarea] Hiding mentions - space or newline found');
        setShowMentions(false);
      }
    } else {
      console.log('[MentionTextarea] Hiding mentions - no @ found');
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
        const textBeforeCursor = value.slice(0, textarea.selectionStart);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
          const position = getDropdownPosition(textarea, lastAtIndex);
          
          const dropdownWidth = 320;
          const dropdownHeight = 300;
          const maxLeft = window.innerWidth - dropdownWidth - 20;
          const maxTop = window.innerHeight - dropdownHeight - 20;
          
          setDropdownPosition({
            top: Math.min(position.top, maxTop),
            left: Math.min(position.left, maxLeft)
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
    const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
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
      
      // Add mention with userId for invisible text rendering
      parts.push({
        type: 'mention',
        content: match[2], // The name part
        userId: match[1]   // The UUID part (for invisible text)
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
              <span key={index} className="inline-block relative">
                {/* Invisible text matching the raw format: @[uuid]( */}
                <span className="text-transparent select-none">
                  @[{part.userId}](
                </span>
                {/* Visible badge showing @Name, positioned to overlay the Name part */}
                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-semibold -ml-1">
                  @{part.content}
                </span>
                {/* Invisible closing parenthesis */}
                <span className="text-transparent select-none">)</span>
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
          className="fixed z-[99999] w-80 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm"
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
