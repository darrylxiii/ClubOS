import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const QuantumPulse = () => {
    const { currentRole } = useRole();
    const navigate = useNavigate();
    const [stalledCount, setStalledCount] = useState(0);
    const [isScanning, setIsScanning] = useState(true);
    const [pulseColor, setPulseColor] = useState("bg-emerald-500");
    const [expanded, setExpanded] = useState(false);

    // Only render for admins
    // if (currentRole !== 'admin') return null; // Moved to the return statement

    useEffect(() => {
        if (currentRole !== 'admin') return;

        // Initial fetch
        fetchStalledCount();

        // Subscribe to changes in pilot_tasks for real-time updates
        const channel = supabase
            .channel('quantum-pulse-tasks')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pilot_tasks',
                    filter: 'task_type=eq.candidate_review'
                },
                () => {
                    // Flash yellow on update
                    setPulseColor("bg-yellow-400");
                    setTimeout(() => setPulseColor("bg-emerald-500"), 1000);
                    fetchStalledCount();
                }
            )
            .subscribe();

        // Mock scanning effect
        const scanInterval = setInterval(() => {
            setIsScanning(prev => !prev);
        }, 2000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(scanInterval);
        };
    }, [currentRole]);

    const fetchStalledCount = async () => {
        try {
            const { count } = await supabase
                .from('pilot_tasks')
                .select('*', { count: 'exact', head: true })
                .eq('task_type', 'candidate_review')
                .eq('status', 'pending');

            setStalledCount(count || 0);
        } catch (err) {
            console.error("Pulse error:", err);
        }
    };

    if (currentRole !== 'admin') return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-6">
            <div
                className={cn(
                    "pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-full py-2 px-6 shadow-2xl transition-all duration-300 flex items-center gap-6",
                    expanded ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
                )}
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
            >
                {/* Heartbeat Section */}
                <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                    <div className={`w-2 h-2 rounded-full ${pulseColor} animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
                    <span className="text-xs font-mono text-emerald-400 font-bold tracking-wider">
                        SENTINEL {isScanning ? "SCANNING..." : "ACTIVE"}
                    </span>
                </div>

                {/* Stalled Candidates Alert */}
                <div
                    className={cn(
                        "flex items-center gap-2 cursor-pointer transition-colors hover:text-white",
                        stalledCount > 0 ? "text-yellow-400" : "text-muted-foreground"
                    )}
                    onClick={() => navigate('/pilot')}
                >
                    <AlertTriangle className={cn("w-4 h-4", stalledCount > 0 && "animate-pulse")} />
                    <span className="text-xs font-mono font-medium">
                        {stalledCount} STALLED CANDIDATES
                    </span>
                </div>

                {/* Context Health (Mock for now, can perform real check later) */}
                <div className="flex items-center gap-2 text-blue-400 border-l border-white/10 pl-4">
                    <Brain className="w-4 h-4" />
                    <span className="text-xs font-mono">
                        CTX LOAD: 98%
                    </span>
                </div>
            </div>
        </div>
    );
};
