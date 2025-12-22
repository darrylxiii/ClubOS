import { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppearanceProvider } from "@/contexts/AppearanceContext";

interface PublicProvidersProps {
  children: ReactNode;
}

/**
 * Minimal providers for public routes (Auth, Booking, SharedProfile)
 * Only loads essential authentication and theme providers
 * Defers heavy contexts until after login to improve FCP
 */
export const PublicProviders = ({ children }: PublicProvidersProps) => {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AppearanceProvider>
          {children}
        </AppearanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
