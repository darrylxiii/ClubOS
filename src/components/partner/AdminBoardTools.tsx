import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Database,
  Globe,
  FileDown,
  RefreshCw,
  Sparkles,
  Settings,
  Activity,
  Zap,
  Building2,
  BarChart3,
  Lock,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

interface AdminBoardToolsProps {
  companyId: string | null;
  onRefresh: () => void;
}

export const AdminBoardTools = ({ companyId, onRefresh }: AdminBoardToolsProps) => {
  const handleGlobalAnalytics = () => {
    toast.info("Global Analytics", {
      description: "Cross-company insights and platform-wide metrics",
      duration: 3000,
    });
  };

  const handleTalentPoolAccess = () => {
    toast.success("Talent Pool Access Granted", {
      description: "Full access to 12,847 candidate profiles",
    });
  };

  const handleCompanyManagement = () => {
    toast.info("Company Management", {
      description: "Manage all partner companies and their access levels",
    });
  };

  const handleBulkOperations = () => {
    toast.info("Bulk Operations", {
      description: "Perform bulk actions across multiple jobs and candidates",
    });
  };

  const handlePlatformSettings = () => {
    toast.info("Platform Settings", {
      description: "Configure global platform rules, AI models, and workflows",
    });
  };

  const handleAIModelConfig = () => {
    toast.info("AI Configuration", {
      description: "Adjust matching algorithms, scoring weights, and ML models",
    });
  };

  const handleSystemHealth = () => {
    toast.success("System Health: Optimal", {
      description: "All services running normally. 99.97% uptime",
    });
  };

  const handleDataExport = () => {
    toast.info("Global Data Export", {
      description: "Exporting anonymized platform analytics...",
    });
  };

  const handleAccessControl = () => {
    toast.info("Access Control", {
      description: "Manage roles, permissions, and security policies",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-6 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/20 via-purple-500/20 to-blue-500/20 backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-accent to-purple-500">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <Badge variant="outline" className="border-accent text-accent font-bold mb-1">
            QUANTUM CLUB ADMIN
          </Badge>
          <p className="text-xs text-muted-foreground">
            Platform-wide management & analytics
          </p>
        </div>
      </div>
      
      <div className="flex-1" />
      
      <Button
        onClick={handleGlobalAnalytics}
        className="gap-2 bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90"
      >
        <BarChart3 className="w-4 h-4" />
        Global Analytics
      </Button>

      <Button
        onClick={handleTalentPoolAccess}
        variant="outline"
        className="gap-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
      >
        <Database className="w-4 h-4" />
        Talent Pool
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 border-accent/50">
            <Zap className="w-4 h-4" />
            Admin Tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Platform Administration
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleCompanyManagement} className="gap-2">
            <Building2 className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Company Management</p>
              <p className="text-xs text-muted-foreground">View & manage all partners</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleBulkOperations} className="gap-2">
            <Globe className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Bulk Operations</p>
              <p className="text-xs text-muted-foreground">Cross-job actions at scale</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleAIModelConfig} className="gap-2">
            <Brain className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">AI Model Config</p>
              <p className="text-xs text-muted-foreground">Tune matching algorithms</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSystemHealth} className="gap-2">
            <Activity className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">System Health</p>
              <p className="text-xs text-muted-foreground">Platform status & uptime</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleAccessControl} className="gap-2">
            <Lock className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Access Control</p>
              <p className="text-xs text-muted-foreground">Roles & permissions</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePlatformSettings} className="gap-2">
            <Settings className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Platform Settings</p>
              <p className="text-xs text-muted-foreground">Global configurations</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleDataExport} className="gap-2">
            <FileDown className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Export Global Data</p>
              <p className="text-xs text-muted-foreground">Platform-wide analytics</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onRefresh} className="gap-2 text-accent">
            <RefreshCw className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Refresh All Metrics</p>
              <p className="text-xs text-muted-foreground">Recalculate everything</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
