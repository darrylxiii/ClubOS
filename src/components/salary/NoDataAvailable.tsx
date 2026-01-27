/**
 * No Data Available Component
 * 
 * Displays a clear message when no salary data is found,
 * with actionable suggestions to adjust filters.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Search, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface NoDataAvailableProps {
  role: string;
  location: string;
  experience: number;
  onResetFilters?: () => void;
}

export function NoDataAvailable({ 
  role, 
  location, 
  experience,
  onResetFilters 
}: NoDataAvailableProps) {

  const handleRequestData = () => {
    toast.success('Request submitted', {
      description: `We'll gather data for ${role} in ${location} and notify you when available.`
    });
  };

  return (
    <Card className="border-2 border-dashed border-border/50">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold">No Salary Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We don't have enough data for <span className="font-medium">{role}</span> in{' '}
              <span className="font-medium">{location}</span> with{' '}
              <span className="font-medium">{experience} years</span> of experience yet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {onResetFilters && (
              <Button variant="outline" onClick={onResetFilters}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button variant="secondary" onClick={handleRequestData}>
              <Mail className="w-4 h-4 mr-2" />
              Request This Data
            </Button>
          </div>

          <div className="pt-6 border-t border-border/30 w-full max-w-md">
            <div className="flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Tip:</span> Try broadening your search by selecting 
                "Remote" for location or choosing a more common role title. Our data coverage is 
                strongest for Software Engineers, Product Managers, and Designers in major European cities.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
