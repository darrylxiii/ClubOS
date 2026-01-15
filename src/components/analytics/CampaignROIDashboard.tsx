
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCampaignPerformance } from '@/hooks/useCampaignPerformance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Trophy, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/revenueCalculations';

export function CampaignROIDashboard() {
    const { data: campaigns, isLoading } = useCampaignPerformance();

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    const topCampaigns = campaigns?.slice(0, 5) || [];

    // Color palette for charts
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card className="bg-gradient-to-br from-card/90 to-card/60 border-border/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            Revenue Attribution
                        </CardTitle>
                        <CardDescription>Top revenue generating campaigns</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCampaigns} layout="vertical" margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="campaign_name"
                                    type="category"
                                    tick={{ fontSize: 12, fill: '#888' }}
                                    width={100}
                                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #333', backgroundColor: '#000' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]} barSize={32}>
                                    {topCampaigns.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Lead Volume Chart */}
                <Card className="bg-gradient-to-br from-card/90 to-card/60 border-border/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Lead Quality
                        </CardTitle>
                        <CardDescription>Total Leads vs Qualified Leads</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCampaigns} margin={{ top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="campaign_name"
                                    tick={{ fontSize: 10, fill: '#888' }}
                                    interval={0}
                                    tickFormatter={(val) => val.length > 8 ? val.substring(0, 8) + '..' : val}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #333', backgroundColor: '#000' }}
                                />
                                <Bar dataKey="total_leads" name="Total Leads" fill="#334155" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="qualified_leads" name="Qualified" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="border-border/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Campaign Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead className="text-right">Leads</TableHead>
                                <TableHead className="text-right">Qualified</TableHead>
                                <TableHead className="text-right">Won Deals</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Pipeline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns?.map((campaign) => (
                                <TableRow key={campaign.campaign_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{campaign.campaign_name}</span>
                                            <span className="text-xs text-muted-foreground uppercase">{campaign.source}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{campaign.total_leads}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                            {campaign.qualified_leads}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                            {campaign.won_deals}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-500">
                                        {formatCurrency(campaign.total_revenue)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {formatCurrency(campaign.pipeline_value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
