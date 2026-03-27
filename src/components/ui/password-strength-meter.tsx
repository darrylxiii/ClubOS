import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X, AlertCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { t } = useTranslation("common");

  const requirements: Requirement[] = useMemo(() => [
    { label: t("password.atLeast8Chars", "At least 8 characters"), met: password.length >= 8 },
    { label: t("password.uppercaseLetter", "Uppercase letter"), met: /[A-Z]/.test(password) },
    { label: t("password.lowercaseLetter", "Lowercase letter"), met: /[a-z]/.test(password) },
    { label: t("password.number", "Number"), met: /[0-9]/.test(password) },
    { label: t("password.specialChar", "Special character"), met: /[^A-Za-z0-9]/.test(password) },
  ], [password, t]);

  const strength = useMemo(() => {
    const metCount = requirements.filter((r) => r.met).length;
    if (password.length === 0) return { level: 0, label: "", color: "" };
    if (metCount <= 2) return { level: 1, label: t("password.weak", "Weak"), color: "bg-destructive" };
    if (metCount <= 3) return { level: 2, label: t("password.fair", "Fair"), color: "bg-warning" };
    if (metCount <= 4) return { level: 3, label: t("password.good", "Good"), color: "bg-blue-500" };
    return { level: 4, label: t("password.strong", "Strong"), color: "bg-success" };
  }, [requirements, password, t]);

  if (password.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i <= strength.level ? strength.color : "bg-muted/30"
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{t("password.strength", "Password strength")}</span>
          <span className={cn(
            "text-[11px] font-medium",
            strength.level <= 1 ? "text-destructive" :
            strength.level <= 2 ? "text-warning" :
            strength.level <= 3 ? "text-blue-500" : "text-success"
          )}>
            {strength.label}
          </span>
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {req.met ? (
              <Check className="h-3 w-3 text-success shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={cn(
              "text-[11px] transition-colors",
              req.met ? "text-muted-foreground" : "text-muted-foreground/50"
            )}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
