import { useState, useCallback, useRef, useEffect } from 'react';

interface Highlight {
  id: string;
  timestamp: number;
  duration: number;
  type: 'key_moment' | 'action_item' | 'decision' | 'question' | 'agreement' | 'disagreement';
  content: string;
  participantId?: string;
  participantName?: string;
  confidence: number;
  tags: string[];
  isBookmarked: boolean;
}

interface HighlightSettings {
  enabled: boolean;
  detectActionItems: boolean;
  detectDecisions: boolean;
  detectQuestions: boolean;
  detectKeyMoments: boolean;
  minConfidence: number;
  autoTagging: boolean;
}

interface UseAutoHighlightReturn {
  highlights: Highlight[];
  isAnalyzing: boolean;
  settings: HighlightSettings;
  updateSettings: (settings: Partial<HighlightSettings>) => void;
  analyzeTranscript: (text: string, participantId?: string, participantName?: string) => void;
  toggleBookmark: (highlightId: string) => void;
  addManualHighlight: (content: string, type: Highlight['type'], participantId?: string, participantName?: string) => void;
  removeHighlight: (highlightId: string) => void;
  exportHighlights: (format: 'json' | 'markdown') => string;
  getHighlightsByType: (type: Highlight['type']) => Highlight[];
  searchHighlights: (query: string) => Highlight[];
}

// Pattern matchers for different highlight types
const PATTERNS = {
  actionItem: [
    /(?:we need to|you should|please|could you|would you|let's|action item[:\s]|todo[:\s]|task[:\s])/i,
    /(?:follow up|get back to|reach out|send|schedule|prepare|review|update|create|set up)/i,
    /(?:by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|next week|end of))/i,
  ],
  decision: [
    /(?:we(?:'ve)? decided|the decision is|we(?:'ll)? go with|we(?:'re)? going to|agreed to|it's been decided)/i,
    /(?:final decision|consensus is|we all agree|approved|confirmed)/i,
  ],
  question: [
    /^(?:what|when|where|who|why|how|can|could|would|should|is|are|do|does|will|has|have)\s/i,
    /\?$/,
    /(?:any questions|thoughts on|opinions about|what do you think)/i,
  ],
  agreement: [
    /(?:I agree|agreed|exactly|that's right|absolutely|definitely|yes, that's|good point|makes sense)/i,
  ],
  disagreement: [
    /(?:I disagree|not sure about|I don't think|maybe not|on the other hand|however|but I think|concerned about)/i,
  ],
  keyMoment: [
    /(?:important|crucial|key point|note that|remember|highlight|significant|breakthrough|milestone)/i,
    /(?:announcement|update|news|change|launch|release)/i,
  ],
};

// Tag extraction patterns
const TAG_PATTERNS = {
  people: /@(\w+)/g,
  dates: /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next week|this week|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi,
  projects: /(?:project|initiative|feature|release|version)\s+[\w-]+/gi,
  priorities: /(?:urgent|asap|critical|high priority|low priority|p[0-3])/gi,
};

export function useAutoHighlight(): UseAutoHighlightReturn {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettings] = useState<HighlightSettings>({
    enabled: true,
    detectActionItems: true,
    detectDecisions: true,
    detectQuestions: true,
    detectKeyMoments: true,
    minConfidence: 0.6,
    autoTagging: true,
  });

  const recentTextRef = useRef<string[]>([]);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const extractTags = useCallback((text: string): string[] => {
    if (!settings.autoTagging) return [];

    const tags: string[] = [];
    
    Object.entries(TAG_PATTERNS).forEach(([category, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const tag = match.toLowerCase().trim();
          if (!tags.includes(tag)) {
            tags.push(tag);
          }
        });
      }
    });

    return tags.slice(0, 5); // Limit to 5 tags
  }, [settings.autoTagging]);

  const detectHighlightType = useCallback((text: string): { type: Highlight['type']; confidence: number } | null => {
    const results: { type: Highlight['type']; confidence: number }[] = [];

    if (settings.detectActionItems) {
      const actionMatches = PATTERNS.actionItem.filter(p => p.test(text)).length;
      if (actionMatches > 0) {
        results.push({ type: 'action_item', confidence: Math.min(0.5 + actionMatches * 0.2, 0.95) });
      }
    }

    if (settings.detectDecisions) {
      const decisionMatches = PATTERNS.decision.filter(p => p.test(text)).length;
      if (decisionMatches > 0) {
        results.push({ type: 'decision', confidence: Math.min(0.6 + decisionMatches * 0.2, 0.95) });
      }
    }

    if (settings.detectQuestions) {
      const questionMatches = PATTERNS.question.filter(p => p.test(text)).length;
      if (questionMatches > 0) {
        results.push({ type: 'question', confidence: Math.min(0.5 + questionMatches * 0.15, 0.9) });
      }
    }

    if (settings.detectKeyMoments) {
      const keyMatches = PATTERNS.keyMoment.filter(p => p.test(text)).length;
      if (keyMatches > 0) {
        results.push({ type: 'key_moment', confidence: Math.min(0.4 + keyMatches * 0.25, 0.9) });
      }

      const agreeMatches = PATTERNS.agreement.filter(p => p.test(text)).length;
      if (agreeMatches > 0) {
        results.push({ type: 'agreement', confidence: Math.min(0.5 + agreeMatches * 0.15, 0.85) });
      }

      const disagreeMatches = PATTERNS.disagreement.filter(p => p.test(text)).length;
      if (disagreeMatches > 0) {
        results.push({ type: 'disagreement', confidence: Math.min(0.5 + disagreeMatches * 0.15, 0.85) });
      }
    }

    if (results.length === 0) return null;

    // Return highest confidence match
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }, [settings]);

  const analyzeTranscript = useCallback((
    text: string,
    participantId?: string,
    participantName?: string
  ) => {
    if (!settings.enabled || text.trim().length < 10) return;

    // Debounce analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    recentTextRef.current.push(text);
    if (recentTextRef.current.length > 10) {
      recentTextRef.current.shift();
    }

    analysisTimeoutRef.current = setTimeout(() => {
      setIsAnalyzing(true);

      const combinedText = recentTextRef.current.join(' ');
      const detection = detectHighlightType(combinedText);

      if (detection && detection.confidence >= settings.minConfidence) {
        const highlight: Highlight = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: 0,
          type: detection.type,
          content: text,
          participantId,
          participantName,
          confidence: detection.confidence,
          tags: extractTags(text),
          isBookmarked: false,
        };

        setHighlights(prev => {
          // Avoid duplicate highlights
          const isDuplicate = prev.some(h => 
            h.content === highlight.content && 
            Date.now() - h.timestamp < 30000
          );
          if (isDuplicate) return prev;
          return [...prev, highlight];
        });

        recentTextRef.current = [];
      }

      setIsAnalyzing(false);
    }, 500);
  }, [settings, detectHighlightType, extractTags]);

  const toggleBookmark = useCallback((highlightId: string) => {
    setHighlights(prev => prev.map(h => 
      h.id === highlightId ? { ...h, isBookmarked: !h.isBookmarked } : h
    ));
  }, []);

  const addManualHighlight = useCallback((
    content: string,
    type: Highlight['type'],
    participantId?: string,
    participantName?: string
  ) => {
    const highlight: Highlight = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: 0,
      type,
      content,
      participantId,
      participantName,
      confidence: 1.0,
      tags: extractTags(content),
      isBookmarked: true,
    };

    setHighlights(prev => [...prev, highlight]);
  }, [extractTags]);

  const removeHighlight = useCallback((highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<HighlightSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const exportHighlights = useCallback((format: 'json' | 'markdown'): string => {
    if (format === 'json') {
      return JSON.stringify({ highlights, exportedAt: new Date().toISOString() }, null, 2);
    }

    // Markdown format
    let md = '# Meeting Highlights\n\n';
    md += `*Exported: ${new Date().toLocaleString()}*\n\n`;

    const groupedByType = highlights.reduce((acc, h) => {
      if (!acc[h.type]) acc[h.type] = [];
      acc[h.type].push(h);
      return acc;
    }, {} as Record<string, Highlight[]>);

    const typeLabels: Record<Highlight['type'], string> = {
      action_item: '📋 Action Items',
      decision: '✅ Decisions',
      question: '❓ Questions',
      key_moment: '⭐ Key Moments',
      agreement: '👍 Agreements',
      disagreement: '👎 Points of Disagreement',
    };

    Object.entries(groupedByType).forEach(([type, items]) => {
      md += `## ${typeLabels[type as Highlight['type']] || type}\n\n`;
      items.forEach(h => {
        const time = new Date(h.timestamp).toLocaleTimeString();
        const speaker = h.participantName ? `**${h.participantName}**: ` : '';
        const bookmark = h.isBookmarked ? ' ⭐' : '';
        md += `- [${time}] ${speaker}${h.content}${bookmark}\n`;
        if (h.tags.length > 0) {
          md += `  - Tags: ${h.tags.join(', ')}\n`;
        }
      });
      md += '\n';
    });

    return md;
  }, [highlights]);

  const getHighlightsByType = useCallback((type: Highlight['type']): Highlight[] => {
    return highlights.filter(h => h.type === type);
  }, [highlights]);

  const searchHighlights = useCallback((query: string): Highlight[] => {
    const lowerQuery = query.toLowerCase();
    return highlights.filter(h => 
      h.content.toLowerCase().includes(lowerQuery) ||
      h.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
      h.participantName?.toLowerCase().includes(lowerQuery)
    );
  }, [highlights]);

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  return {
    highlights,
    isAnalyzing,
    settings,
    updateSettings,
    analyzeTranscript,
    toggleBookmark,
    addManualHighlight,
    removeHighlight,
    exportHighlights,
    getHighlightsByType,
    searchHighlights,
  };
}
