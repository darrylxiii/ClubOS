/**
 * Strip HTML tags and decode HTML entities from text
 */
export function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  
  Object.keys(entities).forEach(entity => {
    text = text.replace(new RegExp(entity, 'g'), entities[entity]);
  });
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Truncate text to a maximum number of sentences
 */
export function truncateToSentences(text: string, maxSentences: number = 2): string {
  // Split by sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  if (sentences.length <= maxSentences) {
    return text;
  }
  
  return sentences.slice(0, maxSentences).join(' ').trim() + '...';
}

/**
 * Process post content: strip HTML, truncate, and clean
 */
export function processPostContent(content: string, maxSentences: number = 2): string {
  const cleaned = stripHtml(content);
  return truncateToSentences(cleaned, maxSentences);
}
