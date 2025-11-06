import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Email } from "@/hooks/useEmails";
import { EmailRow } from "./EmailRow";

interface VirtualEmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  selectedIds: Set<string>;
  onEmailSelect: (email: Email) => void;
  onToggleCheck: (emailId: string) => void;
  onToggleStar: (emailId: string, starred: boolean) => void;
}

export function VirtualEmailList({
  emails,
  selectedEmailId,
  selectedIds,
  onEmailSelect,
  onToggleCheck,
  onToggleStar,
}: VirtualEmailListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
    getItemKey: (index) => emails[index]?.id || index,
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
          const email = emails[virtualRow.index];
          return (
            <div
              key={email.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                willChange: "transform",
              }}
            >
              <EmailRow
                email={email}
                isSelected={email.id === selectedEmailId}
                isChecked={selectedIds.has(email.id)}
                onSelect={() => onEmailSelect(email)}
                onToggleCheck={() => onToggleCheck(email.id)}
                onToggleStar={onToggleStar}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
