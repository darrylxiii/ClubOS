import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Calendar, MessageCircle, ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const quickLinks = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Meetings", path: "/meetings" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      
      {/* Animated accent orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 1 }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent/20 blur-[100px]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl mx-auto px-6"
      >
        {/* Logo/Brand */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="text-3xl">☘️</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
            The Quantum Club
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          {/* 404 Display */}
          <div className="text-center mb-8">
            <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-foreground/10 select-none">
              404
            </h1>
            <div className="mt-[-2rem] md:mt-[-3rem]">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Page Not Found
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved to a new location.
              </p>
            </div>
          </div>

          {/* Attempted Path */}
          <div className="bg-muted/50 rounded-xl px-4 py-3 mb-8 border border-border/30">
            <div className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <code className="text-muted-foreground font-mono truncate">
                {location.pathname}
              </code>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 mb-8">
            <p className="text-sm font-medium text-muted-foreground text-center">
              Quick Navigation
            </p>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                >
                  <Link to={link.path}>
                    <Button
                      variant="outline"
                      className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                    >
                      <link.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">{link.label}</span>
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex flex-col items-center gap-4"
          >
            <Link to="/" className="w-full">
              <Button 
                size="lg" 
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-12"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
            
            {/* Auto-redirect countdown */}
            <p className="text-xs text-muted-foreground">
              Auto-redirecting in <span className="font-semibold text-foreground">{countdown}s</span>
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Need help?{" "}
          <Link to="/support" className="text-primary hover:underline">
            Contact Support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFound;
