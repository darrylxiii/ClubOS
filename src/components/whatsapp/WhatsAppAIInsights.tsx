import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ConversationInsight {
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  buyingSignals: string[];
  objections: string[];
  actionItems: { text: string; priority: 'high' | 'medium' | 'low' }[];
  nextBestAction: string;
  relationshipScore: number;
  engagementLevel: 'high' | 'medium' | 'low';
}

interface WhatsAppAIInsightsProps {
  conversationId: string;
  candidateName: string;
  insights: ConversationInsight | null;
  loading?: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
  onCreateTask?: (text: string) => void;
}

export function WhatsAppAIInsights({
  conversationId,
  candidateName,
  insights,
  loading,
  onRefresh,
  onClose,
  onCreateTask
}: WhatsAppAIInsightsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    signals: true,
    actions: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-amber-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-500 bg-emerald-500/10';
      case 'negative': return 'text-red-500 bg-red-500/10';
      default: return 'text-amber-500 bg-amber-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <Card className="h-full bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="h-full bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Insights
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-center">No insights available yet</p>
          <p className="text-sm text-center">Send a few messages to generate AI insights</p>
          {onRefresh && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Insights
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border-primary/20 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Insights
          </CardTitle>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Conversation analysis for {candidateName}
        </p>
      </CardHeader>

      <ScrollArea className="flex-1 h-[calc(100%-80px)]">
        <CardContent className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className={cn(
              "p-3 rounded-lg text-center",
              getSentimentColor(insights.sentiment)
            )}>
              <div className="flex justify-center mb-1">
                {getSentimentIcon(insights.sentiment)}
              </div>
              <p className="text-xs font-medium capitalize">{insights.sentiment}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <div className="flex justify-center mb-1">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-medium">{insights.relationshipScore}% Match</p>
            </div>
            <div className={cn(
              "p-3 rounded-lg text-center",
              insights.engagementLevel === 'high' ? 'bg-emerald-500/10' :
                insights.engagementLevel === 'medium' ? 'bg-amber-500/10' : 'bg-red-500/10'
            )}>
              <div className="flex justify-center mb-1">
                <MessageSquare className={cn(
                  "w-4 h-4",
                  insights.engagementLevel === 'high' ? 'text-emerald-500' :
                    insights.engagementLevel === 'medium' ? 'text-amber-500' : 'text-red-500'
                )} />
              </div>
              <p className="text-xs font-medium capitalize">{insights.engagementLevel}</p>
            </div>
          </div>

          {/* Summary Section */}
          <div>
            <button
              className="flex items-center justify-between w-full text-left py-2"
              onClick={() => toggleSection('summary')}
            >
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Summary
              </h4>
              {expandedSections.summary ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.summary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insights.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {insights.keyTopics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buying Signals & Objections */}
          <div>
            <button
              className="flex items-center justify-between w-full text-left py-2"
              onClick={() => toggleSection('signals')}
            >
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Signals & Objections
              </h4>
              {expandedSections.signals ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.signals && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  {insights.buyingSignals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-500 mb-1.5">
                        🔥 Buying Signals
                      </p>
                      <ul className="space-y-1">
                        {insights.buyingSignals.map((signal, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.objections.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-500 mb-1.5">
                        ⚠️ Objections
                      </p>
                      <ul className="space-y-1">
                        {insights.objections.map((objection, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            {objection}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Items */}
          <div>
            <button
              className="flex items-center justify-between w-full text-left py-2"
              onClick={() => toggleSection('actions')}
            >
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Action Items
              </h4>
              {expandedSections.actions ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.actions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2"
                >
                  {insights.actionItems.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border",
                        getPriorityColor(item.priority)
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-sm">{item.text}</p>
                      </div>
                      {onCreateTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => onCreateTask(item.text)}
                        >
                          + Task
                        </Button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Next Best Action */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Recommended Next Step</h4>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {insights.nextBestAction}
            </p>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
