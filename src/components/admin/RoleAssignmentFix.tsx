import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const RoleAssignmentFix = () => {
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [fixed, setFixed] = useState<string[]>([]);

  const checkRoleIntegrity = async () => {
    setChecking(true);
    setIssues([]);
    setFixed([]);

    try {
      // Check for users without any roles
      const { data: usersWithoutRoles, error: err1 } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (err1) throw err1;

      // Check which users don't have roles
      const problemUsers: any[] = [];
      for (const user of usersWithoutRoles || []) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!roles || roles.length === 0) {
          problemUsers.push(user);
        }
      }

      if (problemUsers.length > 0) {
        setIssues(prev => [...prev, `${problemUsers.length} users without any role assigned`]);
        
        // Auto-fix: assign 'user' role to users without roles
        for (const user of problemUsers) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'user'
            });

          if (!insertError) {
            setFixed(prev => [...prev, `Assigned 'user' role to ${user.email}`]);
          }
        }
      }

      // Check for role/preference mismatches
      const { data: prefs, error: err2 } = await supabase
        .from('user_preferences')
        .select('user_id, preferred_role_view');

      if (err2) throw err2;

      for (const pref of prefs || []) {
        if (pref.preferred_role_view) {
          const { data: hasRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', pref.user_id)
            .eq('role', pref.preferred_role_view as any)
            .maybeSingle();

          if (!hasRole) {
            setIssues(prev => [...prev, `User has preferred_role_view '${pref.preferred_role_view}' but doesn't have that role`]);
            
            // Fix: clear invalid preference
            const { error: updateError } = await supabase
              .from('user_preferences')
              .update({ preferred_role_view: null as any })
              .eq('user_id', pref.user_id);
            
            if (!updateError) {
              setFixed(prev => [...prev, `Cleared invalid preferred_role_view for user`]);
            }
          }
        }
      }

      if (issues.length === 0 && fixed.length === 0) {
        toast.success("Role system is healthy", {
          description: "All roles are properly assigned and synced"
        });
      }

    } catch (error) {
      console.error('[RoleAssignmentFix] Error:', error);
      toast.error("Failed to check role integrity");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Role System Health Check
        </CardTitle>
        <CardDescription>
          Diagnose and fix role assignment issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkRoleIntegrity}
          disabled={checking}
          className="w-full"
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Run Health Check"
          )}
        </Button>

        {issues.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Issues Found:</strong>
              <ul className="mt-2 space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm">• {issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {fixed.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Auto-Fixed:</strong>
              <ul className="mt-2 space-y-1">
                {fixed.map((fix, i) => (
                  <li key={i} className="text-sm">• {fix}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
