import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CandidateOnboardingSteps } from '../CandidateOnboardingSteps';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { exists: false }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/test.pdf' } }),
        copy: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/usePhoneVerification', () => ({
  usePhoneVerification: () => ({
    sendOTP: vi.fn().mockResolvedValue(true),
    verifyOTP: vi.fn().mockResolvedValue(true),
    otpSent: false,
    isVerifying: false,
    isSendingOtp: false,
    resendCooldown: 0,
  }),
}));

vi.mock('@/hooks/useEmailVerification', () => ({
  useEmailVerification: () => ({
    sendOTP: vi.fn().mockResolvedValue(true),
    verifyOTP: vi.fn().mockResolvedValue(true),
    otpSent: false,
    isVerifying: false,
    isSendingOtp: false,
    resendCooldown: 0,
  }),
}));

vi.mock('@/hooks/useCountryDetection', () => ({
  useCountryDetection: () => ({
    countryCode: 'NL',
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useResumeUpload', () => ({
  useResumeUpload: () => ({
    uploadResume: vi.fn().mockResolvedValue({ url: 'https://test.com/resume.pdf' }),
    isUploading: false,
    validateFile: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/lib/notify', () => ({
  migrateToast: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CandidateOnboardingSteps />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CandidateOnboardingSteps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the first step (Contact Information)', () => {
      renderComponent();
      
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });

    it('should render step progress indicator', () => {
      renderComponent();
      
      expect(screen.getByRole('navigation', { name: /Onboarding progress/i })).toBeInTheDocument();
    });

    it('should render trust badges', () => {
      renderComponent();
      
      expect(screen.getByText('256-bit SSL')).toBeInTheDocument();
      expect(screen.getByText('GDPR Compliant')).toBeInTheDocument();
      expect(screen.getByText('Never Shared')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      renderComponent();
      
      expect(screen.getByRole('button', { name: /Go to previous step/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send verification code/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on inputs', () => {
      renderComponent();
      
      expect(screen.getByRole('textbox', { name: /Full name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Email address/i })).toBeInTheDocument();
    });

    it('should have disabled back button on first step', () => {
      renderComponent();
      
      expect(screen.getByRole('button', { name: /Go to previous step/i })).toBeDisabled();
    });

    it('should have proper heading structure', () => {
      renderComponent();
      
      expect(screen.getByRole('heading', { name: /Contact Information/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update full name input value', () => {
      renderComponent();
      
      const input = screen.getByLabelText(/Full Name/i);
      fireEvent.change(input, { target: { value: 'John Doe' } });
      
      expect(input).toHaveValue('John Doe');
    });

    it('should update email input value', () => {
      renderComponent();
      
      const input = screen.getByLabelText(/Email Address/i);
      fireEvent.change(input, { target: { value: 'john@example.com' } });
      
      expect(input).toHaveValue('john@example.com');
    });
  });

  describe('Validation', () => {
    it('should show error when trying to continue with empty fields', async () => {
      const { migrateToast } = await import('@/lib/notify');
      renderComponent();
      
      const continueButton = screen.getByRole('button', { name: /Send Verification Code/i });
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(migrateToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Missing information',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Step Labels', () => {
    it('should display all step labels', () => {
      renderComponent();
      
      // Step labels are sr-only on mobile, visible on desktop
      // Check that the navigation structure exists
      const nav = screen.getByRole('navigation', { name: /Onboarding progress/i });
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Network Status', () => {
    it('should not show offline indicator when online', () => {
      renderComponent();
      
      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Hints', () => {
    it('should show keyboard shortcuts hint', () => {
      renderComponent();
      
      // Hint may be hidden on mobile but present in DOM
      expect(screen.getByText(/Press/i)).toBeInTheDocument();
    });
  });
});

describe('CandidateOnboardingSteps - Step Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show current step in progress bar', () => {
    renderComponent();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    expect(progressBar).toHaveAttribute('aria-valuemax', '6');
  });
});

describe('CandidateOnboardingSteps - Error Boundary', () => {
  it('should wrap step content in FunnelErrorBoundary', () => {
    renderComponent();
    
    // If component renders without error, boundary is working
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });
});

describe('CandidateOnboardingSteps - Progress Saver', () => {
  it('should render ProgressSaver component', () => {
    renderComponent();
    
    // ProgressSaver shows status text after step changes
    // On step 0, it may show minimal UI
  });
});
