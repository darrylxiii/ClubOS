import { AdminMemberRequests } from "@/components/admin/AdminMemberRequests";

const MemberRequestsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Member Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve new member applications from candidates and partners
        </p>
      </div>
      <AdminMemberRequests />
    </div>
  );
};

export default MemberRequestsPage;
