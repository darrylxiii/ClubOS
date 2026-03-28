import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { CompanyLogoStatic } from "@/components/ui/company-logo";
import { useSidebar } from "@/components/AnimatedSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function CompanySwitcher() {
  const { t } = useTranslation('common');
  const { companyId, companies, switchCompany } = useRole();
  const { open } = useSidebar();

  // Only render when user has multiple companies
  if (companies.length < 2) return null;

  const activeCompany = companies.find((c) => c.company_id === companyId);

  const handleSwitch = async (newCompanyId: string) => {
    if (newCompanyId === companyId) return;
    try {
      await switchCompany(newCompanyId);
      const target = companies.find((c) => c.company_id === newCompanyId);
      toast.success(`Switched to ${target?.company_name || 'company'}`);
    } catch {
      toast.error(t("failed_to_switch_company", "Failed to switch company"));
    }
  };

  return (
    <div className="px-3 pb-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40",
              open ? "gap-2.5 px-3 justify-start" : "justify-center px-0",
              "min-h-[40px] h-[40px] transition-all duration-300"
            )}
          >
            <CompanyLogoStatic
              name={activeCompany?.company_name}
              logoUrl={activeCompany?.company_logo_url}
              size="xs"
              className="flex-shrink-0"
            />
            {open && (
              <>
                <span className="flex-1 text-left text-sm font-medium truncate min-w-0">
                  {activeCompany?.company_name || 'Select company'}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="right"
          className="w-64 bg-card border-border z-modal"
          sideOffset={8}
        >
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("switch_organization", "Switch organization")}</p>
          </div>
          {companies.map((company) => {
            const isActive = company.company_id === companyId;
            return (
              <DropdownMenuItem
                key={company.company_id}
                onClick={() => handleSwitch(company.company_id)}
                className={cn(
                  "cursor-pointer flex items-center gap-2.5 py-2",
                  isActive && "bg-primary/5"
                )}
              >
                <CompanyLogoStatic
                  name={company.company_name}
                  logoUrl={company.company_logo_url}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {company.company_name || 'Unnamed'}
                  </p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                    {company.role}
                  </Badge>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
