import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, AlertTriangle, CheckCircle, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { toast } from 'sonner';

interface LiveInterviewAnalysisProps {
    meetingId: string;
    transcript: string;
}

interface AnalysisResult {
    communication_clarity: number;
    technical_depth: number;
    culture_fit: number;
    overall_score: number;
    key_insights: string;
    red_flags: string[];
    green_flags: string[];
    follow_up_suggestions: string[];
}

export function LiveInterviewAnalysis({ meetingId, transcript }: LiveInterviewAnalysisProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    const handleAnalyze = async () => {
        if (!transcript || transcript.length < 50) {
            toast.error("Not enough data - wait for more conversation before analyzing.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const data = await aiService.analyzeInterviewRealtime({
                meetingId,
                transcript: transcript.slice(-8000)
            });

            if (data?.scores) {
                setResult(data.scores);
                toast.success("Analysis complete - AI insights generated successfully.");
            }
        } catch (error: any) {
            console.error('Analysis failed:', error);
            toast.error(error.message || "Analysis failed - could not generate insights.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!isExpanded) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="fixed right-0 top-1/2 transform -translate-y-1/2 rounded-l-xl rounded-r-none h-12 w-8 bg-background/80 backdrop-blur border-r-0 shadow-lg z-50 hover:w-10 transition-all"
                onClick={() => setIsExpanded(true)}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <div className="fixed right-4 top-24 bottom-24 w-80 flex flex-col gap-4 z-40 animate-in slide-in-from-right duration-300 pointer-events-none">
            <div className="flex-1 pointer-events-auto flex flex-col gap-4">
                {/* Transcript Feed */}
                <Card className="bg-black/40 backdrop-blur-md border-white/10 shadow-2xl flex-1 max-h-[40%] flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <span className="text-xs font-medium text-white/70 flex items-center gap-2">
                            <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                            Live Transcript
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/50 hover:text-white"
                            onClick={() => setIsExpanded(false)}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <p className="text-sm text-white/80 leading-relaxed font-mono whitespace-pre-wrap">
                            {transcript || "Listening for speech..."}
                        </p>
                    </ScrollArea>
                </Card>

                {/* AI Analysis Panel */}
                <Card className="bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-white">AI Coach</h3>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
                        >
                            {isAnalyzing ? (
                                <Sparkles className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Analyze
                                </>
                            )}
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {result ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Scores */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/70">Overall Fit</span>
                                        <Badge variant={result.overall_score > 80 ? "default" : "secondary"} className="bg-green-500/20 text-green-300 border-green-500/30">
                                            {result.overall_score}%
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="text-xs text-white/50 mb-1">Tech</div>
                                            <div className="font-bold text-blue-400">{result.technical_depth}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="text-xs text-white/50 mb-1">Comms</div>
                                            <div className="font-bold text-purple-400">{result.communication_clarity}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="text-xs text-white/50 mb-1">Culture</div>
                                            <div className="font-bold text-pink-400">{result.culture_fit}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Key Insight */}
                                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20">
                                    <p className="text-sm text-purple-200 leading-relaxed">
                                        {result.key_insights}
                                    </p>
                                </div>

                                {/* Flags */}
                                {result.red_flags && result.red_flags.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Attention Points
                                        </span>
                                        {result.red_flags.map((flag, i) => (
                                            <div key={i} className="text-xs text-white/80 pl-2 border-l-2 border-red-500/50">
                                                {flag}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {result.follow_up_suggestions && result.follow_up_suggestions.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Suggested Follow-ups
                                        </span>
                                        {result.follow_up_suggestions.slice(0, 2).map((q, i) => (
                                            <div key={i} className="text-xs text-white/80 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                                "{q}"
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-white/30 space-y-4">
                                <Brain className="w-12 h-12 opacity-20" />
                                <p className="text-sm max-w-[200px]">
                                    Click "Analyze" to generate real-time insights based on the transcript.
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                </Card>
            </div>
        </div>
    );
}
