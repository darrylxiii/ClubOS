import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_AUTO_RETRY = 2;
const AUTO_RETRY_DELAY = 3000;

/**
 * Sidebar-specific Error Boundary with graceful fallback
 * Shows a minimal collapsed sidebar when errors occur to prevent layout crash
 */
export class SidebarErrorBoundary extends Component<Props, State> {
  private autoRetryTimer: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring system
    logger.error("Sidebar Error", error, {
      componentStack: errorInfo.componentStack,
      severity: "error",
      componentName: "SidebarErrorBoundary",
    });

    console.error("🔴 [SidebarErrorBoundary] Caught error:", error);
    console.error("🔴 [SidebarErrorBoundary] Component stack:", errorInfo.componentStack);

    // Attempt auto-recovery if under retry limit
    if (this.state.retryCount < MAX_AUTO_RETRY) {
      this.scheduleAutoRetry();
    }
  }

  public componentWillUnmount() {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
    }
  }

  private scheduleAutoRetry = () => {
    this.autoRetryTimer = setTimeout(() => {
      this.handleRetry();
    }, AUTO_RETRY_DELAY);
  };

  private handleRetry = () => {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
    
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default: Minimal floating pill on left (Billion-Dollar Design)
      return (
        <aside
          className="hidden md:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 z-sidebar-desktop w-[60px] min-h-[180px] rounded-[30px]
            bg-black/60 backdrop-blur-[40px] border border-white/10
            shadow-[0_16px_40px_rgba(0,0,0,0.3)] items-center py-5 gap-4 transition-all hover:w-[250px] group overflow-hidden"
        >
          {/* Error indicator & Trace on hover */}
          <div className="flex flex-col items-center w-full relative">
            <AlertTriangle className="h-6 w-6 text-warning animate-pulse flex-shrink-0" />
            <div className="absolute left-[60px] opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-4 py-2 rounded-xl text-xs text-warning border border-warning/20 max-w-[200px] overflow-hidden text-ellipsis shadow-xl pointer-events-none transition-opacity delay-100">
              {this.state.error?.message || "Unknown Runtime Error"}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2 mt-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground/50 opacity-50"
              disabled
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-auto pointer-events-auto w-full flex justify-center">
            {/* Retry button */}
            <SidebarRetryButton onRetry={this.handleManualRetry} retryCount={this.state.retryCount} />
          </div>
        </aside>
      );
    }

    return this.props.children;
  }
}

function SidebarRetryButton({ onRetry, retryCount }: { onRetry: () => void; retryCount: number }) {
  const { t } = useTranslation('common');
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRetry}
        className="h-10 w-10 text-primary hover:text-primary/80"
        title={t("actions.retrySidebar", "Retry loading sidebar")}
      >
        <RefreshCw className="h-5 w-5" />
      </Button>

      {retryCount < MAX_AUTO_RETRY && (
        <p className="text-[10px] text-muted-foreground text-center px-2">
          {t("errors.retrying", "Retrying...")}
        </p>
      )}
    </>
  );
}
