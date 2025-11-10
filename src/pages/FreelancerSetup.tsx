import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Rocket, TrendingUp, X } from "lucide-react";

const CATEGORIES = [
  "Development",
  "Design",
  "Marketing",
  "Strategy",
  "Writing",
  "Data & Analytics",
  "Product Management",
  "Consulting"
];

export default function FreelancerSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [hourlyRateMin, setHourlyRateMin] = useState("");
  const [hourlyRateMax, setHourlyRateMax] = useState("");
  const [availabilityHours, setAvailabilityHours] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [yearsFreelancing, setYearsFreelancing] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const progress = (step / 3) * 100;

  const toggleCategory = (category: string) => {
    setCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const createProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("freelance_profiles")
        .insert({
          id: user.id,
          freelance_status: "available",
          hourly_rate_min: hourlyRateMin ? parseFloat(hourlyRateMin) : null,
          hourly_rate_max: hourlyRateMax ? parseFloat(hourlyRateMax) : null,
          availability_hours_per_week: availabilityHours ? parseInt(availabilityHours) : null,
          categories: categories,
          years_freelancing: yearsFreelancing ? parseFloat(yearsFreelancing) : null,
          portfolio_items: portfolioUrl ? [{ url: portfolioUrl }] : [],
          project_rate_preference: "both",
          preferred_engagement_types: ["one-time", "recurring"],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Club Projects!",
        description: "Your freelance profile has been created",
      });
      navigate("/projects");
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Set Your Rates</h2>
              <p className="text-muted-foreground">
                Club AI will use this to recommend competitive rates for projects
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="rate-min">Hourly Rate Range</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <Input
                      id="rate-min"
                      type="number"
                      placeholder="Min"
                      value={hourlyRateMin}
                      onChange={(e) => setHourlyRateMin(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <Input
                      id="rate-max"
                      type="number"
                      placeholder="Max"
                      value={hourlyRateMax}
                      onChange={(e) => setHourlyRateMax(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average market rate for senior talent: €100-150/hr
                </p>
              </div>

              <div>
                <Label htmlFor="availability">Availability (hours per week)</Label>
                <Input
                  id="availability"
                  type="number"
                  placeholder="20"
                  value={availabilityHours}
                  onChange={(e) => setAvailabilityHours(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  How many hours can you commit to freelance projects?
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select Your Categories</h2>
              <p className="text-muted-foreground">
                Choose the types of projects you're interested in
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((category) => (
                <Card
                  key={category}
                  className={`p-4 cursor-pointer transition-all ${
                    categories.includes(category)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category}</span>
                    {categories.includes(category) && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <X className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {categories.length > 0 && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Selected Categories:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Badge key={cat} variant="secondary">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Experience & Portfolio</h2>
              <p className="text-muted-foreground">
                Help clients understand your background
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="years">Years of Freelancing Experience</Label>
                <Input
                  id="years"
                  type="number"
                  step="0.5"
                  placeholder="3"
                  value={yearsFreelancing}
                  onChange={(e) => setYearsFreelancing(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="portfolio">Portfolio URL (optional)</Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://your-portfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Link to your portfolio, GitHub, Behance, or LinkedIn
                </p>
              </div>
            </div>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Profile Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll be able to start applying to projects right away. Club AI will
                    help you match with the best opportunities.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return hourlyRateMin && hourlyRateMax && availabilityHours;
      case 2:
        return categories.length > 0;
      case 3:
        return true; // Optional fields
      default:
        return false;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Become a Freelancer</h1>
            <p className="text-muted-foreground">
              Join Club Projects and start earning
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step {step} of 3</span>
            <span className="font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <Card className="p-8">
        {renderStep()}

        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gap-2"
            >
              Next Step
              <Rocket className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => createProfile.mutate()}
              disabled={createProfile.isPending}
              size="lg"
              className="gap-2"
            >
              {createProfile.isPending ? "Creating..." : "Complete Setup"}
              <Rocket className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
