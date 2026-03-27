import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CompanyPerson, CompanyPersonChange } from "@/hooks/usePartnerOrgIntelligence";

interface Props {
  companyId: string;
  people: CompanyPerson[];
  changes: CompanyPersonChange[];
}

export function OrgInsightsCard({ companyId, people, changes }: Props) {
  const { t } = useTranslation('common');
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Build context for AI
      const deptCounts: Record<string, number> = {};
      const seniorityCounts: Record<string, number> = {};
      let totalTenure = 0;
      let decisionMakers = 0;
      let matched = 0;

      for (const p of people.filter(p => p.is_still_active)) {
        const dept = p.department_inferred || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        const sen = p.seniority_level || 'Unknown';
        seniorityCounts[sen] = (seniorityCounts[sen] || 0) + 1;
        totalTenure += p.years_at_company || 0;
        if (p.is_decision_maker) decisionMakers++;
        if (p.matched_candidate_id) matched++;
      }

      const recentHires = changes.filter(c => c.change_type === 'new_hire').length;
      const recentDepartures = changes.filter(c => c.change_type === 'departure').length;

      const context = `Organization data for a company:
- Total active employees mapped: ${people.filter(p => p.is_still_active).length}
- Department breakdown: ${JSON.stringify(deptCounts)}
- Seniority breakdown: ${JSON.stringify(seniorityCounts)}
- Average tenure: ${(totalTenure / Math.max(people.length, 1)).toFixed(1)} years
- Decision makers (VP+): ${decisionMakers}
- Matched with our talent pool: ${matched}
- Recent new hires (detected): ${recentHires}
- Recent departures (detected): ${recentDepartures}`;

      const { data, error } = await supabase.functions.invoke('club-ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are an organizational intelligence analyst for a recruitment firm. Generate 4-5 brief, actionable insights about a partner company\'s organization based on the data. Each insight should be one sentence. Focus on: team growth trends, leadership gaps, attrition signals, recruitment opportunities. Do not fabricate data. Be direct and specific.',
            },
            { role: 'user', content: context },
          ],
        },
      });

      if (error) throw error;

      // Parse the response
      const responseText = typeof data === 'string' ? data :
        data?.choices?.[0]?.message?.content ||
        data?.message || '';

      const parsedInsights = responseText
        .split('\n')
        .map((line: string) => line.replace(/^[\d\-\*\•\.]+\s*/, '').trim())
        .filter((line: string) => line.length > 10);

      setInsights(parsedInsights.slice(0, 5));
      setGenerated(true);
    } catch (err) {
      console.error('Insights generation error:', err);
      toast.error(t("failed_to_generate_insights", "Failed to generate insights"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5" />
          AI Organization Insights
          <span className="text-xs font-normal text-muted-foreground">{t("powered_by_quin", "Powered by QUIN")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!generated ? (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered insights about this company's organizational structure, growth patterns, and recruitment opportunities.
            </p>
            <Button onClick={generateInsights} disabled={loading || people.length === 0} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {loading ? 'Analyzing...' : 'Generate Insights'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <span className="text-accent font-bold text-sm mt-0.5">{idx + 1}.</span>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={generateInsights} disabled={loading} className="mt-4 gap-2">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
