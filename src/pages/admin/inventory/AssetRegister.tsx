import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

const AssetRegister = () => {
  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Asset Register</h1>
              <p className="text-muted-foreground">Manage all company assets</p>
            </div>
            <Button><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />All Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No assets registered yet.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default AssetRegister;
