import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'route-visit-counts';

// Map of common routes to their lazy import functions
const ROUTE_CHUNKS: Record<string, () => Promise<any>> = {
  '/home': () => import('@/pages/ClubHome'),
  '/jobs': () => import('@/pages/Jobs'),
  '/messages': () => import('@/pages/Messages'),
  '/profile': () => import('@/pages/EnhancedProfile'),
  '/settings': () => import('@/pages/Settings'),
  '/applications': () => import('@/pages/Applications'),
  '/meetings': () => import('@/pages/MeetingIntelligence'),
  '/tasks': () => import('@/pages/UnifiedTasks'),
  '/club-ai': () => import('@/pages/ClubAI'),
  '/feed': () => import('@/pages/Feed'),
  '/academy': () => import('@/pages/Academy'),
  '/documents': () => import('@/pages/DocumentManagement'),
  '/analytics': () => import('@/pages/Analytics'),
  '/club-pilot': () => import('@/pages/ClubPilot'),
};

function getVisitCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function recordVisit(path: string) {
  const counts = getVisitCounts();
  // Normalize: strip trailing slash, take base path
  const base = '/' + path.split('/').filter(Boolean)[0];
  counts[base] = (counts[base] || 0) + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch { /* quota exceeded — non-critical */ }
}

function getTopRoutes(n: number): string[] {
  const counts = getVisitCounts();
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([path]) => path);
}

const prefetched = new Set<string>();

/**
 * Prefetch a route's JS chunk. Safe to call multiple times — deduplicates.
 */
export function prefetchRoute(path: string) {
  const base = '/' + path.split('/').filter(Boolean)[0];
  if (prefetched.has(base)) return;
  const loader = ROUTE_CHUNKS[base];
  if (!loader) return;
  prefetched.add(base);
  // Use requestIdleCallback when available
  const schedule = 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 100);
  schedule(() => {
    loader().catch(() => {
      // Failed preload is fine — user will load on navigation
      prefetched.delete(base);
    });
  });
}

/**
 * Tracks route visits and preloads top 3 most-visited on home page.
 */
export function useRoutePrediction() {
  const location = useLocation();

  // Record every navigation
  useEffect(() => {
    recordVisit(location.pathname);
  }, [location.pathname]);

  // On home page, preload top 3
  useEffect(() => {
    if (location.pathname === '/home') {
      const top = getTopRoutes(3);
      top.forEach(prefetchRoute);
    }
  }, [location.pathname]);

  return { prefetchRoute: useCallback(prefetchRoute, []) };
}
