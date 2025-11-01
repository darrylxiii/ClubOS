import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface AIConfidenceScoreProps {
  score: number; // 0-100
  label?: string;
}

export function AIConfidenceScore({ score, label = "Confidence" }: AIConfidenceScoreProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-500 border-green-500/30";
    if (score >= 60) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    if (score >= 40) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    return "bg-red-500/10 text-red-500 border-red-500/30";
  };

  return (
    <Badge variant="outline" className={`${getColor(score)} flex items-center gap-1`}>
      <Sparkles className="h-3 w-3" />
      <span className="text-xs">{label}: {score}%</span>
    </Badge>
  );
}
