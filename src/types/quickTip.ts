export type TipCategory = 'career' | 'interview' | 'platform' | 'insights' | 'success';

export interface QuickTip {
  id: string;
  category: TipCategory;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  actionLabel?: string;
  actionLink?: string;
  readTime: string;
  gradient: string; // Category-specific gradient
}
