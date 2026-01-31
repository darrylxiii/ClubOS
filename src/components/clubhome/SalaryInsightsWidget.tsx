import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Minus, DollarSign, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface SalaryData {
  role: string;
  location: string;
  min: number;
  median: number;
  max: number;
  userPosition: 'below' | 'average' | 'above';
  percentile: number;
  currency: string;
}

export function SalaryInsightsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSalaryInsights();
    }
  }, [user]);

  const fetchSalaryInsights = async () => {
    if (!user) return;

    try {
      // Get user's current role and location from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_title, location')
        .eq('id', user.id)
        .single();

      if (!profile?.current_title) {
        setLoading(false);
        return;
      }

      // Get salary benchmarks for similar roles
      const { data: benchmarks } = await supabase
        .from('salary_benchmarks')
        .select('*')
        .ilike('role_title', `%${profile.current_title.split(' ')[0]}%`)
        .limit(10);

      if (benchmarks && benchmarks.length > 0) {
        // Aggregate benchmark data
        const avgMin = benchmarks.reduce((sum, b) => sum + (b.salary_min || 0), 0) / benchmarks.length;
        const avgMax = benchmarks.reduce((sum, b) => sum + (b.salary_max || 0), 0) / benchmarks.length;
        const avgMedian = (avgMin + avgMax) / 2;

        // Use median as default for display
        const userSalary = avgMedian;
        const currency = benchmarks[0]?.currency || 'EUR';
        let position: 'below' | 'average' | 'above' = 'average';
        let percentile = 50;

        setSalaryData({
          role: profile.current_title,
          location: profile.location || 'Europe',
          min: Math.round(avgMin / 1000) * 1000,
          median: Math.round(avgMedian / 1000) * 1000,
          max: Math.round(avgMax / 1000) * 1000,
          userPosition: position,
          percentile,
          currency
        });
      }
    } catch (error) {
      console.error('Error fetching salary insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPositionIcon = () => {
    if (!salaryData) return null;
    switch (salaryData.userPosition) {
      case 'above':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'below':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const getPositionLabel = () => {
    if (!salaryData) return '';
    switch (salaryData.userPosition) {
      case 'above':
        return 'Above Market';
      case 'below':
        return 'Below Market';
      default:
        return 'At Market Rate';
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salaryData) {
    return (
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <DollarSign className="w-5 h-5" />
            Salary Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Add your role to see market benchmarks
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          <DollarSign className="w-5 h-5" />
          Salary Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* Role & Location */}
        <div className="text-sm text-muted-foreground truncate">
          {salaryData.role} • {salaryData.location}
        </div>

        {/* Market Range Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(salaryData.min, salaryData.currency)}</span>
            <span className="font-medium text-foreground">
              {formatCurrency(salaryData.median, salaryData.currency)}
            </span>
            <span>{formatCurrency(salaryData.max, salaryData.currency)}</span>
          </div>
          
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Gradient bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-destructive/50 via-warning/50 to-success/50" />
            
            {/* User position marker */}
            <motion.div
              className="absolute top-0 w-3 h-3 -mt-0.5 bg-primary rounded-full border-2 border-background shadow-md"
              initial={{ left: '50%' }}
              animate={{ left: `${salaryData.percentile}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ transform: 'translateX(-50%)' }}
            />
          </div>
        </div>

        {/* Position Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={`gap-1 ${
              salaryData.userPosition === 'above' 
                ? 'bg-success/10 text-success border-success/30'
                : salaryData.userPosition === 'below'
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }`}
          >
            {getPositionIcon()}
            {getPositionLabel()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {salaryData.percentile}th percentile
          </span>
        </div>

        {/* CTA */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-primary hover:text-primary"
          onClick={() => navigate('/salary-insights')}
        >
          <span>View Full Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
