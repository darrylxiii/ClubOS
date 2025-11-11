import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Briefcase, 
  Star
} from "lucide-react";

interface FreelancerDashboardProps {
  userId: string;
}

export function FreelancerDashboard({ userId }: FreelancerDashboardProps) {
  // Since we no longer have a freelance_profiles table, we'll show a simplified dashboard
  // that encourages users to browse projects
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Your Freelance Dashboard</h2>
        <p className="text-muted-foreground mb-6">
          You're all set! Browse available projects to find your next opportunity.
        </p>
        
        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Proposals</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Projects Won</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">-</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
        </div>
      </Card>
      
      {/* TODO: Add real dashboard stats from projects, proposals, contracts tables */}
    </div>
  );
}
