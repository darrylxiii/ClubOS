import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ZenComposerProps {
    value: string;
    onChange: (value: string) => void;
    onAiAssist: (action: string) => void;
    disabled?: boolean;
}

export function ZenComposer({ value, onChange, onAiAssist, disabled }: ZenComposerProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: "Write your masterpiece...",
            }),
            Typography,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none min-h-[300px] max-w-none px-4 py-3 placeholder:text-muted-foreground/70",
            }
        },
        immediatelyRender: false,
    });

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({
        isActive,
        onClick,
        icon: Icon
    }: {
        isActive?: boolean;
        onClick: () => void;
        icon: any;
    }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                isActive && "bg-muted text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );

    return (
        <div className="flex flex-col border border-input rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring transition-all">
            {/* Premium Toolbar */}
            <div className="flex items-center gap-1 p-1 border-b bg-muted/20 overflow-x-auto scroller-none">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    icon={Bold}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    icon={Italic}
                />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={Heading1}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={Heading2}
                />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    icon={List}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    icon={ListOrdered}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    icon={Quote}
                />

                <div className="flex-1" /> {/* Spacer */}

                {/* Undo/Redo */}
                <div className="hidden sm:flex items-center gap-1">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        isActive={false}
                        icon={Undo}
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        isActive={false}
                        icon={Redo}
                    />
                </div>

                {/* AI Action */}
                <div className="ml-2 pl-2 border-l border-border">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">AI Assist</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onAiAssist("improve")}>
                                Improve writing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAiAssist("shorten")}>
                                Make shorter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAiAssist("expand")}>
                                Make longer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAiAssist("professional")}>
                                More professional
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAiAssist("friendly")}>
                                More friendly
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Editor Content */}
            <div onClick={() => editor.chain().focus().run()} className="cursor-text bg-transparent">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
