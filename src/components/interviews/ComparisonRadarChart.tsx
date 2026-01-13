import { LazyCharts } from "@/components/charts/LazyCharts";

interface CandidateData {
  id: string;
  name: string;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    cultureFit: number;
    leadership: number;
    experience: number;
  };
}

interface ComparisonRadarChartProps {
  candidates: CandidateData[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export function ComparisonRadarChart({ candidates }: ComparisonRadarChartProps) {
  const categories = [
    { key: "technical", label: "Technical" },
    { key: "communication", label: "Communication" },
    { key: "problemSolving", label: "Problem Solving" },
    { key: "cultureFit", label: "Culture Fit" },
    { key: "leadership", label: "Leadership" },
    { key: "experience", label: "Experience" },
  ];

  const data = categories.map((cat) => {
    const point: Record<string, any> = { category: cat.label };
    candidates.forEach((candidate) => {
      point[candidate.name] = candidate.scores[cat.key as keyof typeof candidate.scores];
    });
    return point;
  });

  return (
    <div className="h-[400px] w-full">
      <LazyCharts height={400}>
        {({ ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip }) => (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              {candidates.map((candidate, idx) => (
                <Radar
                  key={candidate.id}
                  name={candidate.name}
                  dataKey={candidate.name}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              <Legend />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </LazyCharts>
    </div>
  );
}
