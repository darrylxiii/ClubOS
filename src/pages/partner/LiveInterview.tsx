import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PartnerPageHeader } from "@/components/partner/PartnerPageHeader";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";

interface AnalysisResult {
    status: 'safe' | 'alert' | 'suggestion';
    message: string;
    details?: string;
    timestamp: number;
}

const LiveInterview = () => {
    const { t } = useTranslation('partner');
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
                handleStreamAnalysis(currentTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    toast.error(t('liveInterview.micDenied'));
                    setIsRecording(false);
                }
            };
        } else {
            toast.error(t('liveInterview.noSpeechSupport'));
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    const handleStreamAnalysis = async (fullText: string) => {
        if (fullText.length - lastProcessedIndex.current > 50) {
            const chunk = fullText.substring(lastProcessedIndex.current);
            lastProcessedIndex.current = fullText.length;

            try {
                const { data, error } = await supabase.functions.invoke('analyze-interview-stream', {
                    body: { transcript_chunk: chunk }
                });

                if (error) throw error;

                if (data && data.status !== 'safe') {
                    setAnalysisLog(prev => [{
                        status: data.status,
                        message: data.message,
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
            toast.info(t('liveInterview.listening'));
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <PartnerPageHeader
                title={t('liveInterview.title')}
                subtitle={t('liveInterview.subtitle')}
                actions={
                    <Button
                        onClick={toggleRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="sm"
                        className="h-9 gap-1.5"
                    >
                        {isRecording ? <><MicOff className="h-4 w-4" />{t('liveInterview.stop')}</> : <><Mic className="h-4 w-4" />{t('liveInterview.start')}</>}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
                <PartnerGlassCard
                    title={t('liveInterview.liveTranscript')}
                    description={t('liveInterview.speechToText')}
                    className="md:col-span-2 flex flex-col h-full"
                    contentClassName="flex-1 overflow-hidden"
                >
                    <ScrollArea className="h-full rounded-md p-4 bg-card/20 border border-border/10">
                        <p className="whitespace-pre-wrap text-lg leading-relaxed">
                            {transcript || <span className="text-muted-foreground italic">{t('liveInterview.waitingForSpeech')}</span>}
                        </p>
                    </ScrollArea>
                </PartnerGlassCard>

                <PartnerGlassCard
                    title={t('liveInterview.sentinelHud')}
                    description={t('liveInterview.liveAiInsights')}
                    icon={<CheckCircle className="text-primary h-5 w-5" />}
                    className="flex flex-col h-full border-l-2 border-l-primary"
                    contentClassName="flex-1 overflow-hidden"
                >
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {analysisLog.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    {t('liveInterview.noAlerts')}
                                </div>
                            )}
                            {analysisLog.map((log, i) => (
                                <div key={i} className={`p-4 rounded-lg border ${
                                    log.status === 'alert' 
                                        ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                                        : 'bg-primary/10 border-primary/20 text-primary'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {log.status === 'alert' 
                                            ? <AlertTriangle className="h-5 w-5 shrink-0" /> 
                                            : <Lightbulb className="h-5 w-5 shrink-0" />
                                        }
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
                </PartnerGlassCard>
            </div>
        </div>
    );
};

export default LiveInterview;
