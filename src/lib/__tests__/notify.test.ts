import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted, so use vi.hoisted for the mock object
const mockToast = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  });
  return fn;
});

vi.mock('sonner', () => ({
  toast: mockToast,
}));

import { notify, migrateToast } from '@/lib/notify';

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success() calls sonner.success', () => {
    notify.success('Done');
    expect(mockToast.success).toHaveBeenCalledWith('Done', undefined);
  });

  it('error() calls sonner.error with 5s default duration', () => {
    notify.error('Failed');
    expect(mockToast.error).toHaveBeenCalledWith('Failed', expect.objectContaining({ duration: 5000 }));
  });

  it('error() allows overriding duration', () => {
    notify.error('Failed', { duration: 10000 });
    expect(mockToast.error).toHaveBeenCalledWith('Failed', expect.objectContaining({ duration: 10000 }));
  });

  it('warning() calls sonner.warning', () => {
    notify.warning('Watch out');
    expect(mockToast.warning).toHaveBeenCalledWith('Watch out', undefined);
  });

  it('info() calls sonner.info', () => {
    notify.info('FYI');
    expect(mockToast.info).toHaveBeenCalledWith('FYI', undefined);
  });

  it('loading() calls sonner.loading with Infinity duration', () => {
    notify.loading('Please wait');
    expect(mockToast.loading).toHaveBeenCalledWith('Please wait', expect.objectContaining({ duration: Infinity }));
  });

  it('dismiss() calls sonner.dismiss', () => {
    notify.dismiss('toast-1');
    expect(mockToast.dismiss).toHaveBeenCalledWith('toast-1');
  });

  it('dismiss() without ID dismisses all', () => {
    notify.dismiss();
    expect(mockToast.dismiss).toHaveBeenCalledWith(undefined);
  });

  it('message() calls base sonner toast', () => {
    notify.message('Hello');
    expect(mockToast).toHaveBeenCalledWith('Hello', undefined);
  });
});

describe('migrateToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps destructive variant to error', () => {
    migrateToast({ title: 'Error', description: 'Something broke', variant: 'destructive' });
    expect(mockToast.error).toHaveBeenCalledWith('Error', expect.objectContaining({ description: 'Something broke' }));
  });

  it('maps default variant to message', () => {
    migrateToast({ title: 'Saved' });
    expect(mockToast).toHaveBeenCalledWith('Saved', { description: undefined });
  });

  it('uses description as message when no title', () => {
    migrateToast({ description: 'Just a note' });
    expect(mockToast).toHaveBeenCalledWith('Just a note', { description: undefined });
  });
});
