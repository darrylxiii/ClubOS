import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Share2, User } from 'lucide-react';

interface Node {
    id: string;
    label: string;
    image?: string;
    type: 'me' | 'contact' | 'company';
    strength: number; // 0-100
    x: number;
    y: number;
}

interface Edge { // Connection
    source: string;
    target: string;
    strength: number;
}

// Mock data generator for the graph
const generateMockData = (centerId: string) => {
    const nodes: Node[] = [
        { id: 'me', label: 'You', type: 'me', strength: 100, x: 400, y: 300 }
    ];

    const edges: Edge[] = [];

    const contacts = [
        { name: 'Alice Chen', role: 'CTO', company: 'TechCorp' },
        { name: 'Bob Smith', role: 'VP Sales', company: 'SalesForce' },
        { name: 'Carol Wu', role: 'Angel Investor', company: 'Acme VC' },
        { name: 'David Kim', role: 'Recruiter', company: 'TalentInc' },
        { name: 'Eve Torres', role: 'Founder', company: 'StartUp' },
    ];

    contacts.forEach((c, i) => {
        const angle = (i / contacts.length) * Math.PI * 2;
        const radius = 150 + Math.random() * 50;
        const id = `c-${i}`;

        nodes.push({
            id,
            label: c.name,
            type: 'contact',
            strength: Math.floor(Math.random() * 60) + 40,
            x: 400 + Math.cos(angle) * radius,
            y: 300 + Math.sin(angle) * radius
        });

        edges.push({
            source: 'me',
            target: id,
            strength: Math.random()
        });
    });

    return { nodes, edges };
};

export function NetworkGraph() {
    const [data, setData] = useState<{ nodes: Node[], edges: Edge[] }>({ nodes: [], edges: [] });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    useEffect(() => {
        setData(generateMockData('me'));
    }, []);

    return (
        <Card className="w-full h-[600px] overflow-hidden bg-slate-950/40 border-slate-800 backdrop-blur-sm relative">
            <CardHeader className="absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-background/80 to-transparent">
                <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-primary animate-pulse" />
                    Network Intelligence
                </CardTitle>
            </CardHeader>

            <div className="w-full h-full relative">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {data.edges.map((edge, i) => {
                        const source = data.nodes.find(n => n.id === edge.source);
                        const target = data.nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;

                        return (
                            <motion.line
                                key={i}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: edge.strength * 0.8 }}
                                transition={{ duration: 1.5, delay: i * 0.1 }}
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke={hoveredNode === edge.target || hoveredNode === edge.source ? "#3b82f6" : "#4ade80"}
                                strokeWidth={edge.strength * 4}
                                strokeDasharray="4 4"
                                className="transition-colors duration-300"
                            />
                        );
                    })}
                </svg>

                {data.nodes.map((node) => (
                    <motion.div
                        key={node.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ left: node.x, top: node.y }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        drag
                        dragConstraints={{ left: 0, right: 800, top: 0, bottom: 600 }}
                    >
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div className="relative group">
                                        <div className={`absolute inset-0 bg-primary/20 rounded-full blur-xl transition-opacity duration-300 ${hoveredNode === node.id ? 'opacity-100' : 'opacity-0'}`} />
                                        <Avatar className={`h-12 w-12 border-2 ${node.type === 'me' ? 'border-primary' : 'border-border'} group-hover:border-primary transition-colors`}>
                                            <AvatarImage src={node.image} />
                                            <AvatarFallback className="bg-background">
                                                <User className="h-6 w-6 text-muted-foreground" />
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Orbiting particles for strong connections */}
                                        {node.strength > 80 && (
                                            <div className="absolute inset-[-4px] rounded-full border border-primary/30 border-t-transparent animate-spin-slow" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-slate-900 border-slate-700">
                                    <div className="text-center">
                                        <p className="font-bold text-white">{node.label}</p>
                                        <Badge variant="outline" className="mt-1 text-xs border-primary/50 text-primary">
                                            Strength: {node.strength}%
                                        </Badge>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </motion.div>
                ))}
            </div>
        </Card>
    );
}
