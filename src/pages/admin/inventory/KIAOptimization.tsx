import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

const KIAOptimization = () => {
  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">KIA & Tax Optimization</h1>
            <p className="text-muted-foreground">Kleinschaligheidsinvesteringsaftrek overview</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />KIA Eligible Investments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No KIA eligible investments found.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default KIAOptimization;
