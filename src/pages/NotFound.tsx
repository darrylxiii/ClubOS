import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-glass-mesh px-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          contain: 'strict',
          contentVisibility: 'auto',
          willChange: 'opacity'
        }}
      >
        <div 
          className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ 
            top: '25%', 
            left: '25%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            willChange: 'opacity'
          }}
        ></div>
        <div 
          className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" 
          style={{ 
            bottom: '25%', 
            right: '25%',
            transform: 'translate(50%, 50%) translateZ(0)',
            animationDelay: "1.5s",
            willChange: 'opacity'
          }}
        ></div>
      </div>

      <div className="text-center relative z-10 space-y-8 max-w-2xl mx-auto animate-bounce-in">
        {/* Large 404 with glass effect */}
        <div className="relative inline-block">
          <h1 className="text-9xl md:text-[12rem] font-black tracking-tighter text-foreground">
            404
          </h1>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl -z-10"></div>
        </div>

        {/* Message card */}
        <div className="glass-card space-y-4 max-w-md mx-auto">
          <p className="text-2xl md:text-3xl font-bold">Page Not Found</p>
          <p className="text-muted-foreground text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* CTA Button */}
        <Link to="/">
          <Button variant="glass" size="lg" className="font-bold hover-lift">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
