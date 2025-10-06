import { Link } from "react-router-dom";
import { Linkedin, Twitter, Mail } from "lucide-react";

export const LandingFooter = () => {
  return (
    <footer className="border-t-2 border-foreground/10 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight mb-4">TQC</div>
            <p className="text-sm text-muted-foreground">
              The Quantum Club
              <br />
              Invite-only career platform
            </p>
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-wider mb-4">Platform</div>
            <div className="space-y-2 text-sm">
              <Link to="/auth" className="block text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <button className="block text-muted-foreground hover:text-foreground transition-colors">
                Request Invite
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-wider mb-4">Legal</div>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-wider mb-4">Connect</div>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:hello@thequantumclub.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-foreground/10 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
