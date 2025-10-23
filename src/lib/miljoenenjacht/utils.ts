export function formatCurrency(amount: number): string {
  if (amount < 1) {
    return `€${amount.toFixed(2)}`;
  }
  if (amount < 1000) {
    return `€${Math.floor(amount)}`;
  }
  if (amount < 1000000) {
    return `€${(amount / 1000).toFixed(0)}K`;
  }
  return `€${(amount / 1000000).toFixed(1)}M`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
