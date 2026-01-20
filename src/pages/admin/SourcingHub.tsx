import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Globe, Users, Play, Loader2, Sparkles, Database } from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

const SourcingHub = () => {
    const sb = supabase as any; // recruitment_* tables are not in generated client types

    const navigate = useNavigate();
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [harvesting, setHarvesting] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (selectedJob) {
            fetchConfigAndQueue();
        }
    }, [selectedJob]);

    const fetchJobs = async () => {
        try {
            const { data, error } = await sb.from('jobs').select('id, title, company_name');
            if (error) throw error;
            setJobs(data || []);
            if (data && data.length > 0) setSelectedJob(data[0].id);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchConfigAndQueue = async () => {
        if (!selectedJob) return;

        // 1. Get Active Config
        const { data: configData } = await sb
            .from('recruitment_project_configs')
            .select('*')
            .eq('job_id', selectedJob)
            .eq('is_active', true)
            .maybeSingle();

        setConfig(configData);

        // 2. Get Search Queue
        if (configData) {
            const { data: queueData } = await sb
                .from('recruitment_search_queue')
                .select('*')
                .eq('project_config_id', configData.id)
                .order('created_at', { ascending: false });

            setQueue(queueData || []);
        }
    };

    const handleGenerateStrategy = async () => {
        if (!config) {
            toast.error('No active configuration found. Calibrate the job first.');
            return;
        }
        setGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-recruitment-strategy', {
                body: { project_config_id: config.id }
            });
            if (error) throw error;
            toast.success('Strategy generated successfully');
            fetchConfigAndQueue();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to generate strategy');
        } finally {
            setGenerating(false);
        }
    };

    const handleRunHarvester = async () => {
        setHarvesting(true);
        try {
            // Trigger harvester (auto-pick mode) multiple times or for all pending
            // For MVP UI, we just trigger once to start the process
            const { data, error } = await supabase.functions.invoke('harvest-candidates', {
                body: {} // Empty body triggers auto-pick
            });

            if (error) throw error;
            toast.success(data.message || 'Harvester triggered');
            fetchConfigAndQueue();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to run harvester');
        } finally {
            setHarvesting(false);
        }
    };

    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [isBlindInfo, setIsBlindInfo] = useState(false);

    const handleCreatePresentation = async () => {
        if (!selectedJob) return;
        setLoading(true); // Re-using loading state for button spinner might be confusing, better use local

        try {
            // Check if active one exists
            const { data: existing } = await sb
                .from('recruitment_presentations')
                .select('access_token')
                .eq('job_id', selectedJob)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            let token = existing?.access_token;

            if (!token) {
                // Create new
                token = crypto.randomUUID();
                const { error } = await sb
                    .from('recruitment_presentations')
                    .insert({
                        job_id: selectedJob,
                        access_token: token,
                        is_blind: isBlindInfo,
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    });

                if (error) throw error;
            }

            setShareUrl(`${window.location.origin}/shared/p/${token}`);
            setShowShareDialog(true);
        } catch (error) {
            console.error('Error creating link:', error);
            toast.error('Failed to generate link');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <SectionLoader text="Loading Sourcing Hub..." />;

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Globe className="h-6 w-6 text-indigo-600" />
                        Sourcing Hub
                    </h1>
                    <p className="text-muted-foreground">
                        Automated candidate discovery and harvesting.
                    </p>
                </div>
                <div className="w-[300px]">
                    <Select onValueChange={setSelectedJob} value={selectedJob || undefined}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a Job" />
                        </SelectTrigger>
                        <SelectContent>
                            {jobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                    {job.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!config ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No Active Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            This job hasn't been calibrated yet. Go to Calibration to start.
                        </p>
                        <Button variant="outline" onClick={() => navigate(`/admin/jobs/${selectedJob}/calibration`)}>
                            Go to Calibration
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Strategy Control */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Strategy Engine</CardTitle>
                            <CardDescription>
                                AI agents generate boolean search strings based on your config.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">Current Config</div>
                                <div className="text-xs text-indigo-700 dark:text-indigo-300">
                                    v{config.version} (Active)
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleGenerateStrategy}
                                disabled={generating}
                            >
                                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                Generate New Strategies
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Talent Pool / Review */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Talent Pool</CardTitle>
                            <CardDescription>
                                Candidates ready for review.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => navigate(`/admin/jobs/${selectedJob}/review`)}
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Review Candidates
                            </Button>

                            <div className="pt-2 border-t">
                                <Button
                                    className="w-full bg-slate-900 text-white hover:bg-slate-800"
                                    size="sm"
                                    onClick={handleCreatePresentation}
                                >
                                    <Globe className="h-3 w-3 mr-2" />
                                    Share with Client
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Queue & Harvest */}
                    <Card className="lg:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Search Queue</CardTitle>
                                <CardDescription>
                                    {queue.length} active search tasks
                                </CardDescription>
                            </div>
                            <Button onClick={handleRunHarvester} disabled={harvesting} variant="secondary">
                                {harvesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                Run Harvester (Auto)
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                <div className="space-y-3">
                                    {queue.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Queue is empty. Generate strategies to begin.
                                        </div>
                                    )}
                                    {queue.map((item) => (
                                        <div key={item.id} className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{item.platform}</Badge>
                                                    <span className="font-medium text-sm">{item.strategy_name}</span>
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>

                                            <div className="bg-muted p-2 rounded text-xs font-mono mb-2 break-all">
                                                {item.query_payload?.query}
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Database className="h-3 w-3" />
                                                    Results: {item.result_count || 0}
                                                </span>
                                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )
            }

            {/* Share Dialog */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share with Client</DialogTitle>
                        <DialogDescription>
                            Send this secure link to your client. They can review candidates without logging in.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl || ''}
                                className="flex-1 p-2 text-sm border rounded bg-muted select-all"
                            />
                            <Button
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(shareUrl || '');
                                    toast.success('Copied to clipboard!');
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-yellow-50 p-2 rounded border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900">
                            <Sparkles className="h-4 w-4 text-yellow-600" />
                            <span>Blind Mode is {isBlindInfo ? 'ON' : 'OFF'} (Toggle coming soon)</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        processing: "bg-blue-100 text-blue-800 border-blue-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        failed: "bg-red-100 text-red-800 border-red-200"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100"}`}>
            {status}
        </span>
    );
};

export default SourcingHub;
