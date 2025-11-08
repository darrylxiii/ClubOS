/**
 * Helper utilities for working with @mentions in notes
 */

/**
 * Validate mention format in content
 * Format: @[uuid](Name)
 */
export const validateMentionFormat = (content: string): boolean => {
  const mentionPattern = /@\[([a-f0-9-]{36})\]\(([^)]+)\)/g;
  const matches = content.match(mentionPattern);
  return matches !== null && matches.length > 0;
};

/**
 * Count mentions in content
 */
export const countMentions = (content: string): number => {
  const mentionPattern = /@\[([a-f0-9-]{36})\]\(([^)]+)\)/g;
  const matches = content.match(mentionPattern);
  return matches ? matches.length : 0;
};

/**
 * Get unique mentioned users from content
 */
export const getUniqueMentionedUsers = (content: string): Array<{ id: string; name: string }> => {
  const mentionPattern = /@\[([a-f0-9-]{36})\]\(([^)]+)\)/g;
  const users = new Map<string, string>();
  
  let match;
  while ((match = mentionPattern.exec(content)) !== null) {
    users.set(match[1], match[2]); // id -> name
  }
  
  return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
};

/**
 * Format mention for display (removes UUID)
 * @[uuid](Name) -> @Name
 */
export const formatMentionForDisplay = (content: string): string => {
  return content.replace(/@\[([a-f0-9-]{36})\]\(([^)]+)\)/g, '@$2');
};

/**
 * Create mention markup from user
 */
export const createMentionMarkup = (userId: string, userName: string): string => {
  return `@[${userId}](${userName})`;
};

/**
 * Check if user is mentioned in content
 */
export const isUserMentioned = (content: string, userId: string): boolean => {
  const mentionPattern = new RegExp(`@\\[${userId}\\]\\([^)]+\\)`, 'g');
  return mentionPattern.test(content);
};

/**
 * Remove mentions from content (for plain text export)
 */
export const removeMentions = (content: string): string => {
  return content.replace(/@\[([a-f0-9-]{36})\]\(([^)]+)\)/g, '$2');
};

/**
 * Highlight specific user's mentions in content
 */
export const highlightUserMentions = (content: string, userId: string): string => {
  const pattern = new RegExp(`(@\\[${userId}\\]\\([^)]+\\))`, 'g');
  return content.replace(pattern, '**$1**');
};

/**
 * Extract mention context (text around mention)
 */
export const getMentionContext = (
  content: string,
  userId: string,
  contextLength: number = 50
): string[] => {
  const pattern = new RegExp(`@\\[${userId}\\]\\(([^)]+)\\)`, 'g');
  const contexts: string[] = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const start = Math.max(0, match.index - contextLength);
    const end = Math.min(content.length, match.index + match[0].length + contextLength);
    const excerpt = content.substring(start, end).trim();
    contexts.push(start > 0 ? `...${excerpt}...` : `${excerpt}...`);
  }

  return contexts;
};
