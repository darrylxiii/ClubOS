import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TrackRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackRequestDialog({ open, onOpenChange }: TrackRequestDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!email) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("partner_requests")
      .select("*")
      .eq("contact_email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setLoading(false);

    if (error || !data) {
      toast({
        title: "Request not found",
        description: "No request found with this email address.",
        variant: "destructive",
      });
      return;
    }

    setRequest(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "reviewing":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "reviewing":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Track Your Partnership Request</DialogTitle>
          <DialogDescription>
            Enter your email to view your request status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {request && (
            <Card className="p-6 glass-effect space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{request.company_name}</h3>
                  <p className="text-sm text-muted-foreground">{request.contact_name}</p>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  <span className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Partnership Type</p>
                  <p className="font-medium capitalize">
                    {request.partnership_type?.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium capitalize">{request.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="font-medium capitalize">
                    {request.timeline?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {request.admin_notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Notes from Our Team</p>
                  <p className="text-sm">{request.admin_notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {request.status === "pending" &&
                    "Your request is being reviewed. We'll contact you within 48 hours."}
                  {request.status === "reviewing" &&
                    "Our team is currently reviewing your partnership request in detail."}
                  {request.status === "approved" &&
                    "Congratulations! Your partnership request has been approved. Check your email for next steps."}
                  {request.status === "rejected" &&
                    "Thank you for your interest. Unfortunately, we cannot proceed with this partnership at this time."}
                </p>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
