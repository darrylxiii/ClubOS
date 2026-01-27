/**
 * Salary Insights Page
 * 
 * Market intelligence dashboard with real data from salary_benchmarks table.
 * Implements proper experience filtering, data quality indicators, and
 * removes hardcoded fallbacks in favor of clear "no data" messaging.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Download, MapPin, Briefcase, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSalaryBenchmarks } from "@/hooks/useSalaryBenchmarks";
import { DataQualityIndicator } from "@/components/salary/DataQualityIndicator";
import { NoDataAvailable } from "@/components/salary/NoDataAvailable";

export default function SalaryInsights() {
  const [role, setRole] = useState("Software Engineer");
  const [location, setLocation] = useState("Amsterdam");
  const [experience, setExperience] = useState([3]);
  
  const { 
    aggregated, 
    loading, 
    hasData, 
    availableRoles, 
    availableLocations,
    fetchBenchmarks 
  } = useSalaryBenchmarks();

  // Fetch data when filters change
  useEffect(() => {
    fetchBenchmarks(role, location, experience[0]);
  }, [role, location, experience, fetchBenchmarks]);

  const handleResetFilters = () => {
    setRole("Software Engineer");
    setLocation("Amsterdam");
    setExperience([3]);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    // Handle different currencies with appropriate formatting
    const formatters: Record<string, { locale: string; currency: string }> = {
      EUR: { locale: 'de-DE', currency: 'EUR' },
      GBP: { locale: 'en-GB', currency: 'GBP' },
      CHF: { locale: 'de-CH', currency: 'CHF' },
      SEK: { locale: 'sv-SE', currency: 'SEK' },
      DKK: { locale: 'da-DK', currency: 'DKK' },
      PLN: { locale: 'pl-PL', currency: 'PLN' },
      USD: { locale: 'en-US', currency: 'USD' },
    };

    const config = formatters[currency] || formatters.EUR;
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = () => {
    if (!hasData || !aggregated) {
      toast.error("No data to export");
      return;
    }

    const report = {
      filters: { role, location, experience: experience[0] },
      salary_range: {
        p25: aggregated.p25,
        median: aggregated.median,
        p75: aggregated.p75,
        min: aggregated.min,
        max: aggregated.max,
        currency: aggregated.currency
      },
      data_quality: {
        sample_size: aggregated.sampleSize,
        confidence_score: aggregated.avgConfidence,
        last_updated: aggregated.lastUpdated,
        sources: aggregated.sources
      },
      generated_at: new Date().toISOString(),
      generated_by: 'The Quantum Club'
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-insights-${role.toLowerCase().replace(/\s/g, '-')}-${location.toLowerCase()}.json`;
    a.click();
    
    toast.success("Report exported successfully");
  };

  // Use actual roles/locations from data, with fallbacks
  const displayRoles = availableRoles.length > 0 ? availableRoles : [
    "Software Engineer",
    "Senior Software Engineer",
    "Engineering Manager",
    "Product Manager",
    "Designer",
    "Data Scientist"
  ];

  const displayLocations = availableLocations.length > 0 ? availableLocations : [
    "Amsterdam",
    "Rotterdam",
    "Utrecht",
    "Remote (Netherlands)",
    "Berlin",
    "London"
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase mb-2">Salary Intelligence</h1>
          <p className="text-muted-foreground">
            Real market insights powered by platform data
          </p>
        </div>
        <Button onClick={exportReport} variant="outline" disabled={!hasData}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Configure Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayRoles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayLocations.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold">
              Years of Experience: {experience[0]}
            </label>
            <Slider
              value={experience}
              onValueChange={setExperience}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Entry Level</span>
              <span>Mid-Senior</span>
              <span>Executive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="border-2 border-foreground">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Fetching market data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!loading && !hasData && (
        <NoDataAvailable
          role={role}
          location={location}
          experience={experience[0]}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Salary Visualization - Only show when we have data */}
      {!loading && hasData && aggregated && (
        <>
          {/* Data Quality Indicator */}
          <DataQualityIndicator
            sampleSize={aggregated.sampleSize}
            lastUpdated={aggregated.lastUpdated || undefined}
            confidenceScore={aggregated.avgConfidence}
            sources={aggregated.sources}
          />

          <Card className="border-2 border-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
                <div className="w-1 h-6 bg-foreground"></div>
                <DollarSign className="w-5 h-5" />
                Market Position
              </CardTitle>
              <CardDescription>
                Based on {aggregated.sampleSize.toLocaleString()} data points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Salary Range Bar */}
              <div className="space-y-4">
                <div className="relative h-32 bg-background/30 rounded-lg border border-border/30 overflow-hidden">
                  {/* Gradient bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-destructive/20 via-primary/20 to-success/20" />
                  
                  {/* Markers */}
                  <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between px-4 pb-4">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">25th</div>
                      <Badge variant="outline" className="bg-background/80">
                        {formatCurrency(aggregated.p25, aggregated.currency)}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Median</div>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {formatCurrency(aggregated.median, aggregated.currency)}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">75th</div>
                      <Badge variant="outline" className="bg-background/80">
                        {formatCurrency(aggregated.p75, aggregated.currency)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Percentile Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Entry Range</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(aggregated.min, aggregated.currency)}
                        </p>
                        <Badge variant="outline">25th Percentile</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Market Average</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(aggregated.median, aggregated.currency)}
                        </p>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          50th Percentile
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Competitive</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(aggregated.max, aggregated.currency)}
                        </p>
                        <Badge variant="outline">75th Percentile</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Tips */}
          <Card className="border-2 border-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
                <div className="w-1 h-6 bg-foreground"></div>
                <TrendingUp className="w-5 h-5" />
                Negotiation Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <h4 className="font-bold mb-2">Your Market Position</h4>
                <p className="text-sm text-muted-foreground">
                  For a {role} in {location} with {experience[0]} years of experience, 
                  the market range is {formatCurrency(aggregated.min, aggregated.currency)} - {formatCurrency(aggregated.max, aggregated.currency)}.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold mb-1">Know Your Value</h5>
                    <p className="text-sm text-muted-foreground">
                      With {experience[0]} years of experience, target the {experience[0] >= 5 ? '50th-75th' : '25th-50th'} percentile based on your skills.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold mb-1">Consider Total Compensation</h5>
                    <p className="text-sm text-muted-foreground">
                      In {location}, equity and bonuses can add 15-30% to base salary.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold mb-1">Timing Matters</h5>
                    <p className="text-sm text-muted-foreground">
                      Negotiate after receiving an offer, not during initial interviews.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
