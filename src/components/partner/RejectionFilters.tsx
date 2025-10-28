import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface Props {
  reasonFilter: string;
  stageFilter: string;
  dateFilter: string;
  stages: any[];
  onReasonChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

const REJECTION_REASONS = [
  { value: 'all', label: 'All Reasons' },
  { value: 'skills_gap', label: 'Skills Gap' },
  { value: 'experience_junior', label: 'Too Junior' },
  { value: 'experience_senior', label: 'Too Senior' },
  { value: 'salary_high', label: 'Salary Too High' },
  { value: 'location', label: 'Location Mismatch' },
  { value: 'culture_fit', label: 'Culture Fit' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

export function RejectionFilters({
  reasonFilter,
  stageFilter,
  dateFilter,
  stages,
  onReasonChange,
  onStageChange,
  onDateChange,
}: Props) {
  return (
    <Card className="border-border/40">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rejection Reason Filter */}
          <div className="space-y-2">
            <Label htmlFor="reason-filter">Rejection Reason</Label>
            <Select value={reasonFilter} onValueChange={onReasonChange}>
              <SelectTrigger id="reason-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Filter */}
          <div className="space-y-2">
            <Label htmlFor="stage-filter">Rejection Stage</Label>
            <Select value={stageFilter} onValueChange={onStageChange}>
              <SelectTrigger id="stage-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.order} value={stage.name}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label htmlFor="date-filter">Time Period</Label>
            <Select value={dateFilter} onValueChange={onDateChange}>
              <SelectTrigger id="date-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
