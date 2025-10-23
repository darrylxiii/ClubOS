// Utility functions for job-related calculations and styling

export const getDaysOpenColor = (days: number): string => {
  if (days <= 30) return 'text-green-400';
  if (days <= 60) return 'text-yellow-400';
  return 'text-red-400';
};

export const getDaysOpenBgColor = (days: number): string => {
  if (days <= 30) return 'bg-green-400/10 border-green-400/20';
  if (days <= 60) return 'bg-yellow-400/10 border-yellow-400/20';
  return 'bg-red-400/10 border-red-400/20';
};

export const getDaysOpenStatus = (days: number): 'excellent' | 'good' | 'attention' => {
  if (days <= 30) return 'excellent';
  if (days <= 60) return 'good';
  return 'attention';
};

export const calculateDaysSince = (date: string): number => {
  return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

export const formatLastActivity = (date: string | null): string => {
  if (!date) return 'No activity';
  
  const days = calculateDaysSince(date);
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const getConversionColor = (rate: number | null): string => {
  if (rate === null) return 'text-white';
  if (rate >= 20) return 'text-green-400';
  if (rate >= 10) return 'text-yellow-400';
  return 'text-red-400';
};

export const calculateFillRate = (jobs: any[]): number => {
  const totalJobs = jobs.length;
  if (totalJobs === 0) return 0;
  
  const filledJobs = jobs.filter(j => j.status === 'closed' || j.conversion_rate > 0).length;
  return Math.round((filledJobs / totalJobs) * 100);
};

export const calculateAvgDaysOpen = (jobs: any[]): number => {
  if (jobs.length === 0) return 0;
  
  const totalDays = jobs.reduce((sum, job) => sum + job.days_since_opened, 0);
  return Math.round(totalDays / jobs.length);
};
