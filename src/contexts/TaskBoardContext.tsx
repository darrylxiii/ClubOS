import { useTranslation } from 'react-i18next';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskBoard } from '@/types/taskBoard';
import { toast } from 'sonner';

interface TaskBoardContextValue {
  boards: TaskBoard[];
  currentBoard: TaskBoard | null;
  loading: boolean;
  switchBoard: (boardId: string) => void;
  refreshBoards: () => Promise<void>;
  createBoard: (board: Partial<TaskBoard>) => Promise<TaskBoard | null>;
}

const TaskBoardContext = createContext<TaskBoardContextValue | undefined>(undefined);

export function TaskBoardProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadBoards = async () => {
    if (!user) {
      setBoards([]);
      setCurrentBoard(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_accessible_boards')
        .select('*')
        .order('visibility', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setBoards(data || []);

      const savedBoardId = localStorage.getItem('currentBoardId');
      if (savedBoardId && data?.find(b => b.id === savedBoardId)) {
        setCurrentBoard(data.find(b => b.id === savedBoardId) || null);
      } else if (data && data.length > 0) {
        const personalBoard = data.find(b => b.visibility === 'personal');
        setCurrentBoard(personalBoard || data[0]);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      toast.error(t("failed_to_load_task", "Failed to load task boards"));
    } finally {
      setLoading(false);
    }
  };

  const switchBoard = (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    if (board) {
      setCurrentBoard(board);
      localStorage.setItem('currentBoardId', boardId);
    }
  };

  const createBoard = async (boardData: Partial<TaskBoard>): Promise<TaskBoard | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('task_boards')
        .insert({
          name: boardData.name || 'New Board',
          description: boardData.description,
          visibility: boardData.visibility || 'personal',
          owner_id: user.id,
          company_id: boardData.company_id,
          icon: boardData.icon || '📋',
          color: boardData.color || '#6366f1',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t("board_created_successfully", "Board created successfully"));
      await loadBoards();

      if (data) {
        switchBoard(data.id);
      }

      return data;
    } catch (error) {
      console.error('Failed to create board:', error);
      toast.error(t("failed_to_create_board", "Failed to create board"));
      return null;
    }
  };

  // Defer initial load and realtime subscription
  useEffect(() => {
    if (!user) {
      setBoards([]);
      setCurrentBoard(null);
      setLoading(false);
      initializedRef.current = false;
      return;
    }

    // Defer board loading to avoid blocking first paint
    const timer = setTimeout(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      loadBoards();

      // Subscribe to board changes (deferred)
      channelRef.current = supabase
        .channel('task-boards-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'task_boards' },
          () => loadBoards()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'task_board_members' },
          () => loadBoards()
        )
        .subscribe();
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return (
    <TaskBoardContext.Provider
      value={{ boards, currentBoard, loading, switchBoard, refreshBoards: loadBoards, createBoard }}
    >
      {children}
    </TaskBoardContext.Provider>
  );
}

export function useTaskBoard() {
  const context = useContext(TaskBoardContext);
  if (context === undefined) {
    throw new Error('useTaskBoard must be used within a TaskBoardProvider');
  }
  return context;
}
