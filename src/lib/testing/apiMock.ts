/**
 * API Mocking System for Development & Testing
 * Enables consistent testing without hitting real endpoints
 */

export interface MockResponse<T = unknown> {
  data: T;
  status: number;
  headers?: Record<string, string>;
  delay?: number; // Simulate network latency
}

export interface MockHandler<T = unknown> {
  pattern: string | RegExp;
  method?: string;
  response: MockResponse<T> | ((req: MockRequest) => MockResponse<T> | Promise<MockResponse<T>>);
  times?: number; // Number of times to respond before removing
}

export interface MockRequest {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
}

class ApiMockService {
  private handlers: MockHandler[] = [];
  private enabled = false;
  private originalFetch: typeof fetch | null = null;
  private callLog: { request: MockRequest; response: MockResponse; timestamp: number }[] = [];
  private maxLogSize = 100;

  enable(): void {
    if (this.enabled) return;
    
    this.originalFetch = window.fetch;
    window.fetch = this.interceptedFetch.bind(this);
    this.enabled = true;
    
    console.log('%c[ApiMock] Mocking enabled', 'color: #ff9800; font-weight: bold;');
  }

  disable(): void {
    if (!this.enabled || !this.originalFetch) return;
    
    window.fetch = this.originalFetch;
    this.originalFetch = null;
    this.enabled = false;
    
    console.log('%c[ApiMock] Mocking disabled', 'color: #4CAF50;');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  mock<T>(handler: MockHandler<T>): () => void {
    this.handlers.push(handler as MockHandler);
    return () => this.removeMock(handler as MockHandler);
  }

  mockOnce<T>(pattern: string | RegExp, response: MockResponse<T>, method?: string): void {
    this.mock({ pattern, response, method, times: 1 });
  }

  removeMock(handler: MockHandler): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  clearMocks(): void {
    this.handlers = [];
  }

  private async interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    
    const request: MockRequest = {
      url,
      method,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    };

    // Find matching handler
    const handler = this.findHandler(url, method);

    if (handler) {
      const mockResponse = await this.getResponse(handler, request);
      
      // Log the call
      this.logCall(request, mockResponse);

      // Apply delay if specified
      if (mockResponse.delay) {
        await new Promise((resolve) => setTimeout(resolve, mockResponse.delay));
      }

      // Decrement times if set
      if (handler.times !== undefined) {
        handler.times--;
        if (handler.times <= 0) {
          this.removeMock(handler);
        }
      }

      // Create mock Response
      return new Response(JSON.stringify(mockResponse.data), {
        status: mockResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...mockResponse.headers,
        },
      });
    }

    // No mock found, use original fetch
    if (this.originalFetch) {
      return this.originalFetch(input, init);
    }

    throw new Error('[ApiMock] No original fetch available');
  }

  private findHandler(url: string, method: string): MockHandler | undefined {
    return this.handlers.find((handler) => {
      // Check method
      if (handler.method && handler.method.toUpperCase() !== method.toUpperCase()) {
        return false;
      }

      // Check pattern
      if (typeof handler.pattern === 'string') {
        return url.includes(handler.pattern);
      }
      return handler.pattern.test(url);
    });
  }

  private async getResponse(handler: MockHandler, request: MockRequest): Promise<MockResponse> {
    if (typeof handler.response === 'function') {
      return handler.response(request);
    }
    return handler.response;
  }

  private logCall(request: MockRequest, response: MockResponse): void {
    this.callLog.push({
      request,
      response,
      timestamp: Date.now(),
    });

    if (this.callLog.length > this.maxLogSize) {
      this.callLog = this.callLog.slice(-this.maxLogSize);
    }

    console.log(
      `%c[ApiMock] ${request.method} ${request.url} → ${response.status}`,
      'color: #2196F3;'
    );
  }

  getCallLog(): typeof this.callLog {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  // Convenience methods for common patterns
  mockGet<T>(pattern: string | RegExp, data: T, status = 200): () => void {
    return this.mock({ pattern, method: 'GET', response: { data, status } });
  }

  mockPost<T>(pattern: string | RegExp, data: T, status = 201): () => void {
    return this.mock({ pattern, method: 'POST', response: { data, status } });
  }

  mockError(pattern: string | RegExp, status = 500, message = 'Internal Server Error'): () => void {
    return this.mock({
      pattern,
      response: { data: { error: message }, status },
    });
  }

  mockDelay(pattern: string | RegExp, delayMs: number): () => void {
    return this.mock({
      pattern,
      response: { data: null, status: 200, delay: delayMs },
    });
  }
}

export const apiMock = new ApiMockService();
