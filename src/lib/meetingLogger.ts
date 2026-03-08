/**
 * Meeting Logger — Production-safe logging for meeting subsystems.
 * Only logs in development or when debug mode is explicitly enabled.
 */

const isDev = import.meta.env.DEV;

function shouldLog(): boolean {
  if (isDev) return true;
  try {
    const config = localStorage.getItem('debug_mode_config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.enabled === true;
    }
  } catch {
    // ignore
  }
  return false;
}

export const meetingLogger = {
  debug(tag: string, message: string, ...args: unknown[]) {
    if (shouldLog()) {
      console.log(`[${tag}]`, message, ...args);
    }
  },
  warn(tag: string, message: string, ...args: unknown[]) {
    if (shouldLog()) {
      console.warn(`[${tag}]`, message, ...args);
    }
  },
  error(tag: string, message: string, ...args: unknown[]) {
    // Errors always log
    console.error(`[${tag}]`, message, ...args);
  },
};
