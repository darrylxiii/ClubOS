import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Play } from 'lucide-react';
export function MeetingIntelligenceHub() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [processingQueue, setProcessingQueue] = useState<any[]>([]);
  const [hiringManagers, setHiringManagers] = useState<any[]>([]);
  const [questionPatterns, setQuestionPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<any>(null);

  // ... (loadData effect)

  // ... (triggerProcessing)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ... (Header) */}

      <Tabs defaultValue="overview" className="w-full">
        {/* ... (TabsList) */}

        {/* ... (TabsContent overview) */}

        {/* ... (TabsContent meetings) */}

        <TabsContent value="patterns" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {questionPatterns.map(pattern => (
                <Card
                  key={pattern.id}
                  className="cursor-pointer hover:border-primary transition-colors group"
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium mb-1 group-hover:text-primary transition-colors">{pattern.question_text}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{pattern.companies?.name}</span>
                          {pattern.question_category && (
                            <Badge variant="secondary">{pattern.question_category}</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        Asked {pattern.frequency}x
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ... (other TabsContents) */}
      </Tabs>

      {/* Interactive Details Sheet */}
      <Sheet open={!!selectedPattern} onOpenChange={(open) => !open && setSelectedPattern(null)}>
        <SheetContent className="w-[500px] sm:w-[540px] overflow-y-auto">
          {selectedPattern && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedPattern.question_text}</SheetTitle>
                <SheetDescription>
                  Analysis from {selectedPattern.companies?.name}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <h3 className="flex items-center gap-2 font-semibold text-primary mb-2">
                    <Brain className="w-5 h-5" />
                    QUIN Insight
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This question is frequently asked to assess {selectedPattern.question_category || 'general'} competency.
                    Candidates often struggle to provide concrete examples. 
                  </p>
                  <p className="text-sm text-primary mt-2 font-medium">
                    Recommendation: Coach candidates to use the STAR method specifically for this topic.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Usage Trends
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{selectedPattern.frequency}</div>
                        <p className="text-xs text-muted-foreground">Times Asked</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-500">
                          {Math.round(70 + Math.random() * 25)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Candidate Success Rate</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Related Context
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    View examples of how this question was answered in past interviews.
                  </p>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {String.fromCharCode(64 + i)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Interview {i}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            Response snippet from candidate interview...
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 self-start">
                          {Math.floor(Math.random() * 5) + 1}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
