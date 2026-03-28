/**
 * Smart name capitalization.
 *
 * Capitalizes the first letter of each word, except for common
 * tussenvoegsels / particles (Dutch, Portuguese, French, German, etc.)
 * which stay lowercase — unless they are the very first word.
 *
 * Examples:
 *   "sebastiaan brouwer"       → "Sebastiaan Brouwer"
 *   "jan van der berg"         → "Jan van der Berg"
 *   "maria dos santos"         → "Maria dos Santos"
 *   "LUDWIG VAN BEETHOVEN"     → "Ludwig van Beethoven"
 *   "pierre de la croix"       → "Pierre de la Croix"
 *   "anna von trapp"           → "Anna von Trapp"
 *   "van den berg"             → "Van den Berg"  (first word always caps)
 *   "o'connor"                 → "O'Connor"
 *   "mcdonald"                 → "McDonald"
 */

const PARTICLES = new Set([
  // Dutch
  'van', 'de', 'den', 'der', 'het', 'ter', 'ten', 'op', 'in', "'t",
  // Portuguese / Spanish
  'da', 'das', 'do', 'dos', 'e',
  // French
  'du', 'la', 'le', 'les',
  // German
  'von', 'zu',
  // Italian
  'di', 'del', 'della', 'dei', 'degli', 'delle',
  // Arabic-origin
  'al', 'el',
]);

function capitalizeWord(word: string): string {
  if (word.length === 0) return word;

  // Handle apostrophes: O'Connor, D'Angelo
  const apostropheIndex = word.indexOf("'");
  if (apostropheIndex === 1) {
    return (
      word[0].toUpperCase() +
      "'" +
      word.slice(2, 3).toUpperCase() +
      word.slice(3).toLowerCase()
    );
  }

  // Handle Mc/Mac prefixes: McDonald, MacDonald
  const lower = word.toLowerCase();
  if (lower.startsWith('mc') && word.length > 2) {
    return 'Mc' + word[2].toUpperCase() + word.slice(3).toLowerCase();
  }
  if (lower.startsWith('mac') && word.length > 3 && word[3] !== word[3].toLowerCase()) {
    // Only apply Mac rule if original had a capital after Mac (avoid "Mace" → "MaCe")
    return 'Mac' + word[3].toUpperCase() + word.slice(4).toLowerCase();
  }

  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function formatName(name: string): string {
  if (!name) return name;

  const trimmed = name.trim().replace(/\s+/g, ' ');
  const words = trimmed.split(' ');

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();

      // First word is always capitalized
      if (index === 0) return capitalizeWord(word);

      // Known particles stay lowercase
      if (PARTICLES.has(lower)) return lower;

      return capitalizeWord(word);
    })
    .join(' ');
}
