/**
 * Navigation Tracer Component
 * Must be used inside BrowserRouter to enable navigation tracing
 */

import { useNavigationTracing } from '@/lib/tracing/useNavigationTracing';

export function NavigationTracer(): null {
  useNavigationTracing();
  return null;
}
