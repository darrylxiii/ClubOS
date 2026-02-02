import { Card, CardContent } from "@/components/ui/card";
import { Mail, Users, Bell, Shield } from "lucide-react";
import { useNotificationTypesWithAssignments } from "@/hooks/useNotificationTypes";
import { useNotificationAssignments } from "@/hooks/useNotificationAssignments";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationStatsCards() {
  const { data: types, isLoading: typesLoading } = useNotificationTypesWithAssignments();
  const { data: assignments, isLoading: assignmentsLoading } = useNotificationAssignments();

  const isLoading = typesLoading || assignmentsLoading;

  const stats = {
    totalTypes: types?.length || 0,
    activeTypes: types?.filter(t => t.is_active).length || 0,
    totalAssignments: assignments?.filter(a => a.is_enabled).length || 0,
    criticalNotifications: types?.filter(t => t.priority === 'critical').length || 0,
  };

  const cards = [
    {
      title: "Notification Types",
      value: stats.totalTypes,
      subtitle: `${stats.activeTypes} active`,
      icon: Mail,
      color: "text-blue-500",
    },
    {
      title: "Active Assignments",
      value: stats.totalAssignments,
      subtitle: "Total recipients configured",
      icon: Users,
      color: "text-emerald-500",
    },
    {
      title: "Categories",
      value: 6,
      subtitle: "Applications, Bookings, Security...",
      icon: Bell,
      color: "text-purple-500",
    },
    {
      title: "Critical Alerts",
      value: stats.criticalNotifications,
      subtitle: "High-priority notifications",
      icon: Shield,
      color: "text-red-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="static">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} variant="static">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full bg-muted ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
