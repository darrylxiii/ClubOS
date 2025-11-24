import { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, Edit2, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Module {
    id: string;
    title: string;
    description?: string;
    estimated_minutes?: number;
}

interface CourseBuilderProps {
    modules: Module[];
    onModulesChange: (modules: Module[]) => void;
    onEditModule: (moduleId: string) => void;
    onDeleteModule: (moduleId: string) => void;
    onAddModule: () => void;
}

function SortableItem({ module, onEditModule, onDeleteModule }: { module: Module; onEditModule: (id: string) => void; onDeleteModule: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-3">
            <Card
                className={cn(
                    "p-4 flex items-center gap-4 transition-shadow",
                    isDragging ? "shadow-lg ring-2 ring-primary/20 z-10 relative" : "hover:shadow-md"
                )}
            >
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground outline-none"
                >
                    <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{module.title}</h4>
                    {module.description && (
                        <p className="text-sm text-muted-foreground truncate">
                            {module.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {module.estimated_minutes && (
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                            {module.estimated_minutes} min
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditModule(module.id)}
                        className="h-8 w-8"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteModule(module.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}

export function CourseBuilder({ modules, onModulesChange, onEditModule, onDeleteModule, onAddModule }: CourseBuilderProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = modules.findIndex((m) => m.id === active.id);
            const newIndex = modules.findIndex((m) => m.id === over?.id);

            onModulesChange(arrayMove(modules, oldIndex, newIndex));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Course Modules</h3>
                <Button onClick={onAddModule} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Module
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={modules.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {modules.map((module) => (
                            <SortableItem
                                key={module.id}
                                module={module}
                                onEditModule={onEditModule}
                                onDeleteModule={onDeleteModule}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {modules.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                    <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Start Building Your Course</h3>
                    <p className="text-muted-foreground mb-4">
                        Add your first module to get started
                    </p>
                    <Button onClick={onAddModule}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Module
                    </Button>
                </div>
            )}
        </div>
    );
}
