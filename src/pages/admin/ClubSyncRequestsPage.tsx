import { ClubSyncRequests } from "@/components/admin/ClubSyncRequests";

const ClubSyncRequestsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Club Sync Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve Club Sync activation requests from partners
        </p>
      </div>
      <ClubSyncRequests />
    </div>
  );
};

export default ClubSyncRequestsPage;
