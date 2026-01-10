/**
 * Full Engineering Framework - Master Index
 * 
 * IMPORTANT: To reduce build memory usage, import directly from specific modules:
 * - import { ... } from '@/lib/tracing'
 * - import { ... } from '@/lib/resilience'
 * - import { ... } from '@/lib/performance'
 * - import { ... } from '@/lib/featureFlags'
 * - import { ... } from '@/lib/debug'
 * - import { ... } from '@/lib/security'
 * 
 * This barrel export is intentionally minimal to prevent OOM during builds.
 */

// Only export the most commonly used utilities
// Other modules should be imported directly from their source files

// Core resilience utilities
export { CircuitBreaker } from '../resilience';

// Core observability
export { logger } from '../logger';
