import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, BarChart2, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PollCreatorProps {
    onCreate: (pollData: PollData) => void;
}

export interface PollData {
    question: string;
    options: string[];
    pollType: 'single' | 'multiple' | 'ranking';
    allowAddOptions?: boolean;
    showResultsBeforeVote?: boolean;
    closeAt?: string; // ISO timestamp
}

export const PollCreator = ({ onCreate }: PollCreatorProps) => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [pollType, setPollType] = useState<'single' | 'multiple' | 'ranking'>('single');
    const [allowAddOptions, setAllowAddOptions] = useState(false);
    const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(true);
    const [enableClosing, setEnableClosing] = useState(false);
    const [closingTime, setClosingTime] = useState('');

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        const validOptions = options.filter(o => o.trim());

        if (!question.trim() || validOptions.length < 2) {
            return;
        }

        const pollData: PollData = {
            question: question.trim(),
            options: validOptions,
            pollType,
            allowAddOptions,
            showResultsBeforeVote
        };

        if (enableClosing && closingTime) {
            pollData.closeAt = new Date(closingTime).toISOString();
        }

        onCreate(pollData);
        resetForm();
        setOpen(false);
    };

    const resetForm = () => {
        setQuestion('');
        setOptions(['', '']);
        setPollType('single');
        setAllowAddOptions(false);
        setShowResultsBeforeVote(true);
        setEnableClosing(false);
        setClosingTime('');
    };

    const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <BarChart2 className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create a Poll</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                        {/* Question */}
                        <div className="space-y-2">
                            <Label>Question</Label>
                            <Input
                                placeholder="Ask a question..."
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            />
                        </div>

                        {/* Poll Type */}
                        <div className="space-y-2">
                            <Label>Poll Type</Label>
                            <Select value={pollType} onValueChange={(v: any) => setPollType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">Single Choice</span>
                                            <span className="text-xs text-muted-foreground">Select one option</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="multiple">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">Multiple Choice</span>
                                            <span className="text-xs text-muted-foreground">Select multiple options</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="ranking">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">Ranking</span>
                                            <span className="text-xs text-muted-foreground">Rank options by preference</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                            <Label>Options (min 2)</Label>
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveOption(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddOption} className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Option
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4 mt-4">
                        {/* Show Results Before Vote */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Show Results Before Voting</Label>
                                <p className="text-xs text-muted-foreground">
                                    Display results to users who haven't voted yet
                                </p>
                            </div>
                            <Switch
                                checked={showResultsBeforeVote}
                                onCheckedChange={setShowResultsBeforeVote}
                            />
                        </div>

                        {/* Allow Adding Options */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Allow Users to Add Options</Label>
                                <p className="text-xs text-muted-foreground">
                                    Users can suggest new options
                                </p>
                            </div>
                            <Switch
                                checked={allowAddOptions}
                                onCheckedChange={setAllowAddOptions}
                            />
                        </div>

                        {/* Enable Poll Closing */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Schedule Poll Closing</Label>
                                <p className="text-xs text-muted-foreground">
                                    Automatically close poll at a specific time
                                </p>
                            </div>
                            <Switch
                                checked={enableClosing}
                                onCheckedChange={setEnableClosing}
                            />
                        </div>

                        {/* Closing Time */}
                        {enableClosing && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Close At
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={closingTime}
                                    onChange={(e) => setClosingTime(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
                        Create Poll
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
