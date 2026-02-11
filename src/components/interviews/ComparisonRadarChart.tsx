import { DynamicChart } from "@/components/charts/DynamicChart";

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
    const point: Record<string, string | number> = { category: cat.label };
    candidates.forEach((candidate) => {
      point[candidate.name] = candidate.scores[cat.key as keyof typeof candidate.scores];
    });
    return point;
  });

  const radars = candidates.map((candidate, idx) => ({
    dataKey: candidate.name,
    name: candidate.name,
    stroke: COLORS[idx % COLORS.length],
    fill: COLORS[idx % COLORS.length],
    fillOpacity: 0.2,
  }));

  return (
    <div className="h-[400px] w-full">
      <DynamicChart
        type="radar"
        data={data}
        height={400}
        config={{
          angleAxisKey: 'category',
          radars,
          legend: true,
        }}
      />
    </div>
  );
}
