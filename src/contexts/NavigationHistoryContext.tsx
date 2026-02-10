import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationEntry {
  route: string;
  title: string;
  timestamp: string;
}

interface NavigationHistoryContextType {
  history: NavigationEntry[];
  addEntry: (route: string, title: string) => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

const MAX_HISTORY_ENTRIES = 5;

// Route title mapping
const getPageTitle = (pathname: string): string => {
  const titleMap: Record<string, string> = {
    '/': 'Home',
    '/home': 'Home',
    '/feed': 'Social Feed',
    '/jobs': 'Jobs',
    '/applications': 'My Applications',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/messages': 'Messages',
    '/companies': 'Companies',
    '/achievements': 'Achievements',
    '/club-ai': 'Club AI',
    '/admin/communication-hub': 'Communication Hub',
    '/unified-tasks': 'Tasks',
    '/scheduling': 'Scheduling',
    '/analytics': 'Analytics',
    '/admin': 'Admin',
    '/referrals': 'Referrals',
    '/interview-prep': 'Interview Prep',
  };

  // Check for dynamic routes
  if (pathname.startsWith('/company/')) return 'Company Profile';
  if (pathname.startsWith('/job/')) return 'Job Details';
  if (pathname.startsWith('/application/')) return 'Application Details';
  if (pathname.startsWith('/user/')) return 'User Profile';

  return titleMap[pathname] || 'Page';
};

export const NavigationHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const location = useLocation();

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    const entry: NavigationEntry = {
      route: location.pathname,
      title,
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => {
      // Don't add duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1].route === entry.route) {
        return prev;
      }
      
      const newHistory = [...prev, entry];
      // Keep only the last N entries
      if (newHistory.length > MAX_HISTORY_ENTRIES) {
        return newHistory.slice(-MAX_HISTORY_ENTRIES);
      }
      return newHistory;
    });
  }, [location.pathname]);

  const addEntry = (route: string, title: string) => {
    setHistory((prev) => {
      const entry: NavigationEntry = { route, title, timestamp: new Date().toISOString() };
      const newHistory = [...prev, entry];
      if (newHistory.length > MAX_HISTORY_ENTRIES) {
        return newHistory.slice(-MAX_HISTORY_ENTRIES);
      }
      return newHistory;
    });
  };

  return (
    <NavigationHistoryContext.Provider value={{ history, addEntry }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
};

export const useNavigationHistory = () => {
  const context = useContext(NavigationHistoryContext);
  if (!context) {
    throw new Error('useNavigationHistory must be used within NavigationHistoryProvider');
  }
  return context;
};
