/**
 * Bundle Analysis Utilities
 * Runtime bundle size tracking and optimization insights
 */

export interface BundleStats {
  totalSize: number;
  gzipSize: number;
  chunks: ChunkInfo[];
  timestamp: number;
}

export interface ChunkInfo {
  name: string;
  size: number;
  isAsync: boolean;
  modules: string[];
}

export interface ResourceTiming {
  name: string;
  size: number;
  duration: number;
  protocol: string;
  cacheHit: boolean;
  resourceType: string;
}

/**
 * Collect resource timing data for all loaded resources
 */
export function collectResourceTimings(): ResourceTiming[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return resources.map((entry) => ({
    name: entry.name,
    size: entry.transferSize || 0,
    duration: entry.duration,
    protocol: entry.nextHopProtocol || 'unknown',
    cacheHit: entry.transferSize === 0 && entry.decodedBodySize > 0,
    resourceType: getResourceType(entry.initiatorType, entry.name),
  }));
}

function getResourceType(initiatorType: string, name: string): string {
  if (initiatorType === 'script' || name.endsWith('.js')) return 'script';
  if (initiatorType === 'css' || name.endsWith('.css')) return 'stylesheet';
  if (initiatorType === 'img' || /\.(png|jpg|jpeg|gif|webp|svg)/.test(name)) return 'image';
  if (initiatorType === 'font' || /\.(woff2?|ttf|otf|eot)/.test(name)) return 'font';
  if (initiatorType === 'fetch' || initiatorType === 'xmlhttprequest') return 'api';
  return initiatorType || 'other';
}

/**
 * Get JavaScript bundle statistics
 */
export function getJSBundleStats(): {
  totalSize: number;
  chunksCount: number;
  avgChunkSize: number;
  largestChunk: ResourceTiming | null;
  cacheHitRate: number;
} {
  const resources = collectResourceTimings();
  const jsResources = resources.filter((r) => r.resourceType === 'script');

  const totalSize = jsResources.reduce((acc, r) => acc + r.size, 0);
  const cachedCount = jsResources.filter((r) => r.cacheHit).length;
  const largestChunk = jsResources.reduce<ResourceTiming | null>(
    (max, r) => (!max || r.size > max.size ? r : max),
    null
  );

  return {
    totalSize,
    chunksCount: jsResources.length,
    avgChunkSize: jsResources.length > 0 ? totalSize / jsResources.length : 0,
    largestChunk,
    cacheHitRate: jsResources.length > 0 ? cachedCount / jsResources.length : 0,
  };
}

/**
 * Analyze resource loading waterfall
 */
export function analyzeLoadingWaterfall(): {
  criticalPath: ResourceTiming[];
  blockingResources: ResourceTiming[];
  recommendations: string[];
} {
  const resources = collectResourceTimings();
  const recommendations: string[] = [];

  // Find blocking resources (scripts and stylesheets loaded before DOMContentLoaded)
  const blockingResources = resources.filter(
    (r) =>
      (r.resourceType === 'script' || r.resourceType === 'stylesheet') &&
      r.duration > 100
  );

  // Find critical path (longest chain)
  const sortedByDuration = [...resources].sort((a, b) => b.duration - a.duration);
  const criticalPath = sortedByDuration.slice(0, 5);

  // Generate recommendations
  if (blockingResources.length > 3) {
    recommendations.push(
      `Consider deferring ${blockingResources.length - 3} render-blocking scripts`
    );
  }

  const uncachedLargeResources = resources.filter(
    (r) => !r.cacheHit && r.size > 50000
  );
  if (uncachedLargeResources.length > 0) {
    recommendations.push(
      `${uncachedLargeResources.length} large resources are not being cached`
    );
  }

  const http1Resources = resources.filter((r) => r.protocol === 'http/1.1');
  if (http1Resources.length > 0) {
    recommendations.push(
      `${http1Resources.length} resources are served over HTTP/1.1 - consider HTTP/2`
    );
  }

  return {
    criticalPath,
    blockingResources,
    recommendations,
  };
}

/**
 * Track dynamic imports and code splitting effectiveness
 */
export function trackDynamicImport(
  chunkName: string,
  startTime: number
): { duration: number; size: number } | null {
  const endTime = performance.now();
  const duration = endTime - startTime;

  // Find the chunk in resource timings
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const chunk = resources.find(
    (r) => r.name.includes(chunkName) && r.startTime >= startTime - 100
  );

  if (chunk) {
    console.debug(
      `[BundleAnalysis] Dynamic import "${chunkName}": ${duration.toFixed(0)}ms, ` +
        `${(chunk.transferSize / 1024).toFixed(1)}KB`
    );

    return {
      duration,
      size: chunk.transferSize,
    };
  }

  return null;
}
