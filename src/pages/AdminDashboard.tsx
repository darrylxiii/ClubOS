import { AppLayout } from "@/components/AppLayout";
import { AdminHome } from "@/components/clubhome/AdminHome";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const AdminDashboard = () => {
  return (
    <AppLayout>
      <BackgroundVideo />
      
      <div className="relative z-10 container mx-auto py-8 space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform administration and analytics</p>
        </div>
        
        <div className="glass-card">
          <AdminHome />
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
