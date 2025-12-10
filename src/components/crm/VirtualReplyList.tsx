import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
}: VirtualReplyListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: replies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
    getItemKey: (index) => replies[index]?.id || index,
  });

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
    </div>
  );
}
