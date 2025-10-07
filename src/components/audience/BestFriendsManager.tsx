import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Search, UserPlus, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
}

interface BestFriendsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BestFriendsManager = ({ isOpen, onClose }: BestFriendsManagerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bestFriends, setBestFriends] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBestFriends();
    }
  }, [isOpen]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadBestFriends = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase as any)
        .from('best_friends')
        .select(`
          friend_user_id,
          profiles:friend_user_id(
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('user_id', user.user.id);

      if (error) throw error;

      const friends = (data || []).map((item: any) => item.profiles).filter(Boolean) as User[];
      setBestFriends(friends);
    } catch (error) {
      console.error('Error loading best friends:', error);
      toast.error('Failed to load best friends');
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .ilike('full_name', `%${searchQuery}%`)
        .neq('id', user.user.id)
        .limit(10);

      if (error) throw error;

      // Filter out already added best friends
      const filtered = data.filter(
        profile => !bestFriends.some(friend => friend.id === profile.id)
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBestFriend = async (friendId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await (supabase as any)
        .from('best_friends')
        .insert({
          user_id: user.user.id,
          friend_user_id: friendId,
        });

      if (error) throw error;

      toast.success('Added to best friends');
      loadBestFriends();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding best friend:', error);
      toast.error('Failed to add best friend');
    }
  };

  const removeBestFriend = async (friendId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await (supabase as any)
        .from('best_friends')
        .delete()
        .eq('user_id', user.user.id)
        .eq('friend_user_id', friendId);

      if (error) throw error;

      toast.success('Removed from best friends');
      loadBestFriends();
    } catch (error) {
      console.error('Error removing best friend:', error);
      toast.error('Failed to remove best friend');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Heart className="w-6 h-6 text-pink-500" />
            Best Friends
          </DialogTitle>
          <DialogDescription>
            Add your most trusted contacts to your best friends list for easy sharing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Search Results</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBestFriend(user.id)}
                        className="gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Your Best Friends</h4>
              <Badge variant="secondary">{bestFriends.length}</Badge>
            </div>

            {bestFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No best friends yet</p>
                <p className="text-sm">Search and add your closest contacts</p>
              </div>
            ) : (
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {bestFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>
                            {friend.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.full_name}</p>
                          <p className="text-sm text-muted-foreground">{friend.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBestFriend(friend.id)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};