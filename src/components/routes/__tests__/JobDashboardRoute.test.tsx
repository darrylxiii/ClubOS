import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { JobDashboardRoute } from '../JobDashboardRoute';

// Mock RoleContext
const mockUseRole = vi.fn();
vi.mock('@/contexts/RoleContext', () => ({
  useRole: () => mockUseRole(),
}));

// Mock notify
vi.mock('@/lib/notify', () => ({
  notify: { error: vi.fn() },
}));

const renderWithRouter = (route = '/dashboard/jobs') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/home" element={<div data-testid="home">Home</div>} />
        <Route path="/jobs/:jobId" element={<div data-testid="job-detail">Job Detail</div>} />
        <Route path="/dashboard/jobs" element={
          <JobDashboardRoute>
            <div data-testid="dashboard">Dashboard</div>
          </JobDashboardRoute>
        } />
        <Route path="/dashboard/jobs/:jobId" element={
          <JobDashboardRoute>
            <div data-testid="dashboard">Dashboard</div>
          </JobDashboardRoute>
        } />
      </Routes>
    </MemoryRouter>
  );
};

describe('JobDashboardRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard for admin role', async () => {
    mockUseRole.mockReturnValue({ currentRole: 'admin', loading: false });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('renders dashboard for strategist role', async () => {
    mockUseRole.mockReturnValue({ currentRole: 'strategist', loading: false });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('renders dashboard for partner role', async () => {
    mockUseRole.mockReturnValue({ currentRole: 'partner', loading: false });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('redirects candidates to /home', async () => {
    mockUseRole.mockReturnValue({ currentRole: 'user', loading: false });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId('home')).toBeInTheDocument();
    });
  });

  it('shows loader while loading', () => {
    mockUseRole.mockReturnValue({ currentRole: null, loading: true });
    renderWithRouter();
    expect(screen.queryByTestId('dashboard')).toBeNull();
    // Loader should be present (Loader2 spinner)
  });
});
