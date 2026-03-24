import { AdminMemberRequests } from "@/components/admin/AdminMemberRequests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PendingRequestsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Requests</CardTitle>
        <CardDescription>
          Review and approve new member applications from candidates and partners
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminMemberRequests />
      </CardContent>
    </Card>
  );
};

export default PendingRequestsTab;
