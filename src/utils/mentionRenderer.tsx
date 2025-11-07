import { Badge } from "@/components/ui/badge";

/**
 * Render note content with @mentions highlighted
 * Converts @[uuid](Name) format to visual badges
 */
export const renderNoteContentWithMentions = (content: string) => {
  const mentionPattern = /@\[([a-f0-9-]{36})\]\(([^)]+)\)/g;
  const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    
    // Add mention
    parts.push({
      type: 'mention',
      content: match[2], // The name part
      userId: match[1]   // The UUID part
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return parts.map((part, index) => {
    if (part.type === 'mention') {
      return (
        <Badge 
          key={index} 
          variant="secondary" 
          className="mx-0.5 bg-primary/20 text-primary hover:bg-primary/30"
        >
          @{part.content}
        </Badge>
      );
    }
    return <span key={index}>{part.content}</span>;
  });
};

/**
 * Extract plain text from note content (removes mention markup)
 */
export const extractPlainTextFromNote = (content: string): string => {
  return content.replace(/@\[([a-f0-9-]{36})\]\(([^)]+)\)/g, '@$2');
};

/**
 * Get list of mentioned user IDs from note content
 */
export const extractMentionedUserIds = (content: string): string[] => {
  const mentionPattern = /@\[([a-f0-9-]{36})\]/g;
  const matches = [...content.matchAll(mentionPattern)];
  return [...new Set(matches.map(match => match[1]))];
};
