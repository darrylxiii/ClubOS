import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchFilterDropdown, SearchOperators } from "./SearchFilterDropdown";
import { SearchOperatorBadge } from "./SearchOperatorBadge";
import { cn } from "@/lib/utils";

interface AdvancedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function operatorsToQuery(operators: SearchOperators, plainText: string = ""): string {
  const parts: string[] = [];
  
  if (operators.from) parts.push(`from:${operators.from}`);
  if (operators.to) parts.push(`to:${operators.to}`);
  if (operators.subject) parts.push(`subject:${operators.subject}`);
  
  if (operators.has) {
    operators.has.forEach(h => parts.push(`has:${h}`));
  }
  
  if (operators.is) {
    operators.is.forEach(i => parts.push(`is:${i}`));
  }
  
  if (plainText.trim()) {
    parts.push(plainText.trim());
  }
  
  return parts.join(" ");
}

function queryToOperators(query: string): { operators: SearchOperators; plainText: string } {
  const operators: SearchOperators = {};
  let remainingQuery = query;

  // Extract from: operator
  const fromMatch = query.match(/from:(\S+)/i);
  if (fromMatch) {
    operators.from = fromMatch[1];
    remainingQuery = remainingQuery.replace(fromMatch[0], "").trim();
  }

  // Extract to: operator
  const toMatch = query.match(/to:(\S+)/i);
  if (toMatch) {
    operators.to = toMatch[1];
    remainingQuery = remainingQuery.replace(toMatch[0], "").trim();
  }

  // Extract subject: operator
  const subjectMatch = query.match(/subject:(\S+)/i);
  if (subjectMatch) {
    operators.subject = subjectMatch[1];
    remainingQuery = remainingQuery.replace(subjectMatch[0], "").trim();
  }

  // Extract has: operators (can be multiple)
  const hasMatches = query.matchAll(/has:(attachment|star)/gi);
  const hasValues: ("attachment" | "star")[] = [];
  for (const match of hasMatches) {
    hasValues.push(match[1].toLowerCase() as "attachment" | "star");
    remainingQuery = remainingQuery.replace(match[0], "").trim();
  }
  if (hasValues.length > 0) {
    operators.has = hasValues;
  }

  // Extract is: operators (can be multiple)
  const isMatches = query.matchAll(/is:(read|unread|starred)/gi);
  const isValues: ("read" | "unread" | "starred")[] = [];
  for (const match of isMatches) {
    isValues.push(match[1].toLowerCase() as "read" | "unread" | "starred");
    remainingQuery = remainingQuery.replace(match[0], "").trim();
  }
  if (isValues.length > 0) {
    operators.is = isValues;
  }

  return { operators, plainText: remainingQuery };
}

export function AdvancedSearchInput({
  value,
  onChange,
  placeholder = "Search emails...",
  className,
}: AdvancedSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { operators, plainText } = queryToOperators(value);
  const [localPlainText, setLocalPlainText] = useState(plainText);

  useEffect(() => {
    const { plainText: newPlainText } = queryToOperators(value);
    setLocalPlainText(newPlainText);
  }, [value]);

  const handleOperatorsChange = (newOperators: SearchOperators) => {
    const newQuery = operatorsToQuery(newOperators, localPlainText);
    onChange(newQuery);
  };

  const handlePlainTextChange = (text: string) => {
    setLocalPlainText(text);
    const newQuery = operatorsToQuery(operators, text);
    onChange(newQuery);
  };

  const removeOperator = (key: keyof SearchOperators, arrayValue?: string) => {
    const newOperators = { ...operators };
    
    if (arrayValue && (key === "has" || key === "is")) {
      const current = newOperators[key] || [];
      newOperators[key] = current.filter(v => v !== arrayValue) as any;
      if (newOperators[key]?.length === 0) {
        delete newOperators[key];
      }
    } else {
      delete newOperators[key];
    }
    
    handleOperatorsChange(newOperators);
  };

  const clearAll = () => {
    onChange("");
    setLocalPlainText("");
  };

  const hasOperators = Object.keys(operators).length > 0;
  const hasContent = hasOperators || localPlainText.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 transition-all",
          isFocused && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        
        <div className="flex-1 flex items-center gap-1.5 flex-wrap min-h-[24px]">
          {/* Operator Badges */}
          {operators.from && (
            <SearchOperatorBadge
              operator="from"
              value={operators.from}
              onRemove={() => removeOperator("from")}
            />
          )}
          {operators.to && (
            <SearchOperatorBadge
              operator="to"
              value={operators.to}
              onRemove={() => removeOperator("to")}
            />
          )}
          {operators.subject && (
            <SearchOperatorBadge
              operator="subject"
              value={operators.subject}
              onRemove={() => removeOperator("subject")}
            />
          )}
          {operators.is?.map((isValue) => (
            <SearchOperatorBadge
              key={`is-${isValue}`}
              operator="is"
              value={isValue}
              onRemove={() => removeOperator("is", isValue)}
            />
          ))}
          {operators.has?.map((hasValue) => (
            <SearchOperatorBadge
              key={`has-${hasValue}`}
              operator="has"
              value={hasValue}
              onRemove={() => removeOperator("has", hasValue)}
            />
          ))}
          
          {/* Plain Text Input */}
          <Input
            ref={inputRef}
            type="text"
            value={localPlainText}
            onChange={(e) => handlePlainTextChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={hasOperators ? "Add keywords..." : placeholder}
            className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
          />
        </div>

        {/* Clear Button */}
        {hasContent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={clearAll}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Filter Dropdown */}
        <SearchFilterDropdown
          currentOperators={operators}
          onApply={handleOperatorsChange}
          onClear={() => handleOperatorsChange({})}
        />
      </div>
    </div>
  );
}
