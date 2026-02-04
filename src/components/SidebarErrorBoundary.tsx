import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Menu } from "lucide-react";
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

      // Default: Minimal collapsed sidebar with retry option
      return (
        <aside
          className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-sidebar-desktop w-20
            bg-card/30 backdrop-blur-[var(--blur-glass)] border-r border-border/20
            shadow-[var(--shadow-glass-lg)] items-center py-4 gap-4"
        >
          {/* Error indicator */}
          <div className="h-16 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-warning animate-pulse" />
          </div>

          {/* Menu icon placeholder */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground"
              disabled
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Retry button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={this.handleManualRetry}
            className="h-10 w-10 text-primary hover:text-primary/80"
            title="Retry loading sidebar"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>

          {/* Auto-retry indicator */}
          {this.state.retryCount < MAX_AUTO_RETRY && (
            <p className="text-[10px] text-muted-foreground text-center px-2">
              Retrying...
            </p>
          )}
        </aside>
      );
    }

    return this.props.children;
  }
}
