import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

const ServerSidebar = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    const { data, error } = await supabase
      .from('live_servers')
      .select('id, name, icon_url')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading servers:', error);
      return;
    }

    if (data && data.length > 0) {
      setServers(data);
      setSelectedServerId(data[0].id);
    }
  };

  return (
    <div className="w-20 bg-card border-r border-border flex flex-col items-center py-3 gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all"
            >
              <Home className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Home</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-0.5 bg-border rounded-full my-1" />

        {servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all ${
                  selectedServerId === server.id ? 'bg-primary/10 rounded-xl' : ''
                }`}
                onClick={() => setSelectedServerId(server.id)}
              >
                {server.icon_url ? (
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={server.icon_url} alt={server.name} />
                    <AvatarFallback>{server.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                    {server.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{server.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

export default ServerSidebar;
