import { Card, CardContent } from "@/components/ui/card";
import { 
  Briefcase, 
  Brain, 
  Target, 
  Shield, 
  Users, 
  Building2, 
  MessageSquare, 
  Zap 
} from "lucide-react";

const features = [
  {
    icon: Briefcase,
    title: "Career Mission Control",
    description: "Track applications, interviews, and offers in one unified command center",
  },
  {
    icon: Brain,
    title: "AI Career Advisor",
    description: "QUIN AI provides personalized insights, prep, and strategic recommendations",
  },
  {
    icon: Target,
    title: "Exclusive Job Matches",
    description: "90%+ match scores with undisclosed roles from top-tier companies",
  },
  {
    icon: Shield,
    title: "Stealth Privacy Mode",
    description: "Hide your profile from your current employer while exploring opportunities",
  },
  {
    icon: Users,
    title: "Invite-Only Events",
    description: "Exclusive networking events, AMAs, and workshops with industry leaders",
  },
  {
    icon: Building2,
    title: "Company Wall",
    description: "Deep insights into company culture, comp, and hiring processes",
  },
  {
    icon: MessageSquare,
    title: "Club AMA",
    description: "Direct access to hiring managers and founders in our community",
  },
  {
    icon: Zap,
    title: "Auto-Apply Engine",
    description: "Club Sync automatically applies to matching roles on your behalf",
  },
];

export const FeatureCards = () => {
  return (
    <section className="px-6 py-20 md:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-caps text-muted-foreground mb-4">PLATFORM FEATURES</p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-tight">
            YOUR ELITE
            <br />
            CAREER OS
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="relative border-2 border-foreground/10 hover:border-foreground/30 transition-all duration-300 group animate-fade-in hover-lift overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-6">
                <div className="p-3 rounded-lg bg-foreground/5 w-fit mb-4 group-hover:bg-foreground/10 transition-colors duration-300">
                  <feature.icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
