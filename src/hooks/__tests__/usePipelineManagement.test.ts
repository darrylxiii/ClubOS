import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePipelineManagement } from '../usePipelineManagement';
import { supabase } from '@/integrations/supabase/client';

describe('usePipelineManagement', () => {
  const mockJobId = 'test-job-id';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id' } as any },
      error: null,
    });
  });

  it('should initialize with saving false', () => {
    const { result } = renderHook(() => usePipelineManagement(mockJobId));
    expect(result.current.saving).toBe(false);
  });

  it('should provide savePipeline function', () => {
    const { result } = renderHook(() => usePipelineManagement(mockJobId));
    expect(result.current.savePipeline).toBeInstanceOf(Function);
  });

  it('should provide addStage function', () => {
    const { result } = renderHook(() => usePipelineManagement(mockJobId));
    expect(result.current.addStage).toBeInstanceOf(Function);
  });

  it('should provide removeStage function', () => {
    const { result } = renderHook(() => usePipelineManagement(mockJobId));
    expect(result.current.removeStage).toBeInstanceOf(Function);
  });
});
