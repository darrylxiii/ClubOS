import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import type { CRMEmailReply } from "@/types/crm-enterprise";
import { ReplyRow } from "./ReplyRow";

interface VirtualReplyListProps {
  replies: CRMEmailReply[];
  selectedReplyId: string | null;
  selectedIds: Set<string>;
  onReplySelect: (reply: CRMEmailReply) => void;
  onToggleCheck: (replyId: string) => void;
  onToggleStar: (replyId: string) => void;
  onArchive?: (replyId: string) => void;
  onSnooze?: (replyId: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function VirtualReplyList({
  replies,
  selectedReplyId,
  selectedIds,
  onReplySelect,
  onToggleCheck,
  onToggleStar,
  onArchive,
  onSnooze,
  hasMore,
  loadingMore,
  onLoadMore,
}: VirtualReplyListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: replies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
    getItemKey: (index) => replies[index]?.id || index,
  });

  // Infinite scroll: trigger loadMore when near bottom
  useEffect(() => {
    if (!hasMore || !onLoadMore || loadingMore) return;

    const el = parentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        onLoadMore();
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, onLoadMore, loadingMore]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto scroll-smooth"
      style={{ 
        height: "100%", 
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
          minHeight: "80px",
          contain: "layout style paint",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const reply = replies[virtualRow.index];
          return (
            <div
              key={reply.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                willChange: "transform",
              }}
            >
              <ReplyRow
                reply={reply}
                isSelected={reply.id === selectedReplyId}
                isChecked={selectedIds.has(reply.id)}
                onSelect={() => onReplySelect(reply)}
                onToggleCheck={() => onToggleCheck(reply.id)}
                onToggleStar={() => onToggleStar(reply.id)}
                onArchive={onArchive}
                onSnooze={onSnooze}
              />
            </div>
          );
        })}
      </div>

      {/* Load more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
        </div>
      )}
    </div>
  );
}
