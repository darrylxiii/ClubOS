import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Settings, Database, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRecordingControlsProps {
  recordings: any[];
  onRecordingsDeleted: () => void;
}

export function AdminRecordingControls({ recordings, onRecordingsDeleted }: AdminRecordingControlsProps) {
  const [selectedRecordings, setSelectedRecordings] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);

  const handleSelectAll = () => {
    if (selectedRecordings.length === recordings.length) {
      setSelectedRecordings([]);
    } else {
      setSelectedRecordings(recordings.map(r => r.id));
    }
  };

  const handleSelectRecording = (id: string) => {
    setSelectedRecordings(prev => 
      prev.includes(id) 
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRecordings.length === 0) return;

    setDeleting(true);
    try {
      // Get storage paths for selected recordings
      const recordingsToDelete = recordings.filter(r => selectedRecordings.includes(r.id));
      
      // Delete from storage
      for (const recording of recordingsToDelete) {
        if (recording.storage_path) {
          await supabase.storage
            .from('meeting-recordings')
            .remove([recording.storage_path]);
        }
      }

      // Delete from database (permanent)
      const { error } = await supabase
        .from('meeting_recordings_extended' as any)
        .delete()
        .in('id', selectedRecordings);

      if (error) throw error;

      toast.success(`${selectedRecordings.length} recording(s) permanently deleted`);
      setSelectedRecordings([]);
      onRecordingsDeleted();
    } catch (error) {
      console.error('Error deleting recordings:', error);
      toast.error('Failed to delete recordings');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveRetentionSettings = async () => {
    try {
      // Save to system_settings or similar
      const { error } = await supabase
        .from('system_settings' as any)
        .upsert({
          key: 'recording_retention',
          value: {
            enabled: autoDeleteEnabled,
            days: retentionDays
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Retention settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const totalStorageUsed = recordings.reduce((acc, r) => acc + (r.file_size_bytes || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Storage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{recordings.length}</p>
              <p className="text-sm text-muted-foreground">Total Recordings</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatBytes(totalStorageUsed)}</p>
              <p className="text-sm text-muted-foreground">Storage Used</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(recordings.reduce((acc, r) => acc + (r.duration_seconds || 0), 0) / 60)}
              </p>
              <p className="text-sm text-muted-foreground">Total Minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Retention Policy
          </CardTitle>
          <CardDescription>
            Configure automatic deletion of old recordings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-delete old recordings</Label>
              <p className="text-xs text-muted-foreground">
                Automatically remove recordings older than the retention period
              </p>
            </div>
            <Switch
              checked={autoDeleteEnabled}
              onCheckedChange={setAutoDeleteEnabled}
            />
          </div>

          {autoDeleteEnabled && (
            <div className="space-y-2">
              <Label htmlFor="retention-days">Retention Period (days)</Label>
              <Input
                id="retention-days"
                type="number"
                min={7}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 90)}
              />
            </div>
          )}

          <Button onClick={handleSaveRetentionSettings} size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Bulk Actions
          </CardTitle>
          <CardDescription>
            Manage multiple recordings at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedRecordings.length === recordings.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedRecordings.length > 0 && (
                <Badge variant="secondary">
                  {selectedRecordings.length} selected
                </Badge>
              )}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedRecordings.length === 0 || deleting}
                  className="text-rose-600 border-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanently Delete Recordings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedRecordings.length} recording(s) and their 
                    associated files. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-rose-600 text-white hover:bg-rose-700">
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {recordings.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {recordings.map((recording) => (
                <div 
                  key={recording.id}
                  className={`p-2 flex items-center gap-3 hover:bg-muted/50 cursor-pointer ${
                    selectedRecordings.includes(recording.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleSelectRecording(recording.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedRecordings.includes(recording.id)}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {recording.meeting?.title || recording.live_channel?.name || 'Recording'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(recording.created_at).toLocaleDateString()} · {formatBytes(recording.file_size_bytes || 0)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {recording.source_type === 'live_hub' ? 'Live Hub' : 'Meeting'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
