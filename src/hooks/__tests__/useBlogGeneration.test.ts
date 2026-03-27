import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBlogGeneration } from '../useBlogGeneration';
import { supabase } from '@/integrations/supabase/client';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Store original fetch
const originalFetch = globalThis.fetch;

describe('useBlogGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBlogGeneration());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isSuggesting).toBe(false);
      expect(result.current.suggestions).toEqual([]);
    });

    it('should expose all expected functions', () => {
      const { result } = renderHook(() => useBlogGeneration());

      expect(typeof result.current.addToQueue).toBe('function');
      expect(typeof result.current.generateFromQueue).toBe('function');
      expect(typeof result.current.getSuggestions).toBe('function');
      expect(typeof result.current.fetchQueue).toBe('function');
      expect(typeof result.current.updatePriority).toBe('function');
      expect(typeof result.current.deleteFromQueue).toBe('function');
    });
  });

  describe('addToQueue', () => {
    it('should insert a topic into the blog_generation_queue', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'queue-item-1' },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockInsertChain as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let queueId: string | null = null;
      await act(async () => {
        queueId = await result.current.addToQueue(
          'AI in Recruiting',
          'technology',
          ['AI', 'recruiting'],
          8,
          'market-analysis'
        );
      });

      expect(supabase.from).toHaveBeenCalledWith('blog_generation_queue');
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'AI in Recruiting',
          category: 'technology',
          target_keywords: ['AI', 'recruiting'],
          priority: 8,
          content_format: 'market-analysis',
          source: 'user',
          status: 'pending',
        })
      );
      expect(queueId).toBe('queue-item-1');
    });

    it('should use default priority of 5 and null for optional fields', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'queue-item-2' },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockInsertChain as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      await act(async () => {
        await result.current.addToQueue('Simple Topic', 'general');
      });

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Simple Topic',
          category: 'general',
          target_keywords: null,
          priority: 5,
          content_format: null,
          source: 'user',
          status: 'pending',
        })
      );
    });

    it('should return null on insert error', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockInsertChain as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let queueId: string | null = 'should-be-null';
      await act(async () => {
        queueId = await result.current.addToQueue('Topic', 'category');
      });

      expect(queueId).toBeNull();
    });
  });

  describe('generateFromQueue', () => {
    const mockQueueItem = {
      id: 'queue-1',
      topic: 'AI Hiring Trends',
      category: 'technology',
      target_keywords: ['AI', 'hiring'],
      priority: 5,
      source: 'user',
      status: 'pending',
      content_format: 'trend-report' as const,
      generated_post_id: null,
      error_message: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('should set isGenerating during generation', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(globalThis.fetch).mockReturnValue(fetchPromise as unknown as Promise<Response>);

      const { result } = renderHook(() => useBlogGeneration());

      expect(result.current.isGenerating).toBe(false);

      // Start generation but don't resolve yet
      let generationPromise: Promise<{ success: boolean; postId?: string; title?: string; slug?: string; error?: string }>;
      act(() => {
        generationPromise = result.current.generateFromQueue(mockQueueItem);
      });

      // isGenerating should be true while waiting
      expect(result.current.isGenerating).toBe(true);

      // Resolve the fetch
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ title: 'Generated Article', postId: 'post-1', slug: 'ai-hiring-trends' }),
        });
        await generationPromise!;
      });

      expect(result.current.isGenerating).toBe(false);
    });

    it('should return success result on successful generation', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'AI Hiring Trends 2026',
          postId: 'post-1',
          slug: 'ai-hiring-trends-2026',
        }),
      } as Response);

      const { result } = renderHook(() => useBlogGeneration());

      let generationResult: { success: boolean; postId?: string; title?: string; slug?: string; error?: string };
      await act(async () => {
        generationResult = await result.current.generateFromQueue(mockQueueItem);
      });

      expect(generationResult.success).toBe(true);
      expect(generationResult.title).toBe('AI Hiring Trends 2026');
      expect(generationResult.postId).toBe('post-1');
    });

    it('should send correct request body to the edge function', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: 'Test', postId: 'p-1' }),
      } as Response);

      const { result } = renderHook(() => useBlogGeneration());

      await act(async () => {
        await result.current.generateFromQueue(mockQueueItem);
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/blog-generate'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            queueId: 'queue-1',
            topic: 'AI Hiring Trends',
            category: 'technology',
            targetKeywords: ['AI', 'hiring'],
            contentFormat: 'trend-report',
          }),
        })
      );
    });

    it('should return failure result on API error', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      } as Response);

      const { result } = renderHook(() => useBlogGeneration());

      let generationResult: { success: boolean; postId?: string; title?: string; slug?: string; error?: string };
      await act(async () => {
        generationResult = await result.current.generateFromQueue(mockQueueItem);
      });

      expect(generationResult.success).toBe(false);
      expect(generationResult.error).toBe('Rate limit exceeded');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle network fetch failure', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network unreachable'));

      const { result } = renderHook(() => useBlogGeneration());

      let generationResult: { success: boolean; postId?: string; title?: string; slug?: string; error?: string };
      await act(async () => {
        generationResult = await result.current.generateFromQueue(mockQueueItem);
      });

      expect(generationResult.success).toBe(false);
      expect(generationResult.error).toBe('Network unreachable');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle non-Error thrown values', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue('string error');

      const { result } = renderHook(() => useBlogGeneration());

      let generationResult: { success: boolean; postId?: string; title?: string; slug?: string; error?: string };
      await act(async () => {
        generationResult = await result.current.generateFromQueue(mockQueueItem);
      });

      expect(generationResult.success).toBe(false);
      expect(generationResult.error).toBe('Unknown error');
    });
  });

  describe('getSuggestions', () => {
    it('should fetch suggestions and store them in state', async () => {
      const mockSuggestions = [
        { topic: 'Topic 1', category: 'tech', format: 'trend-report', targetKeywords: ['AI'], priority: 7, reasoning: 'Hot topic' },
        { topic: 'Topic 2', category: 'career', format: 'career-playbook', targetKeywords: ['career'], priority: 5, reasoning: 'Popular' },
      ];

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      } as Response);

      const { result } = renderHook(() => useBlogGeneration());

      await act(async () => {
        const suggestions = await result.current.getSuggestions();
        expect(suggestions).toHaveLength(2);
      });

      expect(result.current.suggestions).toHaveLength(2);
      expect(result.current.suggestions[0].topic).toBe('Topic 1');
    });

    it('should set isSuggesting during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(globalThis.fetch).mockReturnValue(fetchPromise as unknown as Promise<Response>);

      const { result } = renderHook(() => useBlogGeneration());

      let suggestPromise: Promise<unknown[]>;
      act(() => {
        suggestPromise = result.current.getSuggestions();
      });

      expect(result.current.isSuggesting).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ suggestions: [] }),
        });
        await suggestPromise!;
      });

      expect(result.current.isSuggesting).toBe(false);
    });

    it('should return empty array on API error', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Service unavailable' }),
      } as Response);

      const { result } = renderHook(() => useBlogGeneration());

      let suggestions: unknown[];
      await act(async () => {
        suggestions = await result.current.getSuggestions();
      });

      expect(suggestions!).toEqual([]);
      expect(result.current.isSuggesting).toBe(false);
    });

    it('should return empty array on network failure', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Offline'));

      const { result } = renderHook(() => useBlogGeneration());

      let suggestions: unknown[];
      await act(async () => {
        suggestions = await result.current.getSuggestions();
      });

      expect(suggestions!).toEqual([]);
    });
  });

  describe('fetchQueue', () => {
    it('should fetch and return queue items', async () => {
      const mockQueueData = [
        { id: 'q-1', topic: 'Topic A', category: 'tech', status: 'pending', priority: 8 },
        { id: 'q-2', topic: 'Topic B', category: 'career', status: 'pending', priority: 5 },
      ];

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockQueueData, error: null }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(queryMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let queue: unknown[];
      await act(async () => {
        queue = await result.current.fetchQueue();
      });

      expect(supabase.from).toHaveBeenCalledWith('blog_generation_queue');
      expect(queue!).toHaveLength(2);
    });

    it('should return empty array on fetch error', async () => {
      const queryMock = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(queryMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let queue: unknown[];
      await act(async () => {
        queue = await result.current.fetchQueue();
      });

      expect(queue!).toEqual([]);
    });
  });

  describe('updatePriority', () => {
    it('should update priority for a queue item', async () => {
      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(updateMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let success: boolean;
      await act(async () => {
        success = await result.current.updatePriority('q-1', 10);
      });

      expect(success!).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('blog_generation_queue');
      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 10 })
      );
    });

    it('should return false on update error', async () => {
      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };
      vi.mocked(supabase.from).mockReturnValue(updateMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let success: boolean;
      await act(async () => {
        success = await result.current.updatePriority('q-1', 10);
      });

      expect(success!).toBe(false);
    });
  });

  describe('deleteFromQueue', () => {
    it('should delete a queue item and return true on success', async () => {
      const deleteMock = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(deleteMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let success: boolean;
      await act(async () => {
        success = await result.current.deleteFromQueue('q-1');
      });

      expect(success!).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('blog_generation_queue');
    });

    it('should return false on delete error', async () => {
      const deleteMock = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      };
      vi.mocked(supabase.from).mockReturnValue(deleteMock as unknown as ReturnType<typeof supabase.from>);

      const { result } = renderHook(() => useBlogGeneration());

      let success: boolean;
      await act(async () => {
        success = await result.current.deleteFromQueue('q-1');
      });

      expect(success!).toBe(false);
    });
  });
});
