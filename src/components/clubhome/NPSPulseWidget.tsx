import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { motion } from "framer-motion";

// Placeholder widget - NPS table not yet configured
export const NPSPulseWidget = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            NPS Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <div className="text-4xl font-bold text-muted-foreground">--</div>
            <div className="text-xs text-muted-foreground mt-1">
              NPS tracking coming soon
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-emerald-500/10">
              <ThumbsUp className="h-3 w-3 mx-auto text-emerald-500 mb-1" />
              <div className="text-sm font-bold text-emerald-500">0</div>
              <div className="text-[9px] text-muted-foreground">Promoters</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <Meh className="h-3 w-3 mx-auto text-amber-500 mb-1" />
              <div className="text-sm font-bold text-amber-500">0</div>
              <div className="text-[9px] text-muted-foreground">Passives</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-rose-500/10">
              <ThumbsDown className="h-3 w-3 mx-auto text-rose-500 mb-1" />
              <div className="text-sm font-bold text-rose-500">0</div>
              <div className="text-[9px] text-muted-foreground">Detractors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};