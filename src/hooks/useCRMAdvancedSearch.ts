import { useMemo } from "react";
import type { CRMEmailReply } from "@/types/crm-enterprise";

interface CRMSearchOperators {
  from?: string;
  company?: string;
  subject?: string;
  has?: "starred" | "urgent" | "suggested_reply";
  is?: "read" | "unread" | "actioned" | "archived";
  classification?: string;
  query?: string;
}

function parseCRMSearchQuery(query: string): CRMSearchOperators {
  const operators: CRMSearchOperators = {};
  let remainingQuery = query;

  // Extract from: operator
  const fromMatch = query.match(/from:(\S+)/i);
  if (fromMatch) {
    operators.from = fromMatch[1];
    remainingQuery = remainingQuery.replace(fromMatch[0], "").trim();
  }

  // Extract company: operator
  const companyMatch = query.match(/company:(\S+)/i);
  if (companyMatch) {
    operators.company = companyMatch[1];
    remainingQuery = remainingQuery.replace(companyMatch[0], "").trim();
  }

  // Extract subject: operator
  const subjectMatch = query.match(/subject:(\S+)/i);
  if (subjectMatch) {
    operators.subject = subjectMatch[1];
    remainingQuery = remainingQuery.replace(subjectMatch[0], "").trim();
  }

  // Extract has: operator
  const hasMatch = query.match(/has:(starred|urgent|suggested_reply)/i);
  if (hasMatch) {
    operators.has = hasMatch[1].toLowerCase() as "starred" | "urgent" | "suggested_reply";
    remainingQuery = remainingQuery.replace(hasMatch[0], "").trim();
  }

  // Extract is: operator
  const isMatch = query.match(/is:(read|unread|actioned|archived)/i);
  if (isMatch) {
    operators.is = isMatch[1].toLowerCase() as "read" | "unread" | "actioned" | "archived";
    remainingQuery = remainingQuery.replace(isMatch[0], "").trim();
  }

  // Extract classification: operator
  const classMatch = query.match(/classification:(\S+)/i);
  if (classMatch) {
    operators.classification = classMatch[1];
    remainingQuery = remainingQuery.replace(classMatch[0], "").trim();
  }

  // Remaining query is general search
  if (remainingQuery) {
    operators.query = remainingQuery;
  }

  return operators;
}

export function useCRMAdvancedSearch(replies: CRMEmailReply[], searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery.trim()) return replies;

    const operators = parseCRMSearchQuery(searchQuery);
    
    return replies.filter((reply) => {
      // Check from: operator
      if (operators.from) {
        const fromMatch = reply.from_email.toLowerCase().includes(operators.from.toLowerCase()) ||
          reply.from_name?.toLowerCase().includes(operators.from.toLowerCase());
        if (!fromMatch) return false;
      }

      // Check company: operator
      if (operators.company) {
        const companyMatch = reply.prospect_company?.toLowerCase().includes(operators.company.toLowerCase());
        if (!companyMatch) return false;
      }

      // Check subject: operator
      if (operators.subject) {
        if (!reply.subject?.toLowerCase().includes(operators.subject.toLowerCase())) {
          return false;
        }
      }

      // Check has: operator
      if (operators.has) {
        if (operators.has === "starred" && reply.priority <= 3) return false;
        if (operators.has === "urgent" && reply.urgency !== 'high') return false;
        if (operators.has === "suggested_reply" && !reply.suggested_reply) return false;
      }

      // Check is: operator
      if (operators.is) {
        if (operators.is === "read" && !reply.is_read) return false;
        if (operators.is === "unread" && reply.is_read) return false;
        if (operators.is === "actioned" && !reply.is_actioned) return false;
        if (operators.is === "archived" && !reply.is_archived) return false;
      }

      // Check classification: operator
      if (operators.classification) {
        if (reply.classification !== operators.classification) return false;
      }

      // Check general query
      if (operators.query) {
        const searchLower = operators.query.toLowerCase();
        const matchesGeneral =
          reply.subject?.toLowerCase().includes(searchLower) ||
          reply.from_email.toLowerCase().includes(searchLower) ||
          reply.from_name?.toLowerCase().includes(searchLower) ||
          reply.body_text?.toLowerCase().includes(searchLower) ||
          reply.ai_summary?.toLowerCase().includes(searchLower) ||
          reply.prospect_company?.toLowerCase().includes(searchLower);
        
        if (!matchesGeneral) return false;
      }

      return true;
    });
  }, [replies, searchQuery]);
}

export function getCRMSearchSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  
  if (!query.includes("from:")) {
    suggestions.push("from:email@example.com");
  }
  if (!query.includes("company:")) {
    suggestions.push("company:acme");
  }
  if (!query.includes("subject:")) {
    suggestions.push("subject:keyword");
  }
  if (!query.includes("has:")) {
    suggestions.push("has:starred", "has:urgent", "has:suggested_reply");
  }
  if (!query.includes("is:")) {
    suggestions.push("is:unread", "is:actioned", "is:read");
  }
  if (!query.includes("classification:")) {
    suggestions.push("classification:hot_lead", "classification:warm_lead");
  }
  
  return suggestions.slice(0, 5);
}
