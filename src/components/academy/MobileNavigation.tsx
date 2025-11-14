import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Award, User } from 'lucide-react';

export const MobileNavigation = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/academy' },
    { icon: BookOpen, label: 'My Learning', path: '/academy/my-courses' },
    { icon: Award, label: 'Achievements', path: '/academy/achievements' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(path)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
});

MobileNavigation.displayName = 'MobileNavigation';
