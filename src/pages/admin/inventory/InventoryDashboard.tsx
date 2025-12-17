import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

const InventoryDashboard = () => {
  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
            <p className="text-muted-foreground">CFO-grade asset overview</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />Asset Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Dashboard coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default InventoryDashboard;
