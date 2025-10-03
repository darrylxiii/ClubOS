import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Video, Calendar, Clock, Building2, Search, Play, Download, FileText, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { UploadMeetingRecording } from "@/components/UploadMeetingRecording";

interface MeetingRecording {
  id: string;
  title: string;
  description: string | null;
  company_name: string | null;
  position: string | null;
  meeting_date: string;
  duration_minutes: number | null;
  recording_url: string | null;
  thumbnail_url: string | null;
  meeting_type: string | null;
  participants: any;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

const MeetingHistory = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<MeetingRecording[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecording | null>(null);

  const meetingTypes = ['screening', 'technical', 'behavioral', 'final', 'other'];

  useEffect(() => {
    loadRecordings();
  }, [user]);

  useEffect(() => {
    filterRecordings();
  }, [searchQuery, selectedType, recordings]);

  const loadRecordings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meeting_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast.error('Failed to load meeting recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecordings = () => {
    let filtered = [...recordings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(query) ||
        rec.company_name?.toLowerCase().includes(query) ||
        rec.position?.toLowerCase().includes(query) ||
        rec.description?.toLowerCase().includes(query)
      );
    }

    if (selectedType) {
      filtered = filtered.filter(rec => rec.meeting_type === selectedType);
    }

    setFilteredRecordings(filtered);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMeetingTypeColor = (type: string | null) => {
    switch (type) {
      case 'screening': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'technical': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'behavioral': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'final': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTotalInterviewTime = () => {
    return recordings.reduce((total, rec) => total + (rec.duration_minutes || 0), 0);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Interview Recordings</h1>
            <p className="text-muted-foreground">
              Review all your interview sessions and track your progress
            </p>
          </div>
          <UploadMeetingRecording onUploadComplete={loadRecordings} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Video className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{recordings.length}</p>
                  <p className="text-xs text-muted-foreground">Total Recordings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{formatDuration(getTotalInterviewTime())}</p>
                  <p className="text-xs text-muted-foreground">Total Interview Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(recordings.map(r => r.company_name).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Companies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {recordings.length > 0 
                      ? format(new Date(recordings[0].meeting_date), 'MMM d')
                      : 'N/A'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Latest Interview</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, position, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(null)}
                >
                  All
                </Button>
                {meetingTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recordings List */}
        {isLoading ? (
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading recordings...</p>
            </CardContent>
          </Card>
        ) : filteredRecordings.length === 0 ? (
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Recordings Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedType
                  ? "Try adjusting your filters"
                  : "Your interview recordings will appear here once they're uploaded"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRecordings.map((recording) => (
              <Card
                key={recording.id}
                className="border-0 shadow-glow bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRecording(recording)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      {recording.thumbnail_url ? (
                        <img 
                          src={recording.thumbnail_url} 
                          alt={recording.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{recording.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                            {recording.company_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {recording.company_name}
                              </span>
                            )}
                            {recording.position && (
                              <span>• {recording.position}</span>
                            )}
                          </div>
                        </div>
                        
                        {recording.meeting_type && (
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${getMeetingTypeColor(recording.meeting_type)}`}
                          >
                            {recording.meeting_type}
                          </Badge>
                        )}
                      </div>

                      {recording.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {recording.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(recording.meeting_date), 'MMM d, yyyy')}
                        </span>
                        {recording.duration_minutes && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {formatDuration(recording.duration_minutes)}
                          </span>
                        )}
                        {recording.tags && recording.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            {recording.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {recording.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{recording.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {recording.recording_url ? (
                        <>
                          <Button size="sm" className="gap-2">
                            <Play className="w-4 h-4" />
                            Play
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Processing
                        </Badge>
                      )}
                    </div>
                  </div>

                  {recording.notes && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {recording.notes}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MeetingHistory;
