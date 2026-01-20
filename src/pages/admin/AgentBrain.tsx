
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Database, RefreshCw, Eye } from "lucide-react";
import { SectionLoader, InlineLoader } from "@/components/ui/unified-loader";
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";

interface Company {
    id: string;
    name: string;
    mission: string | null;
}

interface Embedding {
    id: string;
    content: string;
    metadata: any;
    created_at: string | null;
}

interface ThoughtProcess {
    original_query: string;
    optimized_query: string;
    candidate_count: number;
    final_count: number;
    strategy: string;
}

/* Sub-component for Testing Retrieval */
function AgentRetrievalSimulator({ selectedCompany, companyName }: { selectedCompany: string | null, companyName?: string }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [thoughtProcess, setThoughtProcess] = useState<ThoughtProcess | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]);
        setThoughtProcess(null);

        try {
            const { data, error } = await supabase.functions.invoke("retrieve-context", {
                body: { query: query, company_id: selectedCompany }
            });

            if (error) throw error;
            setResults(data?.matches || []);
            setThoughtProcess(data?.thought_process || null);

        } catch (err: any) {
            toast.error(`Search failed: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Card className="h-full border-purple-100 flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Test Agent Recall & Logic</CardTitle>
                <CardDescription>
                    Test the RAG pipeline: Query Expansion → Hybrid Search → Reranking.
                    {companyName && <span className="block text-purple-600 font-medium mt-1">Focusing on: {companyName}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g. What is the company mission?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching || !query}>
                        {isSearching ? <InlineLoader /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>

                <ScrollArea className="flex-1 bg-muted rounded-md border p-4">
                    {thoughtProcess && (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs space-y-2">
                            <div className="font-semibold text-purple-800 flex items-center gap-2">
                                <Brain className="h-3 w-3" /> Agent Thought Process
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted-foreground">Strategy:</span> {thoughtProcess.strategy}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Original:</span> "{thoughtProcess.original_query}"
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Optimized Query:</span>
                                    <span className="font-mono text-purple-700 ml-1">"{thoughtProcess.optimized_query}"</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Candidates:</span> {thoughtProcess.candidate_count} → {thoughtProcess.final_count}
                                </div>
                            </div>
                        </div>
                    )}

                    {results.length === 0 ? (
                        <div className="text-center text-muted-foreground mt-10">
                            {isSearching ? "Thinking..." : "Results will appear here"}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Retrieved Context ({results.length})
                            </div>
                            {results.map((result, idx) => (
                                <div key={idx} className="bg-card p-3 rounded shadow-sm border text-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <Badge variant="secondary" className="text-xs">{result.similarity ? `${Math.round(result.similarity * 100)}% Match` : "Match"}</Badge>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {result.metadata?.type?.replace('_', ' ') || 'General Fact'}
                                        </span>
                                    </div>
                                    <p className="text-slate-800">{result.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export default function AgentBrain() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            fetchEmbeddings(selectedCompany);
        } else {
            setEmbeddings([]);
        }
    }, [selectedCompany]);

    const fetchCompanies = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("companies")
            .select("id, name, mission")
            .limit(50);

        if (error) {
            toast.error(`Error fetching companies: ${error.message}`);
        } else {
            setCompanies(data || []);
        }
        setIsLoading(false);
    };

    const fetchEmbeddings = async (companyId: string) => {
        // Note: We access intelligence_embeddings. Since 'embedding' column is hidden/vector, we just get content
        const { data, error } = await supabase
            .from("intelligence_embeddings")
            .select("id, content, metadata, created_at")
            .eq("entity_id", companyId)
            .eq("entity_type", "company_dna")
            .order("created_at", { ascending: false });

        if (error) {
            toast.error(`Error fetching context: ${error.message}`);
        } else {
            setEmbeddings(data || []);
        }
    };

    const handleIngest = async (companyId: string) => {
        setIsIngesting(true);
        try {
            const { data, error } = await supabase.functions.invoke("ingest-company-dna", {
                body: { company_id: companyId }
            });

            if (error) throw error;

            toast.success(`Ingestion complete - generated ${data?.processed?.length || 0} context chunks.`);

            // Refresh embeddings list
            if (selectedCompany === companyId) {
                fetchEmbeddings(companyId);
            } else {
                setSelectedCompany(companyId);
            }

        } catch (err: any) {
            toast.error(`Ingestion failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsIngesting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Brain className="h-8 w-8 text-purple-500" />
                        Agent Brain
                    </h1>
                    <p className="text-muted-foreground">Manage the "Universal Context" for the Quantum Recruiter.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Company List */}
                <Card className="col-span-1 border-purple-100 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Database className="h-5 w-5" /> Companies
                        </CardTitle>
                        <CardDescription>Select a company to manage context.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {isLoading ? (
                            <SectionLoader text="Loading Companies..." className="min-h-[100px]" />
                        ) : (
                            <div className="space-y-2">
                                {companies.map((c) => (
                                    <div
                                        key={c.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedCompany === c.id ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => setSelectedCompany(c.id)}
                                    >
                                        <div className="font-semibold text-sm">{c.name}</div>
                                        <div className="text-xs text-muted-foreground truncate">{c.mission || "No mission defined"}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>


                {/* Memory Interface */}
                <div className="col-span-2 flex flex-col h-full">
                    <Tabs defaultValue="view" className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <TabsList>
                                <TabsTrigger value="view"><Eye className="h-4 w-4 mr-2" /> View Memory</TabsTrigger>
                                <TabsTrigger value="test"><MessageSquare className="h-4 w-4 mr-2" /> Test Recall</TabsTrigger>
                            </TabsList>

                            {selectedCompany && (
                                <Button
                                    onClick={() => handleIngest(selectedCompany)}
                                    disabled={isIngesting}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    size="sm"
                                >
                                    {isIngesting ? (
                                        <InlineLoader text="Ingesting DNA..." />
                                    ) : (
                                        <><RefreshCw className="mr-2 h-4 w-4" /> Re-Ingest Context</>
                                    )}
                                </Button>
                            )}
                        </div>

                        <TabsContent value="view" className="flex-1 overflow-auto mt-0">
                            <Card className="h-full border-purple-100 flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Database className="h-5 w-5" /> Stored Facts
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedCompany
                                            ? `Knowledge base for ${companies.find(c => c.id === selectedCompany)?.name}`
                                            : "Select a company to view memory"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto">
                                    {!selectedCompany ? (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <p>Select a company to view generated embeddings.</p>
                                        </div>
                                    ) : embeddings.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4">
                                            <Brain className="h-12 w-12 text-gray-200" />
                                            <p>No knowledge context found for this company.</p>
                                            <Button variant="outline" onClick={() => handleIngest(selectedCompany)}>Initialize Memory</Button>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Type</TableHead>
                                                    <TableHead>Content Chunk</TableHead>
                                                    <TableHead className="w-[150px]">Created</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {embeddings.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                {item.metadata?.type || "unknown"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-[400px]">
                                                            <p className="text-sm line-clamp-2" title={item.content}>{item.content}</p>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="test" className="flex-1 mt-0">
                            <AgentRetrievalSimulator selectedCompany={selectedCompany} companyName={companies.find(c => c.id === selectedCompany)?.name} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
