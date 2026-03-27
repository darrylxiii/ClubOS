import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  refreshing, 
  threshold = 80 
}: PullToRefreshIndicatorProps) {
  const { t } = useTranslation('common');

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = pullDistance * 2;
  const readyToRefresh = progress >= 1;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: refreshing ? 48 : pullDistance * 0.6 }}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          readyToRefresh && "text-primary",
          refreshing && "text-primary"
        )}
      >
        <RefreshCw
          className={cn("h-4 w-4 transition-transform", refreshing && "animate-spin")}
          style={{ transform: refreshing ? undefined : `rotate(${rotation}deg)`, opacity: progress }}
        />
        <span style={{ opacity: progress }}>
          {refreshing 
            ? t("dashboard.activityFeed.refreshing") 
            : readyToRefresh 
              ? t("dashboard.activityFeed.releaseToRefresh") 
              : t("dashboard.activityFeed.pullToRefresh")}
        </span>
      </div>
    </div>
  );
}

