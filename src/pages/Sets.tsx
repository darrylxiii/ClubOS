import { useState } from 'react';
import { Video, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SetsBrowser } from '@/components/radio/sets/SetsBrowser';
import { SetUploadDialog } from '@/components/radio/sets/SetUploadDialog';
import { useRole } from '@/contexts/RoleContext';

export default function Sets() {
  const { availableRoles } = useRole();
  const isAdmin = availableRoles.includes('admin');
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
            <Video className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">DJ Sets</h1>
            <p className="text-sm text-muted-foreground">
              Watch and listen to full DJ performances in up to 4K
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Set
          </Button>
        )}
      </div>

      {/* Browser */}
      <SetsBrowser />

      {/* Upload Dialog (admin only) */}
      {isAdmin && (
        <SetUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      )}
    </div>
  );
}
