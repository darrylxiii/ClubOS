import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Euro, Award } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

// Utility function to calculate referral bonus based on salary
const calculateReferralBonus = (salary: number): number => {
  if (salary < 50000) return 1000;
  if (salary < 75000) return 1500;
  if (salary < 125000) return 2000;
  return 3000;
};

const Referrals = () => {
  // Mock data for referrals
  const referrals = [
    {
      id: 1,
      friendName: "Sarah Mitchell",
      jobTitle: "Chief Technology Officer",
      company: "Stealth Startup",
      salary: 145000,
      status: "interview" as const,
      matchScore: 94,
      referredDate: "2 weeks ago",
      currentStage: "Technical Interview",
    },
    {
      id: 2,
      friendName: "James Rodriguez",
      jobTitle: "VP of Product",
      company: "Elite Tech Fund",
      salary: 85000,
      status: "screening" as const,
      matchScore: 88,
      referredDate: "1 week ago",
      currentStage: "Initial Screening",
    },
    {
      id: 3,
      friendName: "Emma Chen",
      jobTitle: "Head of Design",
      company: "Luxury Tech Brand",
      salary: 65000,
      status: "offer" as const,
      matchScore: 96,
      referredDate: "3 weeks ago",
      currentStage: "Offer Extended",
    },
    {
      id: 4,
      friendName: "Marcus Thompson",
      jobTitle: "Chief Revenue Officer",
      company: "SaaS Unicorn",
      salary: 42000,
      status: "applied" as const,
      matchScore: 82,
      referredDate: "4 days ago",
      currentStage: "Application Submitted",
    },
  ];

  const totalPotentialEarnings = referrals.reduce((sum, ref) => {
    return sum + calculateReferralBonus(ref.salary);
  }, 0);

  const successfulReferrals = referrals.filter(r => r.status === "offer").length;

  const stats = [
    {
      title: "Total Referrals",
      value: referrals.length.toString(),
      icon: Users,
      description: "Friends you've referred",
    },
    {
      title: "Potential Earnings",
      value: `€${totalPotentialEarnings.toLocaleString()}`,
      icon: Euro,
      description: "If all referrals succeed",
    },
    {
      title: "Success Rate",
      value: `${Math.round((successfulReferrals / referrals.length) * 100)}%`,
      icon: Award,
      description: `${successfulReferrals} offers extended`,
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-accent blur-3xl opacity-20 rounded-full"></div>
          <h1 className="text-4xl font-bold mb-2 relative">
            Referral <span className="text-accent">Dashboard</span>
          </h1>
          <p className="text-muted-foreground italic">
            Earn rewards by connecting elite talent with exclusive opportunities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-accent/20 bg-gradient-card shadow-glow hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1 bg-gradient-accent bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Compensation Bands Info */}
        <Card className="border border-accent/20 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-accent" />
              Referral Bonus Structure
            </CardTitle>
            <CardDescription>Earn competitive bonuses based on role compensation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€0 - €50k</div>
                <div className="text-2xl font-bold text-accent">€1,000</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€50k - €75k</div>
                <div className="text-2xl font-bold text-accent">€1,500</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€75k - €125k</div>
                <div className="text-2xl font-bold text-accent">€2,000</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€125k+</div>
                <div className="text-2xl font-bold text-accent">€3,000</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Referrals</h2>
          
          {referrals.map((referral) => {
            const bonus = calculateReferralBonus(referral.salary);
            return (
              <Card key={referral.id} className="border border-accent/20 bg-gradient-card hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{referral.friendName}</CardTitle>
                        <StatusBadge status={referral.status} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {referral.jobTitle} at {referral.company}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Potential Bonus</div>
                      <div className="text-xl font-bold text-accent">€{bonus.toLocaleString()}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Match Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-accent rounded-full transition-all duration-500"
                            style={{ width: `${referral.matchScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{referral.matchScore}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current Stage</div>
                      <div className="text-sm font-medium">{referral.currentStage}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Referred</div>
                      <div className="text-sm font-medium">{referral.referredDate}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Salary Range: €{referral.salary.toLocaleString()}
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Referrals;
