import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from '../RoleGate';

// Mock RoleContext
const mockUseRole = vi.fn();
vi.mock('@/contexts/RoleContext', () => ({
  useRole: () => mockUseRole(),
}));

// Mock UnifiedLoader
vi.mock('@/components/ui/unified-loader', () => ({
  UnifiedLoader: ({ variant }: { variant: string }) => (
    <div data-testid={`loader-${variant}`}>Loading...</div>
  ),
}));

describe('RoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has an allowed role', () => {
    mockUseRole.mockReturnValue({ currentRole: 'admin', loading: false });

    render(
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div data-testid="gated-content">Secret</div>
      </RoleGate>
    );

    expect(screen.getByTestId('gated-content')).toBeInTheDocument();
  });

  it('renders fallback when user role is not allowed', () => {
    mockUseRole.mockReturnValue({ currentRole: 'user', loading: false });

    render(
      <RoleGate
        allowedRoles={['admin']}
        fallback={<div data-testid="fallback">No access</div>}
      >
        <div data-testid="gated-content">Secret</div>
      </RoleGate>
    );

    expect(screen.queryByTestId('gated-content')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders null fallback by default when role not allowed', () => {
    mockUseRole.mockReturnValue({ currentRole: 'user', loading: false });

    const { container } = render(
      <RoleGate allowedRoles={['admin']}>
        <div data-testid="gated-content">Secret</div>
      </RoleGate>
    );

    expect(screen.queryByTestId('gated-content')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing while loading (showLoading=false)', () => {
    mockUseRole.mockReturnValue({ currentRole: null, loading: true });

    const { container } = render(
      <RoleGate allowedRoles={['admin']}>
        <div>Content</div>
      </RoleGate>
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders loader while loading when showLoading=true', () => {
    mockUseRole.mockReturnValue({ currentRole: null, loading: true });

    render(
      <RoleGate allowedRoles={['admin']} showLoading>
        <div>Content</div>
      </RoleGate>
    );

    expect(screen.getByTestId('loader-section')).toBeInTheDocument();
  });

  it('renders fallback when role is null', () => {
    mockUseRole.mockReturnValue({ currentRole: null, loading: false });

    render(
      <RoleGate allowedRoles={['admin', 'user']} fallback={<span>Denied</span>}>
        <div>Content</div>
      </RoleGate>
    );

    expect(screen.getByText('Denied')).toBeInTheDocument();
  });

  it('works with multiple allowed roles', () => {
    mockUseRole.mockReturnValue({ currentRole: 'partner', loading: false });

    render(
      <RoleGate allowedRoles={['admin', 'partner', 'strategist']}>
        <div data-testid="content">Visible</div>
      </RoleGate>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
