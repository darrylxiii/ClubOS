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
        <section className="px-6 pt-12 pb-12 md:pt-24 md:pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-start">
              <div className="space-y-8 md:space-y-10">
                <div className="space-y-4">
                  <p className="text-caps text-muted-foreground">THE QUANTUM CLUB OS</p>
                  <h1 className="text-[3.5rem] leading-[0.85] md:text-[5rem] lg:text-[7rem] font-black uppercase tracking-tighter">
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
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    An invite-only operating system for visionary talent. Track elite opportunities, 
                    prepare for high-stakes interviews, and access undisclosed roles.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/dashboard" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto text-sm font-black uppercase tracking-wider">
                        ENTER DASHBOARD
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/jobs" className="w-full sm:w-auto">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm font-black uppercase tracking-wider">
                        BROWSE ROLES
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-4xl md:text-5xl font-black mb-2">3</div>
                    <div className="text-xs md:text-sm font-black uppercase tracking-wider">ACTIVE PIPELINE</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-4xl md:text-5xl font-black mb-2">12</div>
                    <div className="text-xs md:text-sm font-black uppercase tracking-wider">NEW MATCHES</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-foreground text-background">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-4xl md:text-5xl font-black mb-2">92%</div>
                    <div className="text-xs md:text-sm font-black uppercase tracking-wider">SUCCESS RATE</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-4xl md:text-5xl font-black mb-2">48h</div>
                    <div className="text-xs md:text-sm font-black uppercase tracking-wider">AVG RESPONSE</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="px-6 py-12 md:py-16 border-y-2 border-foreground">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Link to="/dashboard">
                <Card className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-8 md:p-12">
                    <Briefcase className="h-10 w-10 md:h-12 md:w-12 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl md:text-3xl font-black mb-3 uppercase tracking-tight">MY PIPELINE</h3>
                    <p className="text-sm md:text-base">Track applications, prepare for interviews, and manage your elite opportunities</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/jobs">
                <Card className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-8 md:p-12">
                    <TrendingUp className="h-10 w-10 md:h-12 md:w-12 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl md:text-3xl font-black mb-3 uppercase tracking-tight">BROWSE ROLES</h3>
                    <p className="text-sm md:text-base">Discover exclusive positions with 90%+ match scores and auto-apply eligibility</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Network */}
        <section className="px-6 py-16 md:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 md:mb-16 text-center">
              <p className="text-caps text-muted-foreground mb-4">OUR ELITE NETWORK</p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-tight">
                WORLD-CLASS
                <br />
                ORGANIZATIONS
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {clients.map((client) => (
                <Card 
                  key={client.name}
                  className="border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group"
                >
                  <CardContent className="p-6 md:p-8 text-center">
                    <div className="text-lg md:text-xl font-black uppercase tracking-tight">
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
