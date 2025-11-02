import { useMemo } from "react";
import { Email } from "./useEmails";

interface SearchOperators {
  from?: string;
  to?: string;
  subject?: string;
  has?: "attachment" | "star";
  is?: "read" | "unread" | "starred";
  query?: string;
}

function parseSearchQuery(query: string): SearchOperators {
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

  // Extract has: operator
  const hasMatch = query.match(/has:(attachment|star)/i);
  if (hasMatch) {
    operators.has = hasMatch[1].toLowerCase() as "attachment" | "star";
    remainingQuery = remainingQuery.replace(hasMatch[0], "").trim();
  }

  // Extract is: operator
  const isMatch = query.match(/is:(read|unread|starred)/i);
  if (isMatch) {
    operators.is = isMatch[1].toLowerCase() as "read" | "unread" | "starred";
    remainingQuery = remainingQuery.replace(isMatch[0], "").trim();
  }

  // Remaining query is general search
  if (remainingQuery) {
    operators.query = remainingQuery;
  }

  return operators;
}

export function useAdvancedSearch(emails: Email[], searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery.trim()) return emails;

    const operators = parseSearchQuery(searchQuery);
    
    return emails.filter((email) => {
      // Check from: operator
      if (operators.from) {
        const fromMatch = email.from_email.toLowerCase().includes(operators.from.toLowerCase()) ||
          email.from_name?.toLowerCase().includes(operators.from.toLowerCase());
        if (!fromMatch) return false;
      }

      // Check to: operator
      if (operators.to) {
        const toEmails = Array.isArray(email.to_emails) ? email.to_emails : [];
        const toMatch = toEmails.some((to: any) => 
          typeof to === 'string' ? to.toLowerCase().includes(operators.to!.toLowerCase()) : false
        );
        if (!toMatch) return false;
      }

      // Check subject: operator
      if (operators.subject) {
        if (!email.subject.toLowerCase().includes(operators.subject.toLowerCase())) {
          return false;
        }
      }

      // Check has: operator
      if (operators.has) {
        if (operators.has === "attachment" && !email.has_attachments) return false;
        if (operators.has === "star" && !email.is_starred) return false;
      }

      // Check is: operator
      if (operators.is) {
        if (operators.is === "read" && !email.is_read) return false;
        if (operators.is === "unread" && email.is_read) return false;
        if (operators.is === "starred" && !email.is_starred) return false;
      }

      // Check general query
      if (operators.query) {
        const searchLower = operators.query.toLowerCase();
        const matchesGeneral =
          email.subject.toLowerCase().includes(searchLower) ||
          email.from_email.toLowerCase().includes(searchLower) ||
          email.from_name?.toLowerCase().includes(searchLower) ||
          email.snippet?.toLowerCase().includes(searchLower) ||
          email.ai_summary?.toLowerCase().includes(searchLower);
        
        if (!matchesGeneral) return false;
      }

      return true;
    });
  }, [emails, searchQuery]);
}

export function getSearchSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  
  if (!query.includes("from:")) {
    suggestions.push("from:sender@example.com");
  }
  if (!query.includes("to:")) {
    suggestions.push("to:recipient@example.com");
  }
  if (!query.includes("subject:")) {
    suggestions.push("subject:keyword");
  }
  if (!query.includes("has:")) {
    suggestions.push("has:attachment", "has:star");
  }
  if (!query.includes("is:")) {
    suggestions.push("is:unread", "is:starred", "is:read");
  }
  
  return suggestions.slice(0, 5);
}
