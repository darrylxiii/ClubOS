import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Database, Loader2, Check, AlertTriangle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SAMPLE_COMPANIES = [
  "TechFlow Solutions", "DataVault Inc", "CloudNine Systems", "Quantum Labs",
  "Neural Networks Co", "ByteForge", "CyberPeak", "InnovateTech",
  "DigitalFrontier", "CodeCraft Studios", "FutureScale", "SmartGrid Solutions",
  "AI Dynamics", "BlockChain Ventures", "IoT Innovations", "DataStream Analytics",
  "CryptoSafe", "VirtualEdge", "MetaCore Systems", "QuantumBit"
];

const SAMPLE_NAMES = [
  { first: "John", last: "Smith" }, { first: "Sarah", last: "Johnson" },
  { first: "Michael", last: "Chen" }, { first: "Emily", last: "Davis" },
  { first: "David", last: "Wilson" }, { first: "Lisa", last: "Anderson" },
  { first: "James", last: "Taylor" }, { first: "Maria", last: "Garcia" },
  { first: "Robert", last: "Brown" }, { first: "Jennifer", last: "Martinez" },
  { first: "William", last: "Lee" }, { first: "Amanda", last: "White" },
  { first: "Christopher", last: "Harris" }, { first: "Michelle", last: "Thompson" },
  { first: "Daniel", last: "Jackson" }, { first: "Laura", last: "Robinson" },
  { first: "Matthew", last: "Clark" }, { first: "Stephanie", last: "Lewis" },
  { first: "Andrew", last: "Walker" }, { first: "Nicole", last: "Hall" }
];

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

const SAMPLE_CAMPAIGNS = [
  { name: "Q4 Enterprise Outreach", status: "active" },
  { name: "Tech Startups Campaign", status: "active" },
  { name: "Financial Services Push", status: "paused" },
];

export function CRMSampleDataSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ type: string; count: number }[]>([]);
  const [options, setOptions] = useState({
    prospects: true,
    campaigns: true,
    activities: true,
  });

  const generateEmail = (firstName: string, company: string) => {
    const companySlug = company.toLowerCase().replace(/\s+/g, "").slice(0, 10);
    return `${firstName.toLowerCase()}@${companySlug}.com`;
  };

  const generatePhone = () => {
    return `+1 ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const handleSeed = async () => {
    setSeeding(true);
    setProgress(0);
    setResults([]);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to seed data");
      setSeeding(false);
      return;
    }

    const seedResults: { type: string; count: number }[] = [];
    let totalSteps = 0;
    let completedSteps = 0;

    if (options.campaigns) totalSteps += SAMPLE_CAMPAIGNS.length;
    if (options.prospects) totalSteps += SAMPLE_COMPANIES.length;
    if (options.activities) totalSteps += 10;

    // Seed campaigns
    if (options.campaigns) {
      let campaignCount = 0;
      for (const campaign of SAMPLE_CAMPAIGNS) {
        const { error } = await supabase.from("crm_campaigns").insert({
          name: campaign.name,
          status: campaign.status,
          owner_id: user.id,
          description: `Sample campaign for ${campaign.name}`,
          start_date: new Date().toISOString(),
        });
        if (!error) campaignCount++;
        completedSteps++;
        setProgress(Math.round((completedSteps / totalSteps) * 100));
      }
      seedResults.push({ type: "Campaigns", count: campaignCount });
    }

    // Get campaign IDs for prospects
    const { data: campaigns } = await supabase
      .from("crm_campaigns")
      .select("id")
      .eq("owner_id", user.id)
      .limit(3);

    // Seed prospects
    if (options.prospects) {
      let prospectCount = 0;
      for (let i = 0; i < SAMPLE_COMPANIES.length; i++) {
        const company = SAMPLE_COMPANIES[i];
        const name = SAMPLE_NAMES[i];
        const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
        const score = Math.floor(Math.random() * 60) + 40;
        const campaignId = campaigns?.[Math.floor(Math.random() * (campaigns?.length || 1))]?.id;

        const { error } = await supabase.from("crm_prospects").insert({
          company_name: company,
          first_name: name.first,
          last_name: name.last,
          email: generateEmail(name.first, company),
          phone: generatePhone(),
          title: ["CEO", "CTO", "VP Engineering", "Head of Product", "Director"][Math.floor(Math.random() * 5)],
          stage,
          score,
          owner_id: user.id,
          campaign_id: campaignId || null,
          source: ["linkedin", "referral", "cold_outreach", "inbound", "event"][Math.floor(Math.random() * 5)],
          website: `https://${company.toLowerCase().replace(/\s+/g, "")}.com`,
          linkedin_url: `https://linkedin.com/company/${company.toLowerCase().replace(/\s+/g, "-")}`,
        });
        if (!error) prospectCount++;
        completedSteps++;
        setProgress(Math.round((completedSteps / totalSteps) * 100));
      }
      seedResults.push({ type: "Prospects", count: prospectCount });
    }

    // Get prospect IDs for activities
    const { data: prospects } = await supabase
      .from("crm_prospects")
      .select("id")
      .eq("owner_id", user.id)
      .limit(20);

    // Seed activities
    if (options.activities && prospects?.length) {
      let activityCount = 0;
      const activityTypes = ["email", "call", "meeting", "note", "linkedin_message"];
      for (let i = 0; i < 10; i++) {
        const prospect = prospects[Math.floor(Math.random() * prospects.length)];
        const { error } = await supabase.from("crm_activities").insert({
          prospect_id: prospect.id,
          type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          subject: `Sample activity ${i + 1}`,
          notes: "This is a sample activity created by the seeder",
          performed_by: user.id,
          performed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (!error) activityCount++;
        completedSteps++;
        setProgress(Math.round((completedSteps / totalSteps) * 100));
      }
      seedResults.push({ type: "Activities", count: activityCount });
    }

    setResults(seedResults);
    setSeeding(false);
    toast.success("Sample data seeded successfully!");
  };

  const handleClearData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const confirmed = window.confirm("Are you sure you want to delete ALL CRM data? This cannot be undone.");
    if (!confirmed) return;

    setSeeding(true);
    
    await supabase.from("crm_activities").delete().eq("performed_by", user.id);
    await supabase.from("crm_prospects").delete().eq("owner_id", user.id);
    await supabase.from("crm_campaigns").delete().eq("owner_id", user.id);
    
    setSeeding(false);
    setResults([]);
    toast.success("CRM data cleared");
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Sample Data Seeder
        </CardTitle>
        <CardDescription>Generate sample CRM data for testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-500">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">This will create test data in your CRM.</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(options).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={value}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, [key]: checked === true }))}
              />
              <Label htmlFor={key} className="capitalize">{key}</Label>
            </div>
          ))}
        </div>

        {seeding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">Seeding... {progress}%</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2 text-green-500">
              <Check className="h-4 w-4" />
              <span className="font-medium">Seeding Complete</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {results.map((result) => (
                <Badge key={result.type} variant="outline">{result.count} {result.type}</Badge>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSeed} disabled={seeding} className="flex-1">
            {seeding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Seeding...</> : <><Database className="h-4 w-4 mr-2" />Seed Sample Data</>}
          </Button>
          <Button variant="outline" onClick={handleClearData} disabled={seeding}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
