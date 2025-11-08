import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Eye, Loader2, AlertCircle } from "lucide-react";
import { mergeService, MergeSuggestion } from "@/services/mergeService";
import { toast } from "sonner";
import { MergePreviewDialog } from "./MergePreviewDialog";

export function MergeSuggestionsTable() {
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [minConfidence, setMinConfidence] = useState(70);
  const [matchType, setMatchType] = useState<string>("all");
  const [previewCandidate, setPreviewCandidate] = useState<string | null>(null);
  const [previewUser, setPreviewUser] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [minConfidence, matchType]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const filters: any = {
        minConfidence: minConfidence / 100,
        limit: 50
      };
      
      if (matchType !== "all") {
        filters.matchType = matchType;
      }

      const data = await mergeService.getSuggestions(filters);
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load merge suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidateId: string, userId: string) => {
    try {
      const result = await mergeService.executeMerge(candidateId, userId, 'auto');
      
      if (result.success) {
        toast.success('Merge approved and executed successfully');
        loadSuggestions();
      } else {
        throw new Error(result.error || 'Merge failed');
      }
    } catch (error: any) {
      console.error('Error approving merge:', error);
      toast.error(error.message || 'Failed to approve merge');
    }
  };

  const handleReject = async (candidateId: string, userId: string) => {
    try {
      await mergeService.rejectMerge(candidateId, userId, 'Manually rejected by admin');
      toast.success('Merge suggestion rejected');
      loadSuggestions();
    } catch (error) {
      console.error('Error rejecting merge:', error);
      toast.error('Failed to reject merge');
    }
  };

  const handlePreview = (candidateId: string, userId: string) => {
    setPreviewCandidate(candidateId);
    setPreviewUser(userId);
    setShowPreview(true);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-green-600";
    if (score >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 0.9) return "default";
    if (score >= 0.7) return "secondary";
    return "destructive";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Auto-Detected Merge Suggestions</CardTitle>
          <CardDescription>
            Review and approve automatically detected potential profile matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Confidence: {minConfidence}%</Label>
              <Slider
                value={[minConfidence]}
                onValueChange={([value]) => setMinConfidence(value)}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Match Type</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email_match">Email Match</SelectItem>
                  <SelectItem value="partial_link">Partial Link</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No merge suggestions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting the filters to see more results
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>User Account</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {suggestions.map((suggestion) => (
                    <TableRow key={`${suggestion.candidate_id}-${suggestion.profile_id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{suggestion.candidate_name}</p>
                          <p className="text-sm text-muted-foreground">{suggestion.candidate_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{suggestion.profile_name}</p>
                          <p className="text-sm text-muted-foreground">{suggestion.profile_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {suggestion.match_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getConfidenceBadgeVariant(suggestion.confidence_score || 0)}>
                          {Math.round((suggestion.confidence_score || 0) * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePreview(suggestion.candidate_id, suggestion.profile_id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(suggestion.candidate_id, suggestion.profile_id)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(suggestion.candidate_id, suggestion.profile_id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showPreview && previewCandidate && previewUser && (
        <MergePreviewDialog
          candidateId={previewCandidate}
          userId={previewUser}
          open={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewCandidate(null);
            setPreviewUser(null);
          }}
          onSuccess={() => {
            setShowPreview(false);
            setPreviewCandidate(null);
            setPreviewUser(null);
            loadSuggestions();
          }}
        />
      )}
    </>
  );
}
