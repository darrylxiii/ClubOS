import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Eye } from 'lucide-react';

interface CompanyActivityPreviewProps {
  companyId: string;
}

export function CompanyActivityPreview({ companyId }: CompanyActivityPreviewProps) {
  const [stats, setStats] = useState({
    postsCount: 0,
    storiesCount: 0,
    totalLikes: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  const fetchStats = async () => {
    try {
      const [postsResult, storiesResult, likesResult] = await Promise.all([
        supabase
          .from('company_posts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('company_stories')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString()),
        supabase
          .from('company_post_likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', 
            (await supabase.from('company_posts').select('id').eq('company_id', companyId)).data?.map(p => p.id) || []
          ),
      ]);

      setStats({
        postsCount: postsResult.count || 0,
        storiesCount: storiesResult.count || 0,
        totalLikes: likesResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  return (
    <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 shadow-lg">
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-3 w-3 text-primary" />
        <span className="font-medium">{stats.postsCount}</span>
        <span className="text-muted-foreground">posts</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Eye className="h-3 w-3 text-primary" />
        <span className="font-medium">{stats.storiesCount}</span>
        <span className="text-muted-foreground">stories</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Heart className="h-3 w-3 text-primary" />
        <span className="font-medium">{stats.totalLikes}</span>
        <span className="text-muted-foreground">likes</span>
      </div>
    </div>
  );
}
