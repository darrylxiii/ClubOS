import { AppLayout } from "@/components/AppLayout";
import { CandidateHome } from "@/components/clubhome/CandidateHome";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const Dashboard = () => {
  return (
    <AppLayout>
      <BackgroundVideo />
      
      <div className="relative z-10 container mx-auto py-8 space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your career command center</p>
        </div>
        
        <div className="glass-card">
          <CandidateHome />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
