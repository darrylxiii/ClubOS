import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { getMyConsents, revokeConsent, type ConsentReceipt } from "@/services/consentService";
import { toast } from "sonner";
import { format } from "date-fns";

export function ConsentReceiptsViewer() {
  const { t } = useTranslation('common');
  const [consents, setConsents] = useState<ConsentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const data = await getMyConsents();
      setConsents(data);
    } catch (e) {
      console.error("Failed to load consent receipts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeConsent(id);
      setConsents((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, granted: false, revoked_at: new Date().toISOString() }
            : c
        )
      );
      toast.success(t("consent_revoked", "Consent revoked."));
    } catch {
      toast.error(t("could_not_revoke_consent", "Could not revoke consent."));
    }
  };

  const activeCount = consents.filter((c) => c.granted).length;
  const displayConsents = expanded ? consents : consents.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck className="h-5 w-5" />
          Consent Receipts
        </CardTitle>
        <CardDescription>
          A log of what you've shared, when, and with whom.{" "}
          {activeCount > 0 && (
            <span className="text-foreground font-medium">
              {activeCount} active
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Loading…
          </p>
        ) : consents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No consent records yet.
          </p>
        ) : (
          <>
            <ScrollArea className={expanded ? "max-h-80" : undefined}>
              <div className="space-y-2">
                {displayConsents.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/40 bg-muted/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium capitalize truncate">
                          {c.consent_type.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={c.granted ? "default" : "secondary"}
                          className="text-[10px] h-5"
                        >
                          {c.granted ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.scope}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(c.granted_at), "d MMM yyyy, HH:mm")}
                        {c.revoked_at && (
                          <span>
                            {" · Revoked "}
                            {format(new Date(c.revoked_at), "d MMM yyyy")}
                          </span>
                        )}
                      </p>
                    </div>
                    {c.granted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRevoke(c.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {consents.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" /> Show all{" "}
                    {consents.length} receipts
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
