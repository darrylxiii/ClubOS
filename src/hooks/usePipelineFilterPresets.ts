import { useState, useEffect, useCallback } from "react";
import type { PipelineFilterState } from "./usePipelineFilters";

const MAX_PRESETS = 10;

export interface PipelineFilterPreset {
  id: string;
  name: string;
  createdAt: string;
  filters: PipelineFilterState;
}

function getStorageKey(jobId: string) {
  return `pipeline-filter-presets-${jobId}`;
}

export function usePipelineFilterPresets(jobId: string) {
  const [presets, setPresets] = useState<PipelineFilterPreset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(jobId));
      if (stored) setPresets(JSON.parse(stored));
    } catch {
      // ignore corrupted data
    }
  }, [jobId]);

  const persist = useCallback((updated: PipelineFilterPreset[]) => {
    setPresets(updated);
    try {
      localStorage.setItem(getStorageKey(jobId), JSON.stringify(updated));
    } catch {
      // localStorage full — ignore
    }
  }, [jobId]);

  const addPreset = useCallback((name: string, filters: PipelineFilterState): boolean => {
    if (presets.length >= MAX_PRESETS) return false;
    const preset: PipelineFilterPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
      filters,
    };
    persist([...presets, preset]);
    return true;
  }, [presets, persist]);

  const deletePreset = useCallback((id: string) => {
    persist(presets.filter((p) => p.id !== id));
  }, [presets, persist]);

  const renamePreset = useCallback((id: string, newName: string) => {
    persist(presets.map((p) => (p.id === id ? { ...p, name: newName } : p)));
  }, [presets, persist]);

  const getPreset = useCallback((id: string) => {
    return presets.find((p) => p.id === id);
  }, [presets]);

  return {
    presets,
    addPreset,
    deletePreset,
    renamePreset,
    getPreset,
    canAddMore: presets.length < MAX_PRESETS,
  };
}
