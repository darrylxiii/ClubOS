import { useState } from 'react';
import { Database, Trash2, Loader2, AlertCircle, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function TestDataManager({ onDataChanged }: { onDataChanged?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [testDataInfo, setTestDataInfo] = useState<any>(null);
  const { toast } = useToast();

  const seedTestData = async () => {
    try {
      setLoading(true);
      setIsSeeding(true);
      toast({
        title: 'Seeding Test Data',
        description: 'Creating realistic test intelligence data...',
      });

      const { data, error } = await supabase.functions.invoke('seed-test-intelligence-data', {
        body: {},
      });

      if (error) throw error;

      setTestDataInfo(data);
      
      const verif = data.verification;
      const proc = data.processing;
      toast({
        title: 'Test Data Created & Processed',
        description: `✅ ${verif.stakeholders_in_db} stakeholders, ${verif.interactions_in_db} interactions • 🤖 ${proc?.insights_extracted || 0} insights extracted`,
      });

      // Refresh dashboard
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Error seeding test data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to seed test data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsSeeding(false);
    }
  };

  const processIntelligence = async () => {
    if (!testDataInfo?.data?.company_id) {
      toast({
        title: 'No test data',
        description: 'Please seed test data first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      toast({
        title: 'Processing Intelligence',
        description: 'Extracting insights and generating reports...',
      });
      
      const { data, error } = await supabase.functions.invoke('orchestrate-intelligence-pipeline', {
        body: { 
          company_id: testDataInfo.data.company_id,
          force_refresh: true 
        }
      });

      if (error) throw error;

      if (data?.success) {
        const results = data.results;
        toast({
          title: 'Intelligence Processed',
          description: `✅ Processed ${results?.steps?.insight_extraction?.processed || 0} interactions in ${Math.round(results?.total_duration_ms / 1000)}s`,
        });
        
        // Refresh dashboard
        if (onDataChanged) onDataChanged();
      }
    } catch (error: any) {
      console.error('Error processing intelligence:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process intelligence',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupTestData = async () => {
    try {
      setLoading(true);
      toast({
        title: 'Cleaning Up',
        description: 'Removing all test data...',
      });

      const { data, error } = await supabase.functions.invoke('cleanup-test-intelligence-data', {
        body: {},
      });

      if (error) throw error;

      setTestDataInfo(null);
      setShowCleanupDialog(false);

      toast({
        title: 'Test Data Removed',
        description: `Deleted ${data.deleted.interactions} interactions and ${data.deleted.stakeholders} stakeholders`,
      });

      // Refresh dashboard
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cleanup test data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Data Management
          </CardTitle>
          <CardDescription>
            Seed realistic test data for development and testing. All test data is marked with <code className="text-xs bg-muted px-1 rounded">is_test_data: true</code> and can be safely removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testDataInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Test Data:</strong>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li>Company: {testDataInfo.data?.company_name}</li>
                  <li>✅ {testDataInfo.verification?.stakeholders_in_db || 0} stakeholders verified in DB</li>
                  <li>✅ {testDataInfo.verification?.interactions_in_db || 0} interactions verified in DB</li>
                  <li>✅ {testDataInfo.data?.participants_linked || 0} participant links created</li>
                </ul>
                {testDataInfo.data?.interaction_ids && testDataInfo.data.interaction_ids.length > 0 && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs">
                    <strong>Interaction IDs for testing:</strong>
                    <div className="mt-1 space-y-1 font-mono">
                      {testDataInfo.data.interaction_ids.map((id: string) => (
                        <div key={id}>{id}</div>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={seedTestData}
              disabled={loading}
              className="flex-1"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Seed Test Data
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowCleanupDialog(true)}
              disabled={loading}
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {loading && !isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Test Data
                </>
              )}
            </Button>
          </div>

          {testDataInfo?.data?.company_id && (
            <Button
              onClick={processIntelligence}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading && !isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Process Intelligence
                </>
              )}
            </Button>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>What seeding does:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Creates 3 realistic stakeholders with titles and emails</li>
              <li>Creates 3 test interactions with business intelligence content</li>
              <li>Links stakeholders to interactions</li>
              <li>All marked with <code className="bg-muted px-1 rounded">is_test_data: true</code></li>
            </ul>
            <p className="mt-2"><strong>Next steps after seeding:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Run intelligence extraction on each interaction</li>
              <li>Calculate stakeholder influence for the company</li>
              <li>Generate full company intelligence report</li>
              <li>View results in the dashboard</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Test Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all test interactions, stakeholders, and related intelligence data 
              (insights, ML features, etc.). Only data marked with <code className="text-xs bg-muted px-1 rounded">is_test_data: true</code> will be removed.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={cleanupTestData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Test Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
