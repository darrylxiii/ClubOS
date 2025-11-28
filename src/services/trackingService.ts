import { supabase } from '@/integrations/supabase/client';

interface TrackingEvent {
  eventType: string;
  elementId?: string;
  elementClass?: string;
  elementTag?: string;
  elementText?: string;
  xCoordinate?: number;
  yCoordinate?: number;
  scrollDepthPercent?: number;
  scrollDirection?: string;
  timeOnElementMs?: number;
  metadata?: Record<string, any>;
}

interface PageEntry {
  pagePath: string;
  referrer: string;
  viewportWidth: number;
  viewportHeight: number;
}

interface PageExit {
  pagePath: string;
  timeOnPage: number;
  scrollDepthMax: number;
  exitType: string;
}

interface FrustrationSignal {
  signalType: 'rage_click' | 'dead_click' | 'error_encountered' | 'slow_network' | 'form_error' | 'repeated_action';
  elementInfo: Record<string, any>;
  count?: number;
}

interface SearchAnalytics {
  searchQuery: string;
  searchFilters?: Record<string, any>;
  resultsCount: number;
  searchCategory: 'jobs' | 'candidates' | 'companies' | 'global' | 'knowledge';
  clickedResultPosition?: number;
  timeToFirstClick?: number;
}

interface JourneyStep {
  journeyId: string;
  stepNumber: number;
  stepName: string;
  fromPage?: string;
  toPage?: string;
  actionTaken?: string;
  actionTarget?: string;
  timeToAction?: number;
  conversionEvent?: boolean;
}

class TrackingService {
  private sessionId: string;
  private eventQueue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private currentPageAnalyticsId: string | null = null;
  private pageStartTime: number = Date.now();
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startBatchFlushing();
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tracking_session_id', sessionId);
    }
    return sessionId;
  }

  private async getUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  private startBatchFlushing() {
    this.flushInterval = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flush() {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
    
    try {
      await supabase.from('user_session_events').insert(batch);
    } catch (error) {
      console.error('Failed to flush tracking events:', error);
      // Re-queue failed events (with a limit to prevent infinite growth)
      if (this.eventQueue.length < 500) {
        this.eventQueue.unshift(...batch);
      }
    }
  }

  private async queueEvent(event: Partial<TrackingEvent>) {
    const userId = await this.getUserId();
    if (!userId) return;

    const fullEvent = {
      user_id: userId,
      session_id: this.sessionId,
      event_timestamp: new Date().toISOString(),
      page_path: window.location.pathname,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      event_type: event.eventType,
      element_id: event.elementId,
      element_class: event.elementClass,
      element_tag: event.elementTag,
      element_text: event.elementText,
      x_coordinate: event.xCoordinate,
      y_coordinate: event.yCoordinate,
      scroll_depth_percent: event.scrollDepthPercent,
      scroll_direction: event.scrollDirection,
      time_on_element_ms: event.timeOnElementMs,
      metadata: event.metadata || {},
    };

    this.eventQueue.push(fullEvent);

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  async trackEvent(event: TrackingEvent) {
    await this.queueEvent(event);
  }

  async trackPageEntry(entry: PageEntry) {
    const userId = await this.getUserId();
    if (!userId) return;

    this.pageStartTime = Date.now();

    const { data, error } = await supabase
      .from('user_page_analytics')
      .insert({
        user_id: userId,
        session_id: this.sessionId,
        page_path: entry.pagePath,
        entry_timestamp: new Date().toISOString(),
        viewport_width: entry.viewportWidth,
        viewport_height: entry.viewportHeight,
      })
      .select('id')
      .single();

    if (!error && data) {
      this.currentPageAnalyticsId = data.id;
    }
  }

  async trackPageExit(exit: PageExit) {
    if (!this.currentPageAnalyticsId) return;

    await supabase
      .from('user_page_analytics')
      .update({
        exit_timestamp: new Date().toISOString(),
        time_on_page_seconds: exit.timeOnPage,
        scroll_depth_max: exit.scrollDepthMax,
        exit_type: exit.exitType,
        engaged: exit.timeOnPage > 30 && exit.scrollDepthMax > 50,
        bounce: exit.timeOnPage < 5 && exit.scrollDepthMax < 25,
      })
      .eq('id', this.currentPageAnalyticsId);

    this.currentPageAnalyticsId = null;
  }

  async trackFrustrationSignal(signal: FrustrationSignal) {
    const userId = await this.getUserId();
    if (!userId) return;

    await supabase.from('user_frustration_signals').insert({
      user_id: userId,
      session_id: this.sessionId,
      page_path: window.location.pathname,
      signal_type: signal.signalType,
      element_info: signal.elementInfo,
      count: signal.count || 1,
    });
  }

  async trackSearch(search: SearchAnalytics) {
    const userId = await this.getUserId();
    if (!userId) return;

    await supabase.from('user_search_analytics').insert({
      user_id: userId,
      session_id: this.sessionId,
      search_query: search.searchQuery,
      search_filters: search.searchFilters || {},
      results_count: search.resultsCount,
      clicked_result_position: search.clickedResultPosition,
      time_to_first_click_ms: search.timeToFirstClick,
      search_category: search.searchCategory,
    });
  }

  async trackJourneyStep(step: JourneyStep) {
    const userId = await this.getUserId();
    if (!userId) return;

    await supabase.from('user_journey_tracking').insert({
      user_id: userId,
      session_id: this.sessionId,
      journey_id: step.journeyId,
      step_number: step.stepNumber,
      step_name: step.stepName,
      from_page: step.fromPage,
      to_page: step.toPage,
      action_taken: step.actionTaken,
      action_target: step.actionTarget,
      time_to_action_ms: step.timeToAction,
      conversion_event: step.conversionEvent || false,
    });
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const trackingService = new TrackingService();
