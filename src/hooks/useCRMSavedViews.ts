import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface SavedView {
    id: string;
    name: string;
    entity_type: string;
    filters: Record<string, any>;
    sorting: Record<string, any>;
    columns: string[];
    is_shared: boolean;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export function useCRMSavedViews(entityType: string) {
    const [views, setViews] = useState<SavedView[]>([]);
    const [activeView, setActiveView] = useState<SavedView | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchViews = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('crm_saved_views')
                .select('*')
                .eq('entity_type', entityType)
                .order('name');

            if (error) throw error;
            setViews(data || []);

            // Default to first view if none active
            if (!activeView && data && data.length > 0) {
                // Optionally set first view, or keep null for "All"
                // setActiveView(data[0]); 
            }
        } catch (err) {
            console.error('Error fetching views:', err);
        } finally {
            setLoading(false);
        }
    }, [entityType, activeView]);

    useEffect(() => {
        fetchViews();
    }, [fetchViews]);

    const saveView = async (name: string, config: { filters: any, sorting: any, columns: string[] }) => {
        try {
            const { data, error } = await supabase
                .from('crm_saved_views')
                .insert({
                    name,
                    entity_type: entityType,
                    filters: config.filters,
                    sorting: config.sorting,
                    columns: config.columns,
                    owner_id: (await supabase.auth.getUser()).data.user?.id
                })
                .select()
                .single();

            if (error) throw error;

            setViews(prev => [...prev, data]);
            setActiveView(data);
            notify.success('View saved');
            return data;
        } catch (err: any) {
            notify.error('Failed to save view', { description: err.message });
            return null;
        }
    };

    const updateView = async (id: string, updates: Partial<SavedView>) => {
        try {
            // Remove fields that shouldn't be updated directly or differ in DB schema
            const { id: _, created_at, updated_at, owner_id, ...validUpdates } = updates as any;

            const { error } = await supabase
                .from('crm_saved_views')
                .update(validUpdates)
                .eq('id', id);

            if (error) throw error;

            setViews(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
            if (activeView?.id === id) {
                setActiveView(prev => prev ? { ...prev, ...updates } : null);
            }
            notify.success('View updated');
        } catch (err: any) {
            notify.error('Failed to update view', { description: err.message });
        }
    };

    const deleteView = async (id: string) => {
        try {
            const { error } = await supabase
                .from('crm_saved_views')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setViews(prev => prev.filter(v => v.id !== id));
            if (activeView?.id === id) setActiveView(null);
            notify.success('View deleted');
        } catch (err: any) {
            notify.error('Failed to delete view', { description: err.message });
        }
    };

    return {
        views,
        activeView,
        setActiveView,
        loading,
        saveView,
        updateView,
        deleteView
    };
}
