// ... (start of file)
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

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
                    AI Insight
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This question is frequently asked to assess {selectedPattern.question_category || 'general'} competency.
                    Candidates often struggle to provide concrete examples. Recommendation: Coach candidates to use the STAR method specifically for this topic.
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
                        <div className="text-2xl font-bold text-green-500">85%</div>
                        <p className="text-xs text-muted-foreground">Candidate Success Rate</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Context Clips (3)
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-24 h-16 bg-black/10 rounded flex items-center justify-center flex-shrink-0">
                          <Play className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Candidate {String.fromCharCode(64 + i)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            "Well, in my previous role I encountered..."
                          </p>
                          <Badge variant="outline" className="text-[10px] mt-2 h-5">02:14</Badge>
                        </div>
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
