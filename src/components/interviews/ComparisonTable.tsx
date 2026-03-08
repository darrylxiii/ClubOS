import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import type { CandidateData } from "@/pages/InterviewComparison";

interface ComparisonTableProps {
  candidates: CandidateData[];
}

const DIMENSIONS = [
  { key: "overallScore", label: "Overall Score" },
  { key: "technical", label: "Technical" },
  { key: "communication", label: "Communication" },
  { key: "cultureFit", label: "Culture Fit" },
] as const;

function getScoreVariant(score: number): string {
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
  if (score > 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getRecommendationBadge(rec?: string) {
  if (!rec) return null;
  const map: Record<string, string> = {
    strong_yes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    yes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    maybe: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    no: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    strong_no: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200",
  };
  return (
    <Badge className={map[rec] || "bg-muted text-muted-foreground"} variant="outline">
      {rec.replace(/_/g, " ")}
    </Badge>
  );
}

export function ComparisonTable({ candidates }: ComparisonTableProps) {
  // Find highest score per dimension
  const highs: Record<string, number> = {};
  DIMENSIONS.forEach((dim) => {
    const vals = candidates.map((c) =>
      dim.key === "overallScore" ? c.overallScore : c.scores[dim.key as keyof typeof c.scores]
    );
    highs[dim.key] = Math.max(...vals);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring Matrix</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-40">Dimension</th>
              {candidates.map((c) => (
                <th key={c.id} className="text-center py-3 px-4 min-w-[140px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.avatar_url} />
                      <AvatarFallback className="text-xs">{getInitials(c.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold truncate max-w-[120px]">{c.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map((dim) => (
              <tr key={dim.key} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{dim.label}</td>
                {candidates.map((c) => {
                  const val = dim.key === "overallScore"
                    ? c.overallScore
                    : c.scores[dim.key as keyof typeof c.scores];
                  const isHighest = val === highs[dim.key] && val > 0;
                  return (
                    <td key={c.id} className="text-center py-3 px-4">
                      <span className={`font-semibold ${getScoreVariant(val)} ${isHighest ? "underline underline-offset-4 decoration-primary" : ""}`}>
                        {val > 0 ? `${val}%` : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b">
              <td className="py-3 pr-4 font-medium">Recommendation</td>
              {candidates.map((c) => (
                <td key={c.id} className="text-center py-3 px-4">
                  {getRecommendationBadge(c.recommendation) || <span className="text-muted-foreground">—</span>}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-4 font-medium">Interviews</td>
              {candidates.map((c) => (
                <td key={c.id} className="text-center py-3 px-4 text-muted-foreground">
                  {c.interviewCount || 0}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-4 font-medium align-top">Strengths</td>
              {candidates.map((c) => (
                <td key={c.id} className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {c.strengths.length > 0
                      ? c.strengths.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-4 font-medium align-top">Concerns</td>
              {candidates.map((c) => (
                <td key={c.id} className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {c.concerns.length > 0
                      ? c.concerns.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-destructive/30">{s}</Badge>
                        ))
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
