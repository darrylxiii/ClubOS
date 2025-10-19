import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { Stories } from "@/components/feed/Stories";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { TrendingUp, Users, Sparkles } from "lucide-react";
import { useAlgorithmicFeed } from "@/hooks/useAlgorithmicFeed";

export default function Feed() {
  const { user } = useAuth();
  const { posts, loading, feedType, setFeedType, refetch } = useAlgorithmicFeed();

  return (
    <AppLayout>
      {/* Background Video */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/videos/surreal-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Stories Section */}
        <Stories />

        {/* Create Post */}
        {user && <CreatePost onPostCreated={refetch} />}
        
        {/* Feed Tabs */}
        <Tabs 
          value={feedType === 'algorithmic' ? 'foryou' : feedType} 
          onValueChange={(value) => {
            if (value === 'foryou') setFeedType('algorithmic');
            else if (value === 'trending') setFeedType('trending');
            else if (value === 'following') setFeedType('following');
          }}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="foryou" className="gap-2">
              <Sparkles className="w-4 h-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <Users className="w-4 h-4" />
              Following
            </TabsTrigger>
          </TabsList>

          <TabsContent value="foryou" className="space-y-4 mt-4">
            {loading ? (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No posts yet. Be the first to share something!
              </div>
            ) : (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4 mt-4">
            {loading ? (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4 mt-4">
            {loading ? (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}