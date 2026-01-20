
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { aiService } from "@/services/aiService";

interface AnalysisResult {
    status: 'safe' | 'alert' | 'suggestion';
    message: string;
    details?: string;
    timestamp: number;
}

const LiveInterview = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<string>("");
    const [analysisLog, setAnalysisLog] = useState<AnalysisResult[]>([]);
    const recognitionRef = useRef<any>(null);
    const lastProcessedIndex = useRef<number>(0);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = "";
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);

                // Analyze periodically or on pause (Debounce logic here would be better, but simpler for MVP)
                handleStreamAnalysis(currentTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone access denied.");
                    setIsRecording(false);
                }
            };
        } else {
            toast.error("Browser does not support Speech Recognition.");
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    const handleStreamAnalysis = async (fullText: string) => {
        // Only analyze new chunks of significant length (~50 chars) to save API calls
        if (fullText.length - lastProcessedIndex.current > 50) {
            const chunk = fullText.substring(lastProcessedIndex.current);
            lastProcessedIndex.current = fullText.length;

            try {
                // Call our Sentinel Brain
                const data = await aiService.analyzeInterviewStream({
                    transcript_chunk: chunk,
                }) as any;

                if (data && data.status !== 'safe') {
                    setAnalysisLog(prev => [{
                        status: data.status as AnalysisResult['status'],
                        message: data.message ?? '',
                        details: data.details,
                        timestamp: Date.now()
                    }, ...prev]);

                    if (data.status === 'alert') toast.warning(data.message);
                    if (data.status === 'suggestion') toast.info(data.message);
                }

            } catch (err) {
                console.error("Analysis failed", err);
            }
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
            toast.info("Sentinel is listening...");
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Interview Sentinel</h1>
                    <p className="text-muted-foreground">Real-time Fact Checking & Copilot</p>
                </div>
                <Button
                    onClick={toggleRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                >
                    {isRecording ? <><MicOff className="mr-2 h-4 w-4" /> Stop Analysis</> : <><Mic className="mr-2 h-4 w-4" /> Start Interview</>}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
                {/* Live Transcript Panel */}
                <Card className="md:col-span-2 flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Live Transcript</CardTitle>
                        <CardDescription>Real-time speech-to-text stream</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full border rounded-md p-4 bg-muted/30">
                            <p className="whitespace-pre-wrap text-lg leading-relaxed">
                                {transcript || <span className="text-muted-foreground italic">Waiting for speech...</span>}
                            </p>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Sentinel HUD Panel */}
                <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l-4 border-l-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="text-green-500 h-5 w-5" />
                            Sentinel HUD
                        </CardTitle>
                        <CardDescription>Live AI Insights</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {analysisLog.length === 0 && (
                                    <div className="text-center text-muted-foreground py-10">
                                        No alerts yet. System is monitoring...
                                    </div>
                                )}
                                {analysisLog.map((log, i) => (
                                    <div key={i} className={`p-4 rounded-lg border ${log.status === 'alert' ? 'bg-red-50 border-red-200 text-red-900' :
                                        log.status === 'suggestion' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-gray-50'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            {log.status === 'alert' ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" /> : <Lightbulb className="h-5 w-5 shrink-0 text-blue-600" />}
                                            <div>
                                                <div className="font-semibold text-sm uppercase tracking-wider mb-1">{log.status}</div>
                                                <div className="font-medium">{log.message}</div>
                                                {log.details && <div className="text-sm mt-2 opacity-90">{log.details}</div>}
                                            </div>
                                        </div>
                                        <div className="text-xs text-right mt-2 opacity-50">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LiveInterview;
