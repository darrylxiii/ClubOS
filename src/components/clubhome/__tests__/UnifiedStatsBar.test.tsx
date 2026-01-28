import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UnifiedStatsBar } from '../UnifiedStatsBar';

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );
};

describe('UnifiedStatsBar', () => {
  it('renders user stats correctly', () => {
    const stats = {
      applications: 5,
      matches: 12,
      interviews: 3,
      messages: 8,
    };

    render(<UnifiedStatsBar role="user" stats={stats} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading', () => {
    render(<UnifiedStatsBar role="user" stats={{}} loading={true} />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('status', { name: /loading statistics/i })).toBeInTheDocument();
  });

  it('renders partner stats correctly', () => {
    const stats = {
      activeJobs: 10,
      totalApplications: 50,
      interviews: 8,
      followers: 100,
    };

    render(<UnifiedStatsBar role="partner" stats={stats} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('renders admin stats correctly', () => {
    const stats = {
      totalUsers: 1000,
      totalCompanies: 50,
      totalJobs: 200,
      pendingReviews: 15,
    };

    render(<UnifiedStatsBar role="admin" stats={stats} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('stats are clickable links', () => {
    const stats = {
      applications: 5,
      matches: 12,
      interviews: 3,
      messages: 8,
    };

    render(<UnifiedStatsBar role="user" stats={stats} />, { wrapper: createWrapper() });
    
    // Check that links exist with proper accessible names
    expect(screen.getByRole('link', { name: /5 active applications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /12 job matches/i })).toBeInTheDocument();
  });

  it('has accessible region structure', () => {
    const stats = { applications: 5, matches: 12, interviews: 3, messages: 8 };

    render(<UnifiedStatsBar role="user" stats={stats} />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('region', { name: /dashboard statistics/i })).toBeInTheDocument();
  });
});
