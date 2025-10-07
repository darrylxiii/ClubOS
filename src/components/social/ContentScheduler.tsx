import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ScheduledPost {
  id: string;
  title: string;
  platforms: string[];
  scheduledDate: Date;
  status: "planned" | "scheduled" | "published";
}

export const ContentScheduler = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduledPosts] = useState<ScheduledPost[]>([
    {
      id: "1",
      title: "New product launch announcement",
      platforms: ["instagram", "twitter", "linkedin"],
      scheduledDate: new Date(),
      status: "scheduled"
    }
  ]);

  const postsForSelectedDate = scheduledPosts.filter(
    post => format(post.scheduledDate, 'yyyy-MM-dd') === format(selectedDate || new Date(), 'yyyy-MM-dd')
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Content Calendar</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
        <Button className="w-full mt-4 gap-2">
          <Plus className="h-4 w-4" />
          Schedule Post
        </Button>
      </Card>

      {/* Scheduled Posts */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            Posts for {format(selectedDate || new Date(), 'MMMM d, yyyy')}
          </h3>
          <Badge variant="secondary">
            {postsForSelectedDate.length} scheduled
          </Badge>
        </div>

        <div className="space-y-4">
          {postsForSelectedDate.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No posts scheduled for this day</p>
            </div>
          ) : (
            postsForSelectedDate.map((post) => (
              <Card key={post.id} className="p-4 bg-card/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {format(post.scheduledDate, 'h:mm a')}
                      </span>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>
                        {post.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-2">{post.title}</h4>
                    <div className="flex gap-2">
                      {post.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};