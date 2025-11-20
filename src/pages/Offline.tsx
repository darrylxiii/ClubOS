import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Offline() {
  return (
    <div className="min-h-screen bg-eclipse flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <WifiOff className="w-20 h-20 mx-auto mb-6 text-gold" />
        <h1 className="text-3xl font-bold text-ivory mb-4">
          You're Offline
        </h1>
        <p className="text-muted-foreground mb-8">
          No internet connection detected. Check your network and try again.
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="bg-gold hover:bg-gold/90"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
