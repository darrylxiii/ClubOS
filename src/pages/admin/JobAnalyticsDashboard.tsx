import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

const JobAnalyticsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <Construction className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle>Job Analytics Dashboard</CardTitle>
          <CardDescription>
            This module requires additional database configuration.
            Please contact your administrator to set up recruitment tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => navigate('/admin/job-analytics')}>Return to Jobs</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobAnalyticsDashboard;
