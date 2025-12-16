import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ColumnType = 
  | 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'multi_select'
  | 'person' | 'url' | 'email' | 'phone' | 'relation' | 'formula' 
  | 'created_time' | 'updated_time';

export type ViewType = 'table' | 'board' | 'gallery' | 'list' | 'calendar';

export interface DatabaseColumn {
  id: string;
  database_id: string;
  name: string;
  column_type: ColumnType;
  options: Record<string, unknown>;
  position: number;
  width: number;
  is_primary: boolean;
  is_visible: boolean;
}

export interface DatabaseRow {
  id: string;
  database_id: string;
  data: Record<string, unknown>;
  position: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseView {
  id: string;
  database_id: string;
  name: string;
  view_type: ViewType;
  config: Record<string, unknown>;
  position: number;
  is_default: boolean;
}

export interface WorkspaceDatabase {
  id: string;
  page_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  is_inline: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceDatabase(databaseId?: string | null) {
  const { user } = useAuth();
  const [database, setDatabase] = useState<WorkspaceDatabase | null>(null);
  const [columns, setColumns] = useState<DatabaseColumn[]>([]);
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [views, setViews] = useState<DatabaseView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const fetchDatabase = useCallback(async () => {
    if (!databaseId) return;
    setIsLoading(true);
    try {
      const [dbRes, colRes, rowRes, viewRes] = await Promise.all([
        supabase.from('workspace_databases').select('*').eq('id', databaseId).single(),
        supabase.from('workspace_database_columns').select('*').eq('database_id', databaseId).order('position'),
        supabase.from('workspace_database_rows').select('*').eq('database_id', databaseId).order('position'),
        supabase.from('workspace_database_views').select('*').eq('database_id', databaseId).order('position'),
      ]);

      if (dbRes.data) setDatabase(dbRes.data as unknown as WorkspaceDatabase);
      if (colRes.data) setColumns(colRes.data as unknown as DatabaseColumn[]);
      if (rowRes.data) setRows(rowRes.data as unknown as DatabaseRow[]);
      if (viewRes.data) {
        const viewsData = viewRes.data as unknown as DatabaseView[];
        setViews(viewsData);
        const defaultView = viewsData.find((v) => v.is_default) || viewsData[0];
        if (defaultView) setActiveViewId(defaultView.id);
      }
    } catch (err) {
      console.error('Error fetching database:', err);
    } finally {
      setIsLoading(false);
    }
  }, [databaseId]);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  // Realtime subscriptions
  useEffect(() => {
    if (!databaseId) return;

    const rowsChannel = supabase
      .channel(`db-rows-${databaseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_database_rows', filter: `database_id=eq.${databaseId}` }, 
        () => fetchDatabase()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rowsChannel);
    };
  }, [databaseId, fetchDatabase]);

  const createDatabase = async (pageId: string, name: string = 'Untitled Database'): Promise<string | null> => {
    if (!user) return null;
    try {
      // Create database
      const { data: db, error: dbError } = await supabase
        .from('workspace_databases')
        .insert({ page_id: pageId, name, user_id: user.id })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create default "Name" column
      await supabase.from('workspace_database_columns').insert({
        database_id: db.id,
        name: 'Name',
        column_type: 'text',
        is_primary: true,
        position: 0,
      });

      // Create default table view
      await supabase.from('workspace_database_views').insert({
        database_id: db.id,
        name: 'Table',
        view_type: 'table',
        is_default: true,
        position: 0,
      });

      toast.success('Database created');
      return db.id;
    } catch (err) {
      console.error('Error creating database:', err);
      toast.error('Failed to create database');
      return null;
    }
  };

  const addColumn = async (name: string, columnType: ColumnType = 'text', options: Record<string, unknown> = {}) => {
    if (!databaseId) return null;
    try {
      const maxPosition = Math.max(...columns.map(c => c.position), -1);
      const { data, error } = await supabase
        .from('workspace_database_columns')
        .insert({
          database_id: databaseId,
          name,
          column_type: columnType,
          options: options as unknown as Record<string, never>,
          position: maxPosition + 1,
        } as never)
        .select()
        .single();

      if (error) throw error;
      setColumns(prev => [...prev, data as unknown as DatabaseColumn]);
      return data;
    } catch (err) {
      console.error('Error adding column:', err);
      toast.error('Failed to add column');
      return null;
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<DatabaseColumn>) => {
    try {
      const { error } = await supabase
        .from('workspace_database_columns')
        .update(updates as never)
        .eq('id', columnId);

      if (error) throw error;
      setColumns(prev => prev.map(c => c.id === columnId ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating column:', err);
      toast.error('Failed to update column');
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_database_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;
      setColumns(prev => prev.filter(c => c.id !== columnId));
      toast.success('Column deleted');
    } catch (err) {
      console.error('Error deleting column:', err);
      toast.error('Failed to delete column');
    }
  };

  const addRow = async (data: Record<string, unknown> = {}) => {
    if (!databaseId || !user) return null;
    try {
      const maxPosition = Math.max(...rows.map(r => r.position), -1);
      const { data: newRow, error } = await supabase
        .from('workspace_database_rows')
        .insert({
          database_id: databaseId,
          data: data as unknown as Record<string, never>,
          position: maxPosition + 1,
          user_id: user.id,
        } as never)
        .select()
        .single();

      if (error) throw error;
      setRows(prev => [...prev, newRow as unknown as DatabaseRow]);
      return newRow;
    } catch (err) {
      console.error('Error adding row:', err);
      toast.error('Failed to add row');
      return null;
    }
  };

  const updateRow = async (rowId: string, data: Record<string, unknown>) => {
    try {
      const existingRow = rows.find(r => r.id === rowId);
      const mergedData = { ...existingRow?.data, ...data };
      
      const { error } = await supabase
        .from('workspace_database_rows')
        .update({ data: mergedData as unknown as Record<string, never> })
        .eq('id', rowId);

      if (error) throw error;
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: mergedData } : r));
    } catch (err) {
      console.error('Error updating row:', err);
      toast.error('Failed to update row');
    }
  };

  const deleteRow = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_database_rows')
        .delete()
        .eq('id', rowId);

      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== rowId));
    } catch (err) {
      console.error('Error deleting row:', err);
      toast.error('Failed to delete row');
    }
  };

  const addView = async (name: string, viewType: ViewType) => {
    if (!databaseId) return null;
    try {
      const maxPosition = Math.max(...views.map(v => v.position), -1);
      const { data, error } = await supabase
        .from('workspace_database_views')
        .insert({
          database_id: databaseId,
          name,
          view_type: viewType,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setViews(prev => [...prev, data as DatabaseView]);
      return data;
    } catch (err) {
      console.error('Error adding view:', err);
      toast.error('Failed to add view');
      return null;
    }
  };

  const activeView = views.find(v => v.id === activeViewId) || views[0];

  return {
    database,
    columns,
    rows,
    views,
    activeView,
    activeViewId,
    setActiveViewId,
    isLoading,
    createDatabase,
    addColumn,
    updateColumn,
    deleteColumn,
    addRow,
    updateRow,
    deleteRow,
    addView,
    refetch: fetchDatabase,
  };
}
