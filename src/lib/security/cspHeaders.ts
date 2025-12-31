/**
 * Security Headers & CSP Management
 * Content Security Policy and security header utilities
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'object-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface SecurityHeaders {
  csp: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
}

// Default CSP for The Quantum Club
const DEFAULT_CSP_DIRECTIVES: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.google.com', 'https://www.gstatic.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://api.openai.com'],
  'frame-src': ["'self'", 'https://www.google.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': true,
};

export function buildCSPHeader(directives: CSPDirectives = DEFAULT_CSP_DIRECTIVES): string {
  const parts: string[] = [];

  Object.entries(directives).forEach(([key, value]) => {
    if (value === true) {
      parts.push(key);
    } else if (value === false) {
      // Skip
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  });

  return parts.join('; ');
}

export function getSecurityHeaders(customCSP?: Partial<CSPDirectives>): SecurityHeaders {
  const cspDirectives = customCSP 
    ? { ...DEFAULT_CSP_DIRECTIVES, ...customCSP }
    : DEFAULT_CSP_DIRECTIVES;

  return {
    csp: buildCSPHeader(cspDirectives),
    xFrameOptions: 'SAMEORIGIN',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(self), payment=()',
  };
}

// Validate CSP violations (for reporting)
export interface CSPViolation {
  documentUri: string;
  violatedDirective: string;
  blockedUri: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: number;
}

class CSPViolationTracker {
  private violations: CSPViolation[] = [];
  private maxViolations = 100;

  constructor() {
    this.setupListener();
  }

  private setupListener(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('securitypolicyviolation', (e) => {
      const violation: CSPViolation = {
        documentUri: e.documentURI,
        violatedDirective: e.violatedDirective,
        blockedUri: e.blockedURI,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
        columnNumber: e.columnNumber,
        timestamp: Date.now(),
      };

      this.recordViolation(violation);
    });
  }

  private recordViolation(violation: CSPViolation): void {
    console.warn('[CSP Violation]', violation);

    this.violations.push(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-this.maxViolations);
    }
  }

  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }
}

export const cspViolationTracker = new CSPViolationTracker();
