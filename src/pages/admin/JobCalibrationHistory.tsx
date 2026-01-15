import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectConfigHistory } from "@/components/admin/ProjectConfigHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { InlineLoader, SectionLoader } from "@/components/ui/unified-loader";

const JobCalibrationHistory = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<any>(null);
    const [calibrating, setCalibrating] = useState(false);
    const [intakeNotes, setIntakeNotes] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (jobId) fetchJob();
    }, [jobId]);

    const fetchJob = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select('id, title, company_id')
            .eq('id', jobId)
            .single();

        if (error) {
            console.error('Error fetching job:', error);
            toast.error('Job not found');
            return;
        }
        setJob(data);
    };

    const handleCalibrate = async () => {
        setCalibrating(true);
        try {
            const { data, error } = await supabase.functions.invoke('calibrate-recruitment', {
                body: {
                    job_id: jobId,
                    intake_notes: intakeNotes,
                    dry_run: false
                }
            });

            if (error) throw error;

            toast.success(`Calibration completed! Created v${data.version || '?'}`);
            setIntakeNotes('');
            // Force refresh the ProjectConfigHistory component by remounting
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Calibration failed:', error);
            toast.error('Calibration failed. Check console.');
        } finally {
            setCalibrating(false);
        }
    };

    if (!job) return <SectionLoader text="Loading job context..." />;

    return (
        <div className="container mx-auto py-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Calibration & Governance: {job.title}
                    </h1>
                    <p className="text-muted-foreground">
                        Manage intelligence versions, client bias, and scoring logic.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Panel: Trigger New Calibration */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                Run New Calibration
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                Generates a new "Project Config" version by analyzing the JD and your notes.
                            </p>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Intake / Calibration Notes</Label>
                                    <Textarea
                                        placeholder="E.g. Client hates job hoppers, loves Ivy League..."
                                        className="h-32 text-xs"
                                        value={intakeNotes}
                                        onChange={(e) => setIntakeNotes(e.target.value)}
                                    />
                                </div>

                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={handleCalibrate}
                                    disabled={calibrating}
                                >
                                    {calibrating ? <InlineLoader text="Calibrating..." /> : <><Play className="h-3 w-3 mr-2" /> Start Calibration</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: History */}
                <div className="lg:col-span-3">
                    <ProjectConfigHistory jobId={jobId!} key={refreshKey} />
                </div>
            </div>
        </div>
    );
};

export default JobCalibrationHistory;
