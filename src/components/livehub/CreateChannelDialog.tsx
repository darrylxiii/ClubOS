import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string | null;
  onChannelCreated: () => void;
}

const CreateChannelDialog = ({ open, onOpenChange, serverId, onChannelCreated }: CreateChannelDialogProps) => {
  const { t } = useTranslation('meetings');
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice' | 'video' | 'stage'>('text');
  const [category, setCategory] = useState('GENERAL');
  const [autoRecord, setAutoRecord] = useState(false);
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !serverId) {
      toast.error(t('channel.enterName', 'Please enter a channel name'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_channels')
        .insert({
          server_id: serverId,
          name: name.trim(),
          channel_type: channelType,
          category,
          auto_record: autoRecord,
          auto_transcribe: autoTranscribe
        });

      if (error) throw error;

      toast.success(t('channel.created', 'Channel created successfully'));
      onChannelCreated();
      onOpenChange(false);
      setName('');
      setChannelType('text');
      setCategory('GENERAL');
      setAutoRecord(false);
      setAutoTranscribe(true);
    } catch (error: unknown) {
      console.error('Error creating channel:', error);
      const errorMessage = error instanceof Error ? error.message : t('channel.createFailed', 'Failed to create channel');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('channel.createChannel', 'Create Channel')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('channel.channelName', 'Channel Name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., general-chat"
            />
          </div>

          <div>
            <Label htmlFor="type">{t('channel.channelType', 'Channel Type')}</Label>
            <Select value={channelType} onValueChange={(value: any) => setChannelType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t('channel.textChannel', 'Text Channel')}</SelectItem>
                <SelectItem value="voice">{t('channel.voiceChannel', 'Voice Channel')}</SelectItem>
                <SelectItem value="video">{t('channel.videoChannel', 'Video Channel')}</SelectItem>
                <SelectItem value="stage">{t('channel.stageChannel', 'Stage Channel')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">{t('channel.category', 'Category')}</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., GENERAL," STRATEGY
            />
          </div>

          {(channelType === 'voice' || channelType === 'video' || channelType === 'stage') && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-record">{t('channel.autoRecord', 'Auto-record sessions')}</Label>
                <Switch
                  id="auto-record"
                  checked={autoRecord}
                  onCheckedChange={setAutoRecord}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-transcribe">{t('channel.autoTranscribe', 'Auto-transcribe audio')}</Label>
                <Switch
                  id="auto-transcribe"
                  checked={autoTranscribe}
                  onCheckedChange={setAutoTranscribe}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {t('channel.createChannel', 'Create Channel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChannelDialog;
