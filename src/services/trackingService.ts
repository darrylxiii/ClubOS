import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

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
  metadata?: Record<string, unknown>;
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
  elementInfo: Record<string, unknown>;
  count?: number;
}

interface SearchAnalytics {
  searchQuery: string;
  searchFilters?: Record<string, unknown>;
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
      const { error } = await supabase
        .from('user_session_events')
        .insert(batch);
      
      if (error) {
        console.error('[TrackingService] Failed to insert events:', error);
        console.error('[TrackingService] Failed batch sample:', JSON.stringify(batch[0], null, 2));
        // Re-add failed events to queue (with limit)
        if (this.eventQueue.length < 500) {
          this.eventQueue.unshift(...batch);
        }
      }
    } catch (error) {
      console.error('[TrackingService] Exception flushing events:', error);
      console.error('[TrackingService] Failed batch size:', batch.length);
    }
  }

  async trackDeviceInfo(deviceInfo: {
    deviceType: string;
    os: string;
    browser: string;
    screenWidth: number;
    screenHeight: number;
    timezone: string;
  }) {
    const userId = await this.getUserId();
    if (!userId) return;

    try {
      const { error } = await supabase.from('user_device_info').insert({
        user_id: userId,
        session_id: this.sessionId,
        device_type: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        screen_resolution: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
        timezone: deviceInfo.timezone,
      });

      if (error) {
        console.error('[TrackingService] Failed to track device info:', error);
      }
    } catch (error) {
      console.error('[TrackingService] Exception tracking device info:', error);
    }
  }

  async trackFeatureUsage(featureData: {
    featureName: string;
    featureCategory: string;
    actionType: string;
    completed: boolean;
    durationMs?: number;
  }) {
    const userId = await this.getUserId();
    if (!userId) return;

    try {
      const { error } = await supabase.from('user_feature_usage').insert({
        user_id: userId,
        session_id: this.sessionId,
        feature_name: featureData.featureName,
        feature_category: featureData.featureCategory,
        action_type: featureData.actionType,
        completed: featureData.completed,
        duration_ms: featureData.durationMs,
      });

      if (error) {
        console.error('[TrackingService] Failed to track feature usage:', error);
      }
    } catch (error) {
      console.error('[TrackingService] Exception tracking feature usage:', error);
    }
  }

  async trackAdminAction(actionData: {
    actionType: string;
    actionCategory: string;
    targetEntity: string;
    targetId?: string;
    reason?: string;
    impactScore?: number;
    oldValue?: any;
    newValue?: any;
  }) {
    const userId = await this.getUserId();
    if (!userId) return;

    try {
      const { error } = await supabase.from('admin_audit_activity').insert({
        admin_id: userId,
        action_type: actionData.actionType,
        action_category: actionData.actionCategory,
        target_entity: actionData.targetEntity,
        target_id: actionData.targetId,
        reason: actionData.reason,
        impact_score: actionData.impactScore || 5,
        old_value: actionData.oldValue,
        new_value: actionData.newValue,
      });

      if (error) {
        console.error('[TrackingService] Failed to track admin action:', error);
      }
    } catch (error) {
      console.error('[TrackingService] Exception tracking admin action:', error);
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

    try {
      // Build insert data with only required fields first
      const insertData: Record<string, unknown> = {
        user_id: userId,
        session_id: this.sessionId,
        page_path: entry.pagePath,
        entry_timestamp: new Date().toISOString(),
      };

      // Only add optional columns if they have values (handles missing columns gracefully)
      if (entry.referrer) insertData.referrer = entry.referrer;
      if (entry.viewportWidth) insertData.viewport_width = entry.viewportWidth;
      if (entry.viewportHeight) insertData.viewport_height = entry.viewportHeight;

      const { data, error } = await supabase
        .from('user_page_analytics')
        .insert(insertData as any)
        .select('id')
        .single();

      if (error) {
        // Log but don't throw - tracking failures shouldn't break the app
        logger.warn('Failed to track page entry (non-blocking)', { componentName: 'TrackingService', error: error.message });
      } else if (data) {
        this.currentPageAnalyticsId = data.id;
      }
    } catch (error) {
      // Silently fail - tracking errors should never break the app
      logger.warn('Exception tracking page entry (non-blocking)', { componentName: 'TrackingService', error });
    }
  }

  async trackPageExit(exit: PageExit) {
    if (!this.currentPageAnalyticsId) {
      this.currentPageAnalyticsId = null;
      return;
    }

    try {
      const { error } = await supabase
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

      if (error) {
        console.error('[TrackingService] Failed to track page exit:', error);
      }
    } catch (error) {
      console.error('[TrackingService] Exception tracking page exit:', error);
    } finally {
      this.currentPageAnalyticsId = null;
    }
  }

  async trackFrustrationSignal(signal: FrustrationSignal) {
    const userId = await this.getUserId();
    if (!userId) return;

    await supabase.from('user_frustration_signals').insert([{
      user_id: userId,
      session_id: this.sessionId,
      page_path: window.location.pathname,
      signal_type: signal.signalType,
      element_info: signal.elementInfo as unknown as Record<string, string>,
      count: signal.count || 1,
    }]);
  }

  async trackSearch(search: SearchAnalytics) {
    const userId = await this.getUserId();
    if (!userId) return;

    await supabase.from('user_search_analytics').insert([{
      user_id: userId,
      session_id: this.sessionId,
      search_query: search.searchQuery,
      search_filters: (search.searchFilters || {}) as unknown as Record<string, string>,
      results_count: search.resultsCount,
      clicked_result_position: search.clickedResultPosition,
      time_to_first_click_ms: search.timeToFirstClick,
      search_category: search.searchCategory,
    }]);
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
