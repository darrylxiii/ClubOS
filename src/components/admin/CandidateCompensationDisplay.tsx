import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Briefcase } from "lucide-react";

interface CandidateCompensationDisplayProps {
  candidate: any;
  showCurrency?: boolean;
}

export function CandidateCompensationDisplay({ 
  candidate, 
  showCurrency = true 
}: CandidateCompensationDisplayProps) {
  const currency = candidate.final_currency || candidate.preferred_currency || 'USD';
  const currentMin = candidate.current_salary_min;
  const currentMax = candidate.current_salary_max;
  const desiredMin = candidate.final_desired_salary_min || candidate.p_desired_salary_min;
  const desiredMax = candidate.final_desired_salary_max || candidate.p_desired_salary_max;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Compensation Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Salary */}
        {(currentMin || currentMax) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium">Current Salary</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {currentMin && formatCurrency(currentMin)}
                {currentMin && currentMax && ' - '}
                {currentMax && formatCurrency(currentMax)}
              </span>
              {showCurrency && (
                <Badge variant="outline">{currency}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Desired Salary */}
        {(desiredMin || desiredMax) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium">Desired Salary</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {desiredMin && formatCurrency(desiredMin)}
                {desiredMin && desiredMax && ' - '}
                {desiredMax && formatCurrency(desiredMax)}
              </span>
              {showCurrency && (
                <Badge variant="outline">{currency}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Employment Preferences */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          {candidate.employment_type_preference && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Employment Type</p>
              <Badge variant="secondary">
                {candidate.employment_type_preference}
              </Badge>
            </div>
          )}

          {candidate.final_notice_period && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notice Period</p>
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                <Clock className="w-3 h-3" />
                {candidate.final_notice_period}
              </Badge>
            </div>
          )}

          {candidate.remote_work_preference && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remote Preference</p>
              <Badge variant="secondary">
                {candidate.remote_work_preference}
              </Badge>
            </div>
          )}

          {candidate.freelance_hourly_rate_min && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Freelance Rate</p>
              <p className="font-medium">
                {formatCurrency(candidate.freelance_hourly_rate_min)}
                {candidate.freelance_hourly_rate_max && 
                  ` - ${formatCurrency(candidate.freelance_hourly_rate_max)}`
                }/hr
              </p>
            </div>
          )}
        </div>

        {/* Work Hours */}
        {(candidate.fulltime_hours_per_week_min || candidate.freelance_hours_per_week_min) && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Preferred Hours per Week</h4>
            <div className="grid grid-cols-2 gap-4">
              {candidate.fulltime_hours_per_week_min && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Full-time</p>
                  <p className="font-medium">
                    {candidate.fulltime_hours_per_week_min}
                    {candidate.fulltime_hours_per_week_max && 
                      ` - ${candidate.fulltime_hours_per_week_max}`
                    } hrs
                  </p>
                </div>
              )}
              {candidate.freelance_hours_per_week_min && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Freelance</p>
                  <p className="font-medium">
                    {candidate.freelance_hours_per_week_min}
                    {candidate.freelance_hours_per_week_max && 
                      ` - ${candidate.freelance_hours_per_week_max}`
                    } hrs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Preferences */}
        {candidate.preferred_work_locations && candidate.preferred_work_locations.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Preferred Locations</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.preferred_work_locations.map((location: string, index: number) => (
                <Badge key={index} variant="outline">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
