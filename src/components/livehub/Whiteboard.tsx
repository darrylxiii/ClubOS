import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Pen, Trash2, Undo, Redo, Download, Save, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWhiteboardPersistence } from '@/hooks/useWhiteboardPersistence';
import { toast } from 'sonner';

interface WhiteboardProps {
    channelId: string;
    onSendEvent: (event: any) => void;
}

export const Whiteboard = ({ channelId, onSendEvent }: WhiteboardProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isRemoteUpdate = useRef(false);
    const undoStack = useRef<string[]>([]);
    const redoStack = useRef<string[]>([]);

    const persistence = useWhiteboardPersistence({
        channelId,
        enabled: true,
        autoSaveInterval: 3000
    });

    useEffect(() => {
        if (!canvasRef.current) return;

        const initCanvas = async () => {
            // Initialize Fabric Canvas
            const canvas = new fabric.Canvas(canvasRef.current!, {
                isDrawingMode: true,
                width: 800,
                height: 600,
                backgroundColor: '#ffffff',
            });

            fabricCanvasRef.current = canvas;

            // Set initial brush
            if (canvas.freeDrawingBrush) {
                canvas.freeDrawingBrush.color = color;
                canvas.freeDrawingBrush.width = brushSize;
            }

            // Load existing state
            const existingState = await persistence.loadWhiteboardState();
            if (existingState && existingState.objects) {
                isRemoteUpdate.current = true;
                canvas.loadFromJSON(existingState, () => {
                    canvas.renderAll();
                    isRemoteUpdate.current = false;
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }

            // Event Listeners for Sync and Persistence
            canvas.on('path:created', (e: any) => {
                if (isRemoteUpdate.current) return;

                const path = e.path;
                if (!path) return;

                // Send to other users via WebRTC
                const json = path.toObject();
                onSendEvent({
                    type: 'draw',
                    data: json
                });

                // Auto-save to database (debounced)
                const canvasState = canvas.toJSON();
                persistence.scheduleAutoSave(canvasState);

                // Log operation for undo/redo
                persistence.logOperation('draw', json);

                // Update undo stack
                pushToUndoStack(canvas);
            });

            // Handle object modifications (move, scale, etc.)
            canvas.on('object:modified', () => {
                if (isRemoteUpdate.current) return;

                const canvasState = canvas.toJSON();
                persistence.scheduleAutoSave(canvasState);
                pushToUndoStack(canvas);
            });

            // Handle Resize
            const resizeCanvas = () => {
                const parent = canvasRef.current?.parentElement;
                if (parent) {
                    canvas.setDimensions({
                        width: parent.clientWidth,
                        height: parent.clientHeight
                    });
                }
            };

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            // Listen for remote events (WebRTC)
            const handleRemoteEvent = (event: CustomEvent) => {
                const { type, data } = event.detail;

                if (type === 'draw') {
                    isRemoteUpdate.current = true;
                    fabric.util.enlivenObjects([data], {
                        reviver: (err: any, objects: any) => {
                            if (!err && objects.length > 0) {
                                objects.forEach((obj: any) => {
                                    canvas.add(obj);
                                });
                                canvas.renderAll();
                            }
                            isRemoteUpdate.current = false;
                        }
                    });
                } else if (type === 'clear') {
                    isRemoteUpdate.current = true;
                    canvas.clear();
                    canvas.backgroundColor = '#ffffff';
                    canvas.renderAll();
                    isRemoteUpdate.current = false;
                }
            };

            window.addEventListener(`whiteboard:${channelId}`, handleRemoteEvent as EventListener);

            // Subscribe to database changes (cross-session persistence sync)
            const unsubscribe = persistence.subscribeToChanges((stateData, userId) => {
                isRemoteUpdate.current = true;
                canvas.loadFromJSON(stateData, () => {
                    canvas.renderAll();
                    isRemoteUpdate.current = false;
                });
            });

            return () => {
                window.removeEventListener(`whiteboard:${channelId}`, handleRemoteEvent as EventListener);
                window.removeEventListener('resize', resizeCanvas);
                unsubscribe();
                canvas.dispose();
            };
        };

        initCanvas();
    }, [channelId]);

    // Update Brush
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !canvas.freeDrawingBrush) return;

        if (isEraser) {
            canvas.freeDrawingBrush.color = '#ffffff'; // Simple eraser (white paint)
            canvas.freeDrawingBrush.width = brushSize * 5;
        } else {
            canvas.freeDrawingBrush.color = color;
            canvas.freeDrawingBrush.width = brushSize;
        }
    }, [color, brushSize, isEraser]);

    const pushToUndoStack = (canvas: fabric.Canvas) => {
        const json = JSON.stringify(canvas.toJSON());
        undoStack.current.push(json);
        redoStack.current = []; // Clear redo stack on new action
    };

    const handleUndo = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || undoStack.current.length === 0) return;

        const currentState = JSON.stringify(canvas.toJSON());
        redoStack.current.push(currentState);

        const previousState = undoStack.current.pop();
        if (previousState) {
            isRemoteUpdate.current = true;
            canvas.loadFromJSON(JSON.parse(previousState), () => {
                canvas.renderAll();
                isRemoteUpdate.current = false;
            });

            persistence.saveWhiteboardState(JSON.parse(previousState));
            persistence.logOperation('undo', {});
        }
    };

    const handleRedo = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || redoStack.current.length === 0) return;

        const currentState = JSON.stringify(canvas.toJSON());
        undoStack.current.push(currentState);

        const nextState = redoStack.current.pop();
        if (nextState) {
            isRemoteUpdate.current = true;
            canvas.loadFromJSON(JSON.parse(nextState), () => {
                canvas.renderAll();
                isRemoteUpdate.current = false;
            });

            persistence.saveWhiteboardState(JSON.parse(nextState));
            persistence.logOperation('redo', {});
        }
    };

    const clearCanvas = async () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
            onSendEvent({ type: 'clear' });

            await persistence.clearWhiteboardState();
            undoStack.current = [];
            redoStack.current = [];
        }
    };

    const handleManualSave = async () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            const state = canvas.toJSON();
            await persistence.saveWhiteboardState(state);
            toast.success('Whiteboard saved');
        }
    };

    const downloadCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });
            const link = document.createElement('a');
            link.download = `whiteboard-${new Date().toISOString()}.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleExport = async () => {
        const json = await persistence.exportToJSON();
        if (json) {
            const blob = new Blob([json], { type: 'application/json' });
            const link = document.createElement('a');
            link.download = `whiteboard-${channelId}-${new Date().toISOString()}.json`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Whiteboard exported');
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const jsonString = event.target?.result as string;
                    const state = await persistence.importFromJSON(jsonString);
                    if (state && fabricCanvasRef.current) {
                        isRemoteUpdate.current = true;
                        fabricCanvasRef.current.loadFromJSON(state, () => {
                            fabricCanvasRef.current?.renderAll();
                            isRemoteUpdate.current = false;
                        });
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading whiteboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-gray-100 relative">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 z-10">
                <Button
                    variant={!isEraser ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setIsEraser(false)}
                >
                    <Pen className="w-4 h-4" style={{ color: !isEraser ? color : 'currentColor' }} />
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <div
                            className="w-6 h-6 rounded-full border border-gray-200 cursor-pointer"
                            style={{ backgroundColor: color }}
                        />
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2">
                        <div className="grid grid-cols-4 gap-2">
                            {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#64748b'].map(c => (
                                <button
                                    key={c}
                                    className="w-6 h-6 rounded-full border border-gray-200"
                                    style={{ backgroundColor: c }}
                                    onClick={() => { setColor(c); setIsEraser(false); }}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="w-24 px-2">
                    <Slider
                        value={[brushSize]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(val) => setBrushSize(val[0])}
                    />
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                    variant={isEraser ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setIsEraser(true)}
                >
                    <Eraser className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={undoStack.current.length === 0}
                >
                    <Undo className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={redoStack.current.length === 0}
                >
                    <Redo className="w-4 h-4" />
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button variant="ghost" size="icon" onClick={handleManualSave} title="Save Now">
                    <Save className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="icon" onClick={clearCanvas}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                </Button>

                <Button variant="ghost" size="icon" onClick={downloadCanvas} title="Download PNG">
                    <Download className="w-4 h-4" />
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Upload className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={handleExport}>
                                Export JSON
                            </Button>
                            <Button variant="outline" size="sm" className="w-full" onClick={handleImport}>
                                Import JSON
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 w-full h-full overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
        </div>
    );
};
