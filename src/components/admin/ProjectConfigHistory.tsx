import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { History, GitCompare, RotateCcw } from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectConfig {
    id: string;
    version: number;
    config: any;
    created_at: string;
    is_active: boolean;
}

interface ProjectConfigHistoryProps {
    jobId: string;
}

export const ProjectConfigHistory = ({ jobId }: ProjectConfigHistoryProps) => {
    const [history, setHistory] = useState<ProjectConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<ProjectConfig | null>(null);
    const [compareVersion, setCompareVersion] = useState<ProjectConfig | null>(null);
    const [rollbackLoading, setRollbackLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [jobId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('recruitment_project_configs' as any)
                .select('*')
                .eq('job_id', jobId)
                .order('version', { ascending: false });

            if (error) throw error;
            const configs = (data || []) as ProjectConfig[];
            setHistory(configs);
            if (configs.length > 0) {
                setSelectedVersion(configs[0]);
            }
        } catch (error) {
            console.error('Error fetching config history:', error);
            toast.error('Failed to load configuration history');
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (config: ProjectConfig) => {
        if (!config) return;
        setRollbackLoading(true);
        try {
            // 1. Deactivate current active config
            await supabase
                .from('recruitment_project_configs' as any)
                .update({ is_active: false })
                .eq('job_id', jobId)
                .eq('is_active', true);

            // 2. Create new version with old config content
            const latestVersion = history.length > 0 ? history[0].version : 0;
            const { error } = await supabase
                .from('recruitment_project_configs' as any)
                .insert({
                    job_id: jobId,
                    config: config.config,
                    version: latestVersion + 1,
                    is_active: true,
                    parent_config_id: config.id
                });

            if (error) throw error;

            toast.success(`Rolled back to version ${config.version} (created v${latestVersion + 1})`);
            fetchHistory();
        } catch (error) {
            console.error('Rollback failed:', error);
            toast.error('Failed to rollback configuration');
        } finally {
            setRollbackLoading(false);
        }
    };

    const renderDiff = (v1: ProjectConfig, v2: ProjectConfig) => {
        // Simple JSON string compare for MVP
        const json1 = JSON.stringify(v1.config, null, 2);
        const json2 = JSON.stringify(v2.config, null, 2);

        return (
            <div className="grid grid-cols-2 gap-4 h-[500px]">
                <div className="space-y-2">
                    <Badge variant="outline">Version {v1.version}</Badge>
                    <ScrollArea className="h-full border rounded p-4 bg-muted/50 font-mono text-xs whitespace-pre-wrap">
                        {json1}
                    </ScrollArea>
                </div>
                <div className="space-y-2">
                    <Badge variant="outline">Version {v2.version}</Badge>
                    <ScrollArea className="h-full border rounded p-4 bg-muted/50 font-mono text-xs whitespace-pre-wrap">
                        {json2}
                    </ScrollArea>
                </div>
            </div>
        );
    };

    if (loading) return <SectionLoader text="Loading version history..." className="py-8" />;

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No configuration history found for this job.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Configuration History
                </h3>
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Version List */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Versions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <div className="divide-y">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedVersion?.id === item.id ? 'bg-muted' : ''
                                            }`}
                                        onClick={() => setSelectedVersion(item)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                    v{item.version}
                                                </Badge>
                                                {item.is_active && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {JSON.stringify(item.config).substring(0, 50)}...
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Selected Version Detail */}
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Version {selectedVersion?.version}</CardTitle>
                            <CardDescription>
                                Created {selectedVersion && new Date(selectedVersion.created_at).toLocaleString()}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <GitCompare className="h-4 w-4 mr-2" />
                                        Compare
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh]">
                                    <DialogHeader>
                                        <DialogTitle>Compare Versions</DialogTitle>
                                        <DialogDescription>
                                            Select a version to compare with v{selectedVersion?.version}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4">
                                        <select
                                            className="w-full border rounded p-2"
                                            onChange={(e) => {
                                                const v = history.find(h => h.id === e.target.value);
                                                setCompareVersion(v || null);
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select comparison version...</option>
                                            {history.filter(h => h.id !== selectedVersion?.id).map(h => (
                                                <option key={h.id} value={h.id}>v{h.version} ({new Date(h.created_at).toLocaleDateString()})</option>
                                            ))}
                                        </select>

                                        {compareVersion && selectedVersion && renderDiff(selectedVersion, compareVersion)}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {!selectedVersion?.is_active && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => selectedVersion && handleRollback(selectedVersion)}
                                    disabled={rollbackLoading}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Rollback to v{selectedVersion?.version}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-gray-50 dark:bg-gray-900">
                            <pre className="text-xs font-mono">
                                {selectedVersion && JSON.stringify(selectedVersion.config, null, 2)}
                            </pre>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
