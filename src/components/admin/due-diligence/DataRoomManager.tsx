import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FolderOpen, 
  FileText, 
  Download, 
  Upload, 
  Lock, 
  Eye,
  Clock,
  Users,
  Search,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DataRoomDocument {
  id: string;
  name: string;
  category: string;
  file_path: string;
  size_bytes: number;
  access_level: string;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

const categories = ['All', 'financials', 'legal', 'technical', 'corporate', 'hr', 'compliance'];
const categoryLabels: Record<string, string> = {
  financials: 'Financials',
  legal: 'Legal',
  technical: 'Technical',
  corporate: 'Corporate',
  hr: 'HR',
  compliance: 'Compliance',
};

export function DataRoomManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [uploadCategory, setUploadCategory] = useState('financials');
  const [uploadAccessLevel, setUploadAccessLevel] = useState('confidential');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['data-room-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_room_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DataRoomDocument[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const filePath = `${user?.id}/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('data-room')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase.from('data_room_documents').insert({
        name: file.name,
        category: uploadCategory,
        file_path: filePath,
        size_bytes: file.size,
        access_level: uploadAccessLevel,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-room-documents'] });
      toast.success('Document uploaded successfully');
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: DataRoomDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('data-room')
        .remove([doc.file_path]);
      
      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('data_room_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-room-documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => toast.error('Delete failed: ' + error.message),
  });

  // Download handler
  const handleDownload = async (doc: DataRoomDocument) => {
    try {
      // Update view count
      await supabase
        .from('data_room_documents')
        .update({ 
          view_count: doc.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      // Get signed URL
      const { data, error } = await supabase.storage
        .from('data-room')
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['data-room-documents'] });
    } catch (error: any) {
      toast.error('Download failed: ' + error.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleGenerateLink = () => {
    const link = `https://app.thequantumclub.com/data-room/inv-${Date.now()}`;
    navigator.clipboard.writeText(link);
    toast.success('Secure data room link copied to clipboard');
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAccessBadge = (level: string) => {
    switch (level) {
      case 'public':
        return <Badge variant="outline" className="text-green-500 border-green-500">Public</Badge>;
      case 'internal':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Internal</Badge>;
      case 'confidential':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Confidential</Badge>;
      case 'restricted':
        return <Badge variant="outline" className="text-red-500 border-red-500">Restricted</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Document
          </Button>
        </div>
      </div>

      {/* Upload Settings */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Upload Category</label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financials">Financials</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Access Level</label>
              <Select value={uploadAccessLevel} onValueChange={setUploadAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
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
                <p className="text-2xl font-bold">{documents.reduce((sum, d) => sum + d.view_count, 0)}</p>
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
                <p className="text-2xl font-bold">{new Set(documents.map(d => d.category)).size}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {formatFileSize(documents.reduce((sum, d) => sum + d.size_bytes, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
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
          <div className="flex gap-2 mt-4 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'All' ? 'All' : categoryLabels[cat] || cat}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDocuments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {documents.length === 0 
                  ? 'No documents uploaded yet. Upload your first document to get started.'
                  : 'No documents match your search criteria.'}
              </p>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{categoryLabels[doc.category] || doc.category}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size_bytes)}</span>
                        <span>•</span>
                        <span>Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">{doc.view_count} views</p>
                      {doc.last_viewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Last: {new Date(doc.last_viewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {getAccessBadge(doc.access_level)}
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
