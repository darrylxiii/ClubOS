/**
 * Debug Mode React Hook
 * Provides reactive debug configuration in components
 */

import { useState, useEffect, useCallback, ComponentType, createElement } from 'react';
import { debugMode, type DebugConfig } from './debugMode';

export function useDebugMode() {
  const [config, setConfig] = useState<DebugConfig>(() => debugMode.getConfig());
  const [logs, setLogs] = useState(() => debugMode.getLogs());

  useEffect(() => {
    const unsubscribe = debugMode.onChange((newConfig) => {
      setConfig(newConfig);
    });
    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<DebugConfig>) => {
    debugMode.setConfig(updates);
  }, []);

  const toggle = useCallback(() => {
    return debugMode.toggle();
  }, []);

  const refreshLogs = useCallback((filter?: Parameters<typeof debugMode.getLogs>[0]) => {
    setLogs(debugMode.getLogs(filter));
  }, []);

  const clearLogs = useCallback(() => {
    debugMode.clearLogs();
    setLogs([]);
  }, []);

  return {
    config,
    isEnabled: config.enabled,
    logs,
    updateConfig,
    toggle,
    refreshLogs,
    clearLogs,
    // Direct access to debug utilities
    log: debugMode.log.bind(debugMode),
    warn: debugMode.warn.bind(debugMode),
    error: debugMode.error.bind(debugMode),
    time: debugMode.time.bind(debugMode),
  };
}

// HOC for adding debug info to components
export function withDebugInfo<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  return function DebugWrapper(props: P) {
    useEffect(() => {
      debugMode.log('Component', `${componentName} mounted`);
      return () => {
        debugMode.log('Component', `${componentName} unmounted`);
      };
    }, []);

    return createElement(WrappedComponent, props);
  };
}
