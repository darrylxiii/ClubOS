import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, TrendingUp, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const clients = [
    { name: "TYSON 2.0", industry: "Consumer Goods" },
    { name: "No Art Music & Festival", industry: "Entertainment" },
    { name: "SWED by Snoop Dogg", industry: "Lifestyle" },
    { name: "ABB", industry: "Technology" },
    { name: "Meroda Cosmetics", industry: "Beauty" },
    { name: "Hears", industry: "Technology" },
    { name: "Dore & Rose", industry: "Luxury" },
  ];

  const quickStats = [
    { label: "Active Applications", value: "3", icon: Briefcase },
    { label: "New Matches", value: "12", icon: TrendingUp },
    { label: "Network Size", value: "847", icon: Users },
    { label: "Avg Response", value: "48h", icon: Clock },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your gateway to exclusive opportunities with world-class organizations
            </p>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickStats.map((stat) => (
                <Card 
                  key={stat.label} 
                  className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-6 text-center space-y-2">
                    <stat.icon className="h-6 w-6 mx-auto text-accent" />
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto space-y-4">
            <Link to="/dashboard">
              <Card className="border-0 bg-gradient-accent hover:shadow-glow transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">My Pipeline</h3>
                      <p className="text-muted-foreground">Track your active applications and next steps</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/jobs">
              <Card className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Browse Opportunities</h3>
                      <p className="text-muted-foreground">Discover exclusive positions curated for you</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Client Showcase */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Elite Network</h2>
              <p className="text-muted-foreground">
                Opportunities with industry-leading organizations
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {clients.map((client) => (
                <Card 
                  key={client.name}
                  className="border-0 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-glow group"
                >
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="h-16 flex items-center justify-center">
                      <div className="text-2xl font-bold text-accent group-hover:scale-110 transition-transform">
                        {client.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{client.name}</h4>
                      <p className="text-xs text-muted-foreground">{client.industry}</p>
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
