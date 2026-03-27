import { useState } from "react";
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
  TrendingUp,
  Users,
  FileDown,
  RefreshCw,
  Sparkles,
  Settings,
  Activity,
  Award,
  Zap,
  Building2,
  BarChart3,
  Lock,
  Unlock,
  UserCog,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface AdminBoardToolsProps {
  companyId: string | null;
  onRefresh: () => void;
}

export const AdminBoardTools = ({ companyId, onRefresh }: AdminBoardToolsProps) => {
  const { t } = useTranslation('partner');
  const handleGlobalAnalytics = () => {
    toast.info(t('adminBoardTools.toast.globalAnalytics'), { description: t('adminBoardTools.toast.globalAnalyticsDesc'),
      duration: 3000,
    });
  };

  const handleTalentPoolAccess = () => {
    toast.success(t('adminBoardTools.toast.talentPoolAccessGranted'), { description: t('adminBoardTools.toast.talentPoolAccessGrantedDesc'),
    });
  };

  const handleCompanyManagement = () => {
    toast.info(t('adminBoardTools.toast.companyManagement'), { description: t('adminBoardTools.toast.companyManagementDesc'),
    });
  };

  const handleBulkOperations = () => {
    toast.info(t('adminBoardTools.toast.bulkOperations'), { description: t('adminBoardTools.toast.bulkOperationsDesc'),
    });
  };

  const handlePlatformSettings = () => {
    toast.info(t('adminBoardTools.toast.platformSettings'), { description: t('adminBoardTools.toast.platformSettingsDesc'),
    });
  };

  const handleAIModelConfig = () => {
    toast.info(t('adminBoardTools.toast.aiConfiguration'), { description: t('adminBoardTools.toast.aiConfigurationDesc'),
    });
  };

  const handleSystemHealth = () => {
    toast.success(t('adminBoardTools.toast.systemHealthOptimal'), { description: t('adminBoardTools.toast.systemHealthOptimalDesc'),
    });
  };

  const handleDataExport = () => {
    toast.info(t('adminBoardTools.toast.globalDataExport'), { description: t('adminBoardTools.toast.globalDataExportDesc'),
    });
  };

  const handleAccessControl = () => {
    toast.info(t('adminBoardTools.toast.accessControl'), { description: t('adminBoardTools.toast.accessControlDesc'),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-6 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/20 via-purple-500/20 to-blue-500/20 backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-accent to-purple-500">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <Badge variant="outline" className="border-accent text-accent font-bold mb-1">{t('adminBoardTools.badge.quantumClubAdmin')}</Badge>
          <p className="text-xs text-muted-foreground">{t('adminBoardTools.platformwideManagementAnalytics')}</p>
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
              <p className="font-medium">{t('adminBoardTools.companyManagement')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.viewManageAllPartners')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleBulkOperations} className="gap-2">
            <Globe className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.bulkOperations')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.crossjobActionsAtScale')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleAIModelConfig} className="gap-2">
            <Brain className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.aiModelConfig')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.tuneMatchingAlgorithms')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSystemHealth} className="gap-2">
            <Activity className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.systemHealth')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.platformStatusUptime')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleAccessControl} className="gap-2">
            <Lock className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.accessControl')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.rolesPermissions')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePlatformSettings} className="gap-2">
            <Settings className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.platformSettings')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.globalConfigurations')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleDataExport} className="gap-2">
            <FileDown className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.exportGlobalData')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.platformwideAnalytics')}</p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onRefresh} className="gap-2 text-accent">
            <RefreshCw className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">{t('adminBoardTools.refreshAllMetrics')}</p>
              <p className="text-xs text-muted-foreground">{t('adminBoardTools.recalculateEverything')}</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
