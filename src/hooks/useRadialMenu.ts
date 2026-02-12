import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { getRadialMenuItems, RadialMenuItemConfig } from "@/config/radial-menu-items";
import { RadialMenuItem } from "@/components/ui/radial-menu";

interface RadialMenuState {
  open: boolean;
  position: { x: number; y: number };
  showVoiceMemo: boolean;
  showQuickTask: boolean;
  showFullTask: boolean;
  fullTaskTitle: string;
  fullTaskPriority: string;
}

export function useRadialMenu() {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const [state, setState] = useState<RadialMenuState>({
    open: false,
    position: { x: 0, y: 0 },
    showVoiceMemo: false,
    showQuickTask: false,
    showFullTask: false,
    fullTaskTitle: "",
    fullTaskPriority: "medium",
  });

  const openMenu = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, open: true, position: { x, y } }));
  }, []);

  const closeMenu = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const dispatchAction = useCallback(
    (config: RadialMenuItemConfig) => {
      switch (config.actionType) {
        case "voice-memo":
          setState((prev) => ({ ...prev, showVoiceMemo: true }));
          break;
        case "quick-task":
          setState((prev) => ({ ...prev, showQuickTask: true }));
          break;
        case "club-ai":
          navigate("/club-ai");
          break;
        case "last-pipeline": {
          const lastPipeline = localStorage.getItem("tqc_last_pipeline") || "/crm/prospects";
          navigate(lastPipeline);
          break;
        }
        case "command-palette":
          // Dispatch synthetic Cmd+K
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
          );
          break;
        case "quantum-pulse":
          // Scroll to QuantumPulse or toggle focus — dispatch custom event
          document.dispatchEvent(new CustomEvent("quantum-pulse-focus"));
          break;
        case "navigate":
          if (config.path) navigate(config.path);
          break;
      }
    },
    [navigate]
  );

  const items: RadialMenuItem[] = useMemo(() => {
    const configs = getRadialMenuItems(currentRole);
    return configs.map((config) => ({
      id: config.id,
      label: config.label,
      icon: config.icon,
      action: () => dispatchAction(config),
    }));
  }, [currentRole, dispatchAction]);

  const closeVoiceMemo = useCallback(() => {
    setState((prev) => ({ ...prev, showVoiceMemo: false }));
  }, []);

  const closeQuickTask = useCallback(() => {
    setState((prev) => ({ ...prev, showQuickTask: false }));
  }, []);

  const openFullTask = useCallback((title: string, priority: string) => {
    setState((prev) => ({
      ...prev,
      showFullTask: true,
      fullTaskTitle: title,
      fullTaskPriority: priority,
    }));
  }, []);

  const closeFullTask = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showFullTask: false,
      fullTaskTitle: "",
      fullTaskPriority: "medium",
    }));
  }, []);

  return {
    ...state,
    items,
    openMenu,
    closeMenu,
    closeVoiceMemo,
    closeQuickTask,
    openFullTask,
    closeFullTask,
  };
}
