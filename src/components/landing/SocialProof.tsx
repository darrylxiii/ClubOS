import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "The Quantum Club changed my career trajectory. Three interviews, two offers, all within a week.",
    author: "Sarah Chen",
    role: "VP of Engineering",
    company: "Series B SaaS",
  },
  {
    quote: "Finally, a platform that treats candidates like professionals. The level of curation is unmatched.",
    author: "Marcus Williams",
    role: "Head of Product",
    company: "Fortune 500",
  },
  {
    quote: "QUIN's interview prep was game-changing. I felt prepared and confident in every conversation.",
    author: "Priya Patel",
    role: "Senior Data Scientist",
    company: "AI Startup",
  },
];

const stats = [
  { value: "1,200+", label: "Elite Members" },
  { value: "92%", label: "Success Rate" },
  { value: "48h", label: "Avg Response Time" },
  { value: "€180K", label: "Avg Package" },
];

export const SocialProof = () => {
  return (
    <section className="px-6 py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-2 border-foreground/10">
              <CardContent className="p-6 text-center">
                <div className="text-4xl md:text-5xl font-black mb-2">{stat.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <p className="text-caps text-muted-foreground mb-4">MEMBER TESTIMONIALS</p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
            ELITE OUTCOMES
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="border-2 border-foreground/10 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8">
                <Quote className="h-8 w-8 mb-4 text-muted-foreground" />
                <p className="text-sm leading-relaxed mb-6">{testimonial.quote}</p>
                <div>
                  <div className="font-bold text-sm">{testimonial.author}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role} • {testimonial.company}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="font-bold uppercase tracking-wider">GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="font-bold uppercase tracking-wider">Private & Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="font-bold uppercase tracking-wider">Invite Reviewed</span>
          </div>
        </div>
      </div>
    </section>
  );
};
