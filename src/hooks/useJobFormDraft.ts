import { useEffect, useRef, useCallback } from "react";

interface DraftData {
  formData: any;
  requiredTools: any[];
  niceToHaveTools: any[];
  timestamp: number;
}

const DRAFT_KEY = "job_form_draft";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const useJobFormDraft = (
  formData: any,
  requiredTools: any[],
  niceToHaveTools: any[],
  isOpen: boolean
) => {
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  const lastSavedData = useRef<string>("");

  const saveDraft = useCallback(() => {
    if (!isOpen) return;

    const draft: DraftData = {
      formData,
      requiredTools,
      niceToHaveTools,
      timestamp: Date.now(),
    };

    const draftString = JSON.stringify(draft);
    
    // Only save if data has changed
    if (draftString !== lastSavedData.current) {
      try {
        localStorage.setItem(DRAFT_KEY, draftString);
        lastSavedData.current = draftString;
        console.log("Draft auto-saved");
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }
  }, [formData, requiredTools, niceToHaveTools, isOpen]);

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const draftString = localStorage.getItem(DRAFT_KEY);
      if (!draftString) return null;

      const draft: DraftData = JSON.parse(draftString);
      
      // Check if draft is less than 24 hours old
      const ageInHours = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        clearDraft();
        return null;
      }

      return draft;
    } catch (error) {
      console.error("Failed to load draft:", error);
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      lastSavedData.current = "";
      console.log("Draft cleared");
    } catch (error) {
      console.error("Failed to clear draft:", error);
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!isOpen) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      return;
    }

    // Save immediately on mount if there's data
    const hasData = formData.title || formData.description || requiredTools.length > 0;
    if (hasData) {
      saveDraft();
    }

    // Set up auto-save interval
    autoSaveTimer.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [isOpen, saveDraft, formData.title, formData.description, requiredTools.length]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
  };
};
