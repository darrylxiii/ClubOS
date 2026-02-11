export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: 'quantum_club' | 'google' | 'microsoft';
  provider?: string;
  calendar_label?: string;
  description?: string;
  location?: string;
  attendees?: string[];
  is_quantum_club: boolean;
  has_club_ai: boolean;
  meeting_id?: string;
  bot_session?: Record<string, unknown> | null;
  insights_available?: boolean;
  color: string;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft';
  calendar_label: string;
  is_active: boolean;
  last_synced_at?: string;
  event_count?: number;
}

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface CalendarFilters {
  quantum_club: boolean;
  google: boolean;
  microsoft: boolean;
}
