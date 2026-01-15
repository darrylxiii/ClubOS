import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export type CommandCategory =
    | 'Overview'
    | 'Career'
    | 'Hiring'
    | 'Communication'
    | 'AI & Tools'
    | 'Settings'
    | 'Actions'
    | 'Context';

export interface CommandItem {
    id: string;
    label: string;
    icon: LucideIcon;
    path?: string; // For navigation
    action?: () => void; // For functions
    category: CommandCategory | string;
    shortcut?: string;
    roles?: string[];
    keywords?: string[]; // For better search matching
    priority?: number; // Higher priority appears first (good for context actions)
}

interface CommandContextType {
    commands: CommandItem[];
    registerCommand: (command: CommandItem) => void;
    unregisterCommand: (id: string) => void;
    registerCommands: (commands: CommandItem[]) => void;
    unregisterCommands: (ids: string[]) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggle: () => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({ children }: { children: ReactNode }) {
    const [commands, setCommands] = useState<CommandItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const registerCommand = useCallback((command: CommandItem) => {
        setCommands(prev => {
            if (prev.some(c => c.id === command.id)) return prev;
            return [...prev, command];
        });
    }, []);

    const unregisterCommand = useCallback((id: string) => {
        setCommands(prev => prev.filter(c => c.id !== id));
    }, []);

    const registerCommands = useCallback((newCommands: CommandItem[]) => {
        setCommands(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const filteredNew = newCommands.filter(c => !existingIds.has(c.id));
            if (filteredNew.length === 0) return prev;
            return [...prev, ...filteredNew];
        });
    }, []);

    const unregisterCommands = useCallback((ids: string[]) => {
        const idsSet = new Set(ids);
        setCommands(prev => prev.filter(c => !idsSet.has(c.id)));
    }, []);

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Handle global shortcut (Cmd+K)
    // This replaces the local effect in CommandPalette and other components
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                if (
                    // Prevent triggering if an input/textarea is focused, UNLESS it's the command input itself
                    // Actually, Cmd+K is usually reserved for this worldwide, so we might want to override even in inputs
                    // But usually we respect inputs. However, Notion/Linear override.
                    // Let's stick to standard behavior: Override everything except if default prevented?
                    !e.defaultPrevented
                ) {
                    e.preventDefault();
                    setIsOpen(prev => !prev);
                }
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <CommandContext.Provider value={{
            commands,
            registerCommand,
            unregisterCommand,
            registerCommands,
            unregisterCommands,
            isOpen,
            setIsOpen,
            toggle
        }}>
            {children}
        </CommandContext.Provider>
    );
}

export function useCommand() {
    const context = useContext(CommandContext);
    if (context === undefined) {
        throw new Error('useCommand must be used within a CommandProvider');
    }
    return context;
}

// Helper hook for components to easily register/unregister commands on mount/unmount
export function useRegisterCommands(commandsToRegister: CommandItem[], deps: any[] = []) {
    const { registerCommands, unregisterCommands } = useCommand();

    useEffect(() => {
        registerCommands(commandsToRegister);

        return () => {
            unregisterCommands(commandsToRegister.map(c => c.id));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
