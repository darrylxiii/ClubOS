import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const clients = [
    { name: "TYSON 2.0" },
    { name: "No Art Music" },
    { name: "SWED" },
    { name: "ABB" },
    { name: "Meroda" },
    { name: "Hears" },
    { name: "Dore & Rose" },
    { name: "Tech Fund" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section - Bold Typography */}
        <section className="px-6 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-caps text-muted-foreground">The Quantum Club OS</p>
                  <h1 className="text-display leading-[0.9]">
                    YOUR
                    <br />
                    ELITE
                    <br />
                    CAREER
                    <br />
                    <span className="italic">COMMAND</span>
                  </h1>
                </div>
                
                <div className="space-y-6 max-w-lg">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    An invite-only operating system for visionary talent. Track elite opportunities, 
                    prepare for high-stakes interviews, and access undisclosed roles.
                  </p>
                  
                  <div className="flex gap-4">
                    <Link to="/dashboard">
                      <Button size="lg" className="text-base font-semibold">
                        Enter Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/jobs">
                      <Button size="lg" variant="outline" className="text-base font-semibold">
                        Browse Roles
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className="text-5xl font-black mb-2">3</div>
                    <div className="text-sm font-bold uppercase tracking-wider">Active Pipeline</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className="text-5xl font-black mb-2">12</div>
                    <div className="text-sm font-bold uppercase tracking-wider">New Matches</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-foreground text-background">
                  <CardContent className="p-8">
                    <div className="text-5xl font-black mb-2">92%</div>
                    <div className="text-sm font-bold uppercase tracking-wider">Success Rate</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className="text-5xl font-black mb-2">48h</div>
                    <div className="text-sm font-bold uppercase tracking-wider">Avg Response</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="px-6 py-16 border-y-2 border-foreground">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Link to="/dashboard">
                <Card className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-12">
                    <Briefcase className="h-12 w-12 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-3xl font-black mb-3 uppercase">My Pipeline</h3>
                    <p className="text-base">Track applications, prepare for interviews, and manage your elite opportunities</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/jobs">
                <Card className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-12">
                    <TrendingUp className="h-12 w-12 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-3xl font-black mb-3 uppercase">Browse Roles</h3>
                    <p className="text-base">Discover exclusive positions with 90%+ match scores and auto-apply eligibility</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Network */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center">
              <p className="text-caps text-muted-foreground mb-4">Our Elite Network</p>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight">
                World-Class
                <br />
                Organizations
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {clients.map((client) => (
                <Card 
                  key={client.name}
                  className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group"
                >
                  <CardContent className="p-8 text-center">
                    <div className="text-xl font-black uppercase tracking-tight">
                      {client.name}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
