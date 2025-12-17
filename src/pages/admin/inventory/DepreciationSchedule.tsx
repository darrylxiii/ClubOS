import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

const DepreciationSchedule = () => {
  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Depreciation Schedule</h1>
            <p className="text-muted-foreground">Monthly and yearly depreciation overview</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />Depreciation Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No depreciation entries yet.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default DepreciationSchedule;
