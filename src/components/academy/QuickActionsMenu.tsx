import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Award, Target } from 'lucide-react';

export const QuickActionsMenu = () => {
  const actions = [
    { label: 'My Skills', icon: Target, href: '/academy/my-skills' },
    { label: 'Certificates', icon: Award, href: '/academy?tab=certificates' },
    { label: 'Leaderboard', icon: Trophy, href: '/academy/leaderboard' },
    { label: 'Browse Courses', icon: BookOpen, href: '/academy?tab=explore' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Link key={action.href} to={action.href}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
