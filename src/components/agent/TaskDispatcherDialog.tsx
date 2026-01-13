import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { aiService } from '@/services/aiService';
import { toast } from 'sonner';
import { Loader2, BrainCircuit, CheckCircle2, User } from 'lucide-react';

interface TaskDispatcherDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function TaskDispatcherDialog({
    open,
    onOpenChange,
    onSuccess,
}: TaskDispatcherDialogProps) {
    const [loading, setLoading] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [assignedAgent, setAssignedAgent] = useState<any>(null);

    const [formData, setFormData] = useState({
        description: '',
        priority: '5',
        required_skills: '', // Comma separated for MVP
        task_type: 'delegation'
    });

    const handleDispatch = async () => {
        if (!formData.description) {
            toast.error('Please describe the task');
            return;
        }

        setLoading(true);

        try {
            const skills = formData.required_skills
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const result = await aiService.assignAgentTask({
                description: formData.description,
                priority: parseInt(formData.priority),
                required_skills: skills.length > 0 ? skills : undefined,
                task_type: formData.task_type
            });

            if (!result?.success) {
                throw new Error(result?.error || 'Failed to dispatch task');
            }

            setAssignedAgent(result.assigned_agent);
            setShowResult(true);
            toast.success('Task dispatched successfully!');
            onSuccess?.();

        } catch (error) {
            console.error('Dispatch error:', error);
            toast.error('Failed to assign task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after transition
        setTimeout(() => {
            setShowResult(false);
            setAssignedAgent(null);
            setFormData({
                description: '',
                priority: '5',
                required_skills: '',
                task_type: 'delegation'
            });
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                        <BrainCircuit className="w-6 h-6" />
                        Intelligent Task Dispatcher
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Describe the work, and our Quantum AI will route it to the optimal agent based on skills and capacity.
                    </DialogDescription>
                </DialogHeader>

                {!showResult ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-200">Task Description</Label>
                            <Textarea
                                id="description"
                                placeholder="e.g. Conduct a deep-dive analysis on competitor pricing strategies..."
                                className="bg-slate-800 border-slate-600 min-h-[100px] text-white placeholder:text-slate-500"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="skills" className="text-slate-200">Required Skills (Optional)</Label>
                                <Input
                                    id="skills"
                                    placeholder="e.g. research, analysis"
                                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                                    value={formData.required_skills}
                                    onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                                />
                                <p className="text-xs text-slate-500">Comma separated tags</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-slate-200">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                        <SelectItem value="1">Low (1)</SelectItem>
                                        <SelectItem value="5">Medium (5)</SelectItem>
                                        <SelectItem value="8">High (8)</SelectItem>
                                        <SelectItem value="10">Critical (10)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
                            <CheckCircle2 className="w-16 h-16 text-emerald-400 relative z-10" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Task Assigned!</h3>
                            <p className="text-slate-400">Optimal agent identified based on current load.</p>
                        </div>

                        {assignedAgent && (
                            <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-sm mx-auto">
                                <div className="w-12 h-12 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30">
                                    <User className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-emerald-400">{assignedAgent.display_name || assignedAgent.agent_name}</p>
                                    <p className="text-xs text-slate-400 font-mono">ID: {assignedAgent.id.slice(0, 8)}</p>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {assignedAgent.capabilities?.slice(0, 3).map((cap: string) => (
                                            <span key={cap} className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!showResult ? (
                        <>
                            <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-white/10">
                                Cancel
                            </Button>
                            <Button onClick={handleDispatch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Dispatch Task
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
