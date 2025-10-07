import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ThumbsUp, ThumbsDown, Flag, CheckCheck, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const UnifiedInbox = () => {
  const [selectedComment, setSelectedComment] = useState<string | null>(null);

  const comments = [
    {
      id: "1",
      platform: "instagram",
      author: "johndoe",
      avatar: "",
      content: "This is amazing! Love your work 🔥",
      timestamp: "2 hours ago",
      sentiment: "positive",
      status: "pending"
    },
    {
      id: "2",
      platform: "twitter",
      author: "janedoe",
      avatar: "",
      content: "When will this be available?",
      timestamp: "4 hours ago",
      sentiment: "neutral",
      status: "pending"
    },
    {
      id: "3",
      platform: "tiktok",
      author: "user123",
      avatar: "",
      content: "spam spam spam buy now!!!",
      timestamp: "5 hours ago",
      sentiment: "negative",
      status: "spam"
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: "bg-green-500/10 text-green-500 border-green-500/20",
      neutral: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      negative: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return colors[sentiment] || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search comments..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {comments.filter(c => c.status === "pending").length} pending
          </Badge>
        </div>
      </div>

      {/* Inbox Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="replied">Replied</TabsTrigger>
          <TabsTrigger value="spam">Spam</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {comments.map((comment) => (
            <Card 
              key={comment.id} 
              className={`p-4 cursor-pointer transition-colors ${
                selectedComment === comment.id ? 'bg-primary/5 border-primary' : 'hover:bg-card/80'
              }`}
              onClick={() => setSelectedComment(comment.id)}
            >
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.avatar} />
                  <AvatarFallback>{comment.author[0].toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">@{comment.author}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {comment.platform}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getSentimentColor(comment.sentiment)}`}>
                        {comment.sentiment}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{comment.timestamp}</span>
                  </div>

                  <p className="text-sm">{comment.content}</p>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ThumbsUp className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Reply
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ThumbsDown className="h-3 w-3" />
                      Hide
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive">
                      <Flag className="h-3 w-3" />
                      Spam
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending">
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Pending comments will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="replied">
          <Card className="p-12 text-center">
            <CheckCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Replied comments will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="spam">
          <Card className="p-12 text-center">
            <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Spam comments will appear here</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};