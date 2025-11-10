import { Email } from "@/hooks/useEmails";
import { EmailRow } from "./EmailRow";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface EmailThreadProps {
  emails: Email[];
  selectedEmailId: string | null;
  isChecked: boolean;
  onEmailSelect: (email: Email) => void;
  onToggleCheck: () => void;
  onToggleStar: (emailId: string, starred: boolean) => void;
}

export function EmailThread({
  emails,
  selectedEmailId,
  isChecked,
  onEmailSelect,
  onToggleCheck,
  onToggleStar,
}: EmailThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (emails.length === 1) {
    // Single email, render normally
    return (
      <EmailRow
        email={emails[0]}
        isSelected={emails[0].id === selectedEmailId}
        isChecked={isChecked}
        onSelect={() => onEmailSelect(emails[0])}
        onToggleCheck={onToggleCheck}
        onToggleStar={onToggleStar}
      />
    );
  }

  // Thread with multiple emails
  const latestEmail = emails[0]; // Assuming emails are sorted by date desc
  const hasUnread = emails.some((e) => !e.is_read);

  return (
    <div className="border-b border-border overflow-hidden">
      <div
        className="flex items-center gap-2 p-2 sm:p-3 hover:bg-accent/50 cursor-pointer overflow-hidden"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <EmailRow
            email={latestEmail}
            isSelected={latestEmail.id === selectedEmailId}
            isChecked={isChecked}
            onSelect={() => onEmailSelect(latestEmail)}
            onToggleCheck={onToggleCheck}
            onToggleStar={onToggleStar}
          />
        </div>
        
        <Badge variant="secondary" className="text-xs flex-shrink-0 whitespace-nowrap">
          {emails.length} messages
        </Badge>
      </div>

      {isExpanded && (
        <div className="ml-6 sm:ml-8 border-l-2 border-muted overflow-hidden">
          {emails.slice(1).map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              isSelected={email.id === selectedEmailId}
              isChecked={false}
              onSelect={() => onEmailSelect(email)}
              onToggleCheck={() => {}}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
