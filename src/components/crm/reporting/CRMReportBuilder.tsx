import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download, PieChart as PieIcon, BarChart as BarIcon, LineChart as LineIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useCRMReportData, ReportDataSource, ReportGroupBy, ReportMetric } from './useCRMReportData';
import { UnifiedLoader } from '@/components/ui/unified-loader';

type ChartType = 'bar' | 'pie' | 'line';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function CRMReportBuilder() {
    const [dataSource, setDataSource] = useState<ReportDataSource>('deals');
    const [groupBy, setGroupBy] = useState<ReportGroupBy>('stage');
    const [metric, setMetric] = useState<ReportMetric>('sum_value');
    const [chartType, setChartType] = useState<ChartType>('bar');

    const { data, loading } = useCRMReportData(dataSource, groupBy, metric);

    const renderChart = () => {
        if (loading) return <UnifiedLoader variant="section" />;

        if (data.length === 0) {
            return (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No data available for this configuration
                </div>
            );
        }

        if (chartType === 'bar') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#8884d8">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        if (chartType === 'pie') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        if (chartType === 'line') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <CardTitle className="text-xl font-bold">Custom Report Builder</CardTitle>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => setChartType('bar')} className={chartType === 'bar' ? 'bg-accent' : ''}>
                        <BarIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setChartType('pie')} className={chartType === 'pie' ? 'bg-accent' : ''}>
                        <PieIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setChartType('line')} className={chartType === 'line' ? 'bg-accent' : ''}>
                        <LineIcon className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select value={dataSource} onValueChange={(v) => setDataSource(v as ReportDataSource)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deals">Deals & Revenue</SelectItem>
                                <SelectItem value="prospects">Prospects</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Group By</Label>
                        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ReportGroupBy)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="stage">Stage</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="source">Source</SelectItem>
                                <SelectItem value="campaign">Campaign</SelectItem>
                                <SelectItem value="month">Creation Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Metric</Label>
                        <Select value={metric} onValueChange={(v) => setMetric(v as ReportMetric)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="count">Count (Volume)</SelectItem>
                                {dataSource === 'deals' && <SelectItem value="sum_value">Total Value (Currency)</SelectItem>}
                                <SelectItem value="avg_score">Average Score</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="min-h-[350px] w-full bg-slate-950/20 rounded-lg p-4 border border-border/50">
                    {renderChart()}
                </div>
            </CardContent>
        </Card>
    );
}
