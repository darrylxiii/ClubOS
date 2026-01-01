import { useState, useEffect, useCallback, useRef } from 'react';

interface MemoryStats {
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  usagePercentage: number;
}

interface CacheEntry<T> {
  data: T;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

interface UseMemoryManagerOptions {
  maxCacheSize?: number;
  cleanupThreshold?: number;
  cleanupInterval?: number;
  onLowMemory?: () => void;
}

export function useMemoryManager<T = unknown>(options: UseMemoryManagerOptions = {}) {
  const {
    maxCacheSize = 50 * 1024 * 1024, // 50MB
    cleanupThreshold = 85,
    cleanupInterval = 30000,
    onLowMemory
  } = options;

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    usedHeap: 0,
    totalHeap: 0,
    heapLimit: 0,
    usagePercentage: 0
  });

  const [cacheSize, setCacheSize] = useState(0);
  const [isLowMemory, setIsLowMemory] = useState(false);

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const cleanupInProgressRef = useRef(false);

  // Update memory stats
  const updateMemoryStats = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const stats: MemoryStats = {
        usedHeap: memory.usedJSHeapSize,
        totalHeap: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      setMemoryStats(stats);

      const lowMemory = stats.usagePercentage > cleanupThreshold;
      if (lowMemory && !isLowMemory) {
        setIsLowMemory(true);
        onLowMemory?.();
      } else if (!lowMemory && isLowMemory) {
        setIsLowMemory(false);
      }

      return stats;
    }
    return memoryStats;
  }, [cleanupThreshold, isLowMemory, onLowMemory, memoryStats]);

  // Calculate entry size
  const calculateSize = useCallback((data: T): number => {
    try {
      const str = JSON.stringify(data);
      return new Blob([str]).size;
    } catch {
      return 1024; // Default estimate
    }
  }, []);

  // Add to cache
  const addToCache = useCallback((key: string, data: T): boolean => {
    const size = calculateSize(data);

    // Check if we need to make room
    if (cacheSize + size > maxCacheSize) {
      // Try to cleanup
      const freed = performCleanup(size);
      if (cacheSize + size - freed > maxCacheSize) {
        console.warn('[MemoryManager] Cache full, cannot add entry');
        return false;
      }
    }

    const entry: CacheEntry<T> = {
      data,
      size,
      lastAccessed: Date.now(),
      accessCount: 1
    };

    const existing = cacheRef.current.get(key);
    if (existing) {
      setCacheSize(prev => prev - existing.size + size);
    } else {
      setCacheSize(prev => prev + size);
    }

    cacheRef.current.set(key, entry);
    return true;
  }, [cacheSize, maxCacheSize, calculateSize]);

  // Get from cache
  const getFromCache = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.data;
  }, []);

  // Remove from cache
  const removeFromCache = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return false;

    cacheRef.current.delete(key);
    setCacheSize(prev => prev - entry.size);
    return true;
  }, []);

  // Perform cleanup
  const performCleanup = useCallback((requiredSpace: number = 0): number => {
    if (cleanupInProgressRef.current) return 0;
    cleanupInProgressRef.current = true;

    let freedSpace = 0;
    const now = Date.now();

    // Sort entries by LRU (least recently used) and LFU (least frequently used)
    const entries = Array.from(cacheRef.current.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        score: calculateEvictionScore(entry, now)
      }))
      .sort((a, b) => b.score - a.score); // Higher score = more likely to evict

    // Evict until we have enough space or reach cleanup threshold
    const targetSize = requiredSpace > 0 
      ? maxCacheSize - requiredSpace
      : maxCacheSize * 0.7;

    for (const { key, entry } of entries) {
      if (cacheSize - freedSpace <= targetSize) break;

      cacheRef.current.delete(key);
      freedSpace += entry.size;
    }

    setCacheSize(prev => prev - freedSpace);
    cleanupInProgressRef.current = false;

    console.log(`[MemoryManager] Cleanup freed ${(freedSpace / 1024).toFixed(2)} KB`);
    return freedSpace;

    function calculateEvictionScore(entry: CacheEntry<T>, currentTime: number): number {
      const age = (currentTime - entry.lastAccessed) / 1000 / 60; // Minutes
      const frequency = entry.accessCount;
      const size = entry.size / 1024; // KB

      // Higher score = more likely to evict
      // Older, less accessed, larger entries get higher scores
      return (age * 2) + (1 / frequency) + (size * 0.1);
    }
  }, [cacheSize, maxCacheSize]);

  // Clear entire cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    setCacheSize(0);
    console.log('[MemoryManager] Cache cleared');
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    const entries = Array.from(cacheRef.current.entries());
    const now = Date.now();

    return {
      entryCount: entries.length,
      totalSize: cacheSize,
      maxSize: maxCacheSize,
      usagePercentage: (cacheSize / maxCacheSize) * 100,
      oldestEntry: entries.reduce((oldest, [, entry]) => 
        !oldest || entry.lastAccessed < oldest.lastAccessed ? entry : oldest
      , null as CacheEntry<T> | null),
      newestEntry: entries.reduce((newest, [, entry]) =>
        !newest || entry.lastAccessed > newest.lastAccessed ? entry : newest
      , null as CacheEntry<T> | null),
      averageAge: entries.length > 0
        ? entries.reduce((sum, [, entry]) => sum + (now - entry.lastAccessed), 0) / entries.length / 1000
        : 0,
      averageAccessCount: entries.length > 0
        ? entries.reduce((sum, [, entry]) => sum + entry.accessCount, 0) / entries.length
        : 0
    };
  }, [cacheSize, maxCacheSize]);

  // Request garbage collection (if available)
  const requestGC = useCallback(() => {
    if ('gc' in globalThis && typeof (globalThis as { gc?: () => void }).gc === 'function') {
      (globalThis as { gc: () => void }).gc();
      console.log('[MemoryManager] Manual GC requested');
    }
  }, []);

  // Dispose of media resources
  const disposeMediaResources = useCallback((resources: {
    streams?: MediaStream[];
    tracks?: MediaStreamTrack[];
    elements?: HTMLMediaElement[];
  }) => {
    const { streams = [], tracks = [], elements = [] } = resources;

    // Stop all tracks
    for (const stream of streams) {
      stream.getTracks().forEach(track => track.stop());
    }

    for (const track of tracks) {
      track.stop();
    }

    // Clean up media elements
    for (const element of elements) {
      element.pause();
      element.src = '';
      element.srcObject = null;
      element.load();
    }

    console.log(`[MemoryManager] Disposed ${streams.length} streams, ${tracks.length} tracks, ${elements.length} elements`);
  }, []);

  // Monitor memory periodically
  useEffect(() => {
    const interval = setInterval(updateMemoryStats, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryStats]);

  // Cleanup interval
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = updateMemoryStats();
      if (stats.usagePercentage > cleanupThreshold) {
        performCleanup();
      }
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [updateMemoryStats, cleanupThreshold, cleanupInterval, performCleanup]);

  return {
    memoryStats,
    cacheSize,
    isLowMemory,
    addToCache,
    getFromCache,
    removeFromCache,
    clearCache,
    performCleanup,
    getCacheStats,
    requestGC,
    disposeMediaResources,
    updateMemoryStats
  };
}
