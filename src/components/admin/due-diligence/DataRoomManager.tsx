import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  FileText, 
  Download, 
  Upload, 
  Lock, 
  Eye,
  Clock,
  Users,
  Plus,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface DataRoomDocument {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  size: string;
  accessLevel: 'public' | 'nda' | 'restricted';
  views: number;
  lastViewed?: string;
}

const mockDocuments: DataRoomDocument[] = [
  {
    id: '1',
    name: 'Financial Statements FY2025',
    category: 'Financials',
    uploadedAt: '2026-01-02',
    size: '2.4 MB',
    accessLevel: 'nda',
    views: 12,
    lastViewed: '2026-01-04',
  },
  {
    id: '2',
    name: 'Cap Table - Current',
    category: 'Legal',
    uploadedAt: '2026-01-01',
    size: '156 KB',
    accessLevel: 'restricted',
    views: 8,
  },
  {
    id: '3',
    name: 'Product Roadmap 2026',
    category: 'Product',
    uploadedAt: '2025-12-28',
    size: '1.8 MB',
    accessLevel: 'nda',
    views: 15,
    lastViewed: '2026-01-03',
  },
  {
    id: '4',
    name: 'SOC 2 Type II Report',
    category: 'Compliance',
    uploadedAt: '2025-12-15',
    size: '4.2 MB',
    accessLevel: 'public',
    views: 24,
  },
  {
    id: '5',
    name: 'Team Org Chart',
    category: 'Team',
    uploadedAt: '2025-12-20',
    size: '340 KB',
    accessLevel: 'public',
    views: 18,
  },
  {
    id: '6',
    name: 'Customer Contracts (Redacted)',
    category: 'Commercial',
    uploadedAt: '2025-12-22',
    size: '8.1 MB',
    accessLevel: 'restricted',
    views: 5,
  },
];

const categories = ['All', 'Financials', 'Legal', 'Product', 'Compliance', 'Team', 'Commercial'];

export function DataRoomManager() {
  const [documents] = useState<DataRoomDocument[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getAccessBadge = (level: DataRoomDocument['accessLevel']) => {
    switch (level) {
      case 'public':
        return <Badge variant="outline" className="text-green-500 border-green-500">Public</Badge>;
      case 'nda':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">NDA Required</Badge>;
      case 'restricted':
        return <Badge variant="outline" className="text-red-500 border-red-500">Restricted</Badge>;
    }
  };

  const handleUpload = () => {
    toast.info('Document upload functionality - connect to Supabase Storage');
  };

  const handleDownload = (doc: DataRoomDocument) => {
    toast.success(`Downloading ${doc.name}...`);
  };

  const handleGenerateLink = () => {
    const link = `https://app.thequantumclub.com/data-room/inv-${Date.now()}`;
    navigator.clipboard.writeText(link);
    toast.success('Secure data room link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investor Data Room</h2>
          <p className="text-muted-foreground">
            Secure document repository for due diligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateLink}>
            <Lock className="h-4 w-4 mr-2" />
            Generate Access Link
          </Button>
          <Button onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{documents.reduce((sum, d) => sum + d.views, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Active Investors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">2h 34m</p>
                <p className="text-sm text-muted-foreground">Avg. Review Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documents
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>Uploaded {doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">{doc.views} views</p>
                    {doc.lastViewed && (
                      <p className="text-xs text-muted-foreground">
                        Last: {doc.lastViewed}
                      </p>
                    )}
                  </div>
                  {getAccessBadge(doc.accessLevel)}
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
