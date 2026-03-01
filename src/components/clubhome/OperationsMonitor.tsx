import { useState } from "react";
import { ChevronDown, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentDecisions } from "@/hooks/useAgentActivity";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentActivityWidget } from "./AgentActivityWidget";
import { LiveOperationsWidget } from "./LiveOperationsWidget";
import { DashboardSection } from "./DashboardSection";

export function OperationsMonitor() {
  const [expanded, setExpanded] = useState(false);
  const { data: decisions } = useAgentDecisions();

  const agentCount = new Set((decisions || []).map((d) => d.agent_name)).size;
  const decisionCount = (decisions || []).length;

  return (
    <div className="rounded-2xl border border-border/20 bg-card/80 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Operations Monitor</span>
          <span className="text-xs text-muted-foreground">
            {agentCount} agents · {decisionCount} decisions (24h)
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 p-4">
              <DashboardSection columns={2} mobileColumns={1}>
                <AgentActivityWidget />
                <LiveOperationsWidget />
              </DashboardSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
