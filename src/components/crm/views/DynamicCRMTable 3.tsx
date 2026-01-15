import { useState, useEffect } from 'react';
import { useCRMSavedViews } from '@/hooks/useCRMSavedViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface DynamicCRMTableProps {
    entityType: 'contact' | 'deal' | 'company' | 'prospect';
    onViewChange: (filters: any) => void;
}

export function DynamicCRMTable({ entityType, onViewChange }: DynamicCRMTableProps) {
    const { views, activeView, setActiveView, saveView, deleteView } = useCRMSavedViews(entityType);

    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
    const [tempFilterName, setTempFilterName] = useState('');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // Apply filters when view changes
    useEffect(() => {
        if (activeView) {
            setActiveFilters(activeView.filters || {});
            onViewChange(activeView.filters || {});
        } else {
            setActiveFilters({});
            onViewChange({});
        }
    }, [activeView, onViewChange]);

    const handleApplyFilter = (key: string, value: any) => {
        const newFilters = { ...activeFilters, [key]: value };
        setActiveFilters(newFilters);
        onViewChange(newFilters);
        // If we modify an active view, we might want to "detach" it or show it as modified
        // For simplicity, we just keep the active view selected but filters overridden locally
    };

    const clearFilter = (key: string) => {
        const newFilters = { ...activeFilters };
        delete newFilters[key];
        setActiveFilters(newFilters);
        onViewChange(newFilters);
    };

    const handleSaveView = async () => {
        if (!tempFilterName) return;
        await saveView(tempFilterName, {
            filters: activeFilters,
            sorting: {}, // Implement sorting later
            columns: [] // Implement columns later
        });
        setTempFilterName('');
        setIsSaveDialogOpen(false);
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <Button
                        variant={!activeView ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView(null)}
                        className="whitespace-nowrap"
                    >
                        All {entityType}s
                    </Button>

                    {views.map(view => (
                        <div key={view.id} className="group relative flex items-center">
                            <Button
                                variant={activeView?.id === view.id ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setActiveView(view)}
                                className="whitespace-nowrap pr-8"
                            >
                                {view.name}
                            </Button>
                            <X
                                className={`h-3 w-3 absolute right-2 cursor-pointer text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteView(view.id);
                                }}
                            />
                        </div>
                    ))}

                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-2 gap-1 border-dashed">
                                <Plus className="h-3 w-3" /> Save View
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Current View</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label>View Name</Label>
                                <Input
                                    placeholder="e.g. High Value Leads CA"
                                    value={tempFilterName}
                                    onChange={e => setTempFilterName(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSaveView}>Save View</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter Bar (Simplified Prototype) */}
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="h-3 w-3" />
                            Add Filter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        {/* This would be a more complex filter builder */}
                        <div className="p-4 grid gap-4">
                            <div className="grid gap-2">
                                <Label>Stage</Label>
                                <Select onValueChange={(val) => handleApplyFilter('stage', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="closed_won">Won</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Add more generic filters here */}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Active Filters Display */}
                {Object.entries(activeFilters).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="gap-1 animate-in fade-in zoom-in">
                        {key}: {String(value)}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter(key)} />
                    </Badge>
                ))}
            </div>
        </div>
    );
}
