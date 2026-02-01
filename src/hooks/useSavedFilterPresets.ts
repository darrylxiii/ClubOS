import { useState, useCallback, useEffect } from 'react';
import { JobFilterState, defaultJobFilters } from '@/types/jobFilters';

const STORAGE_KEY = 'job_filter_presets_v1';
const MAX_PRESETS = 10;

export interface FilterPreset {
  id: string;
  name: string;
  createdAt: string;
  filters: JobFilterState;
}

const generateId = () => `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const loadPresets = (): FilterPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load filter presets:', e);
    return [];
  }
};

const savePresets = (presets: FilterPreset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save filter presets:', e);
  }
};

export function useSavedFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  // Load presets on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const addPreset = useCallback((name: string, filters: JobFilterState): boolean => {
    if (presets.length >= MAX_PRESETS) {
      return false; // Max presets reached
    }

    const newPreset: FilterPreset = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      filters,
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    return true;
  }, [presets]);

  const deletePreset = useCallback((id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  }, [presets]);

  const renamePreset = useCallback((id: string, newName: string) => {
    const updatedPresets = presets.map(p => 
      p.id === id ? { ...p, name: newName.trim() } : p
    );
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  }, [presets]);

  const getPreset = useCallback((id: string): FilterPreset | undefined => {
    return presets.find(p => p.id === id);
  }, [presets]);

  const canAddMore = presets.length < MAX_PRESETS;

  return {
    presets,
    addPreset,
    deletePreset,
    renamePreset,
    getPreset,
    canAddMore,
    maxPresets: MAX_PRESETS,
  };
}
