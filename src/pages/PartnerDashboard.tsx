import { AppLayout } from "@/components/AppLayout";
import { PartnerHome } from "@/components/clubhome/PartnerHome";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const PartnerDashboard = () => {
  return (
    <AppLayout>
      <BackgroundVideo />
      
      <div className="relative z-10 container mx-auto py-8 space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">Manage your hiring pipeline</p>
        </div>
        
        <div className="glass-card">
          <PartnerHome />
        </div>
      </div>
    </AppLayout>
  );
};

export default PartnerDashboard;
