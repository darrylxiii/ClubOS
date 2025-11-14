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

  const handleNavClick = (path: string) => {
    // Haptic feedback simulation
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t md:hidden pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => handleNavClick(path)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] transition-all duration-200 ${
              isActive(path)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={label}
            aria-current={isActive(path) ? 'page' : undefined}
          >
            <div className={`flex flex-col items-center justify-center transition-all duration-200 ${
              isActive(path) ? 'scale-110' : ''
            }`}>
              <div className={`rounded-full p-1.5 transition-all duration-200 ${
                isActive(path) ? 'bg-primary/10' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium mt-1">{label}</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
});

MobileNavigation.displayName = 'MobileNavigation';
