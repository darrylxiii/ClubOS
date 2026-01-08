import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Building2, Users, Briefcase, FileText, UserPlus, 
  ChevronDown, Search, X, Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectedEntity {
  type: 'candidate' | 'company' | 'user' | 'prospect' | 'job' | 'application';
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
}

interface EntityContextPickerProps {
  value?: SelectedEntity | null;
  onChange: (entity: SelectedEntity | null) => void;
  allowedTypes?: SelectedEntity['type'][];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const entityConfig = {
  candidate: {
    icon: User,
    label: 'Candidate',
    color: 'bg-blue-500/10 text-blue-600',
  },
  company: {
    icon: Building2,
    label: 'Company',
    color: 'bg-purple-500/10 text-purple-600',
  },
  user: {
    icon: Users,
    label: 'Team Member',
    color: 'bg-green-500/10 text-green-600',
  },
  prospect: {
    icon: UserPlus,
    label: 'Prospect',
    color: 'bg-orange-500/10 text-orange-600',
  },
  job: {
    icon: Briefcase,
    label: 'Job',
    color: 'bg-pink-500/10 text-pink-600',
  },
  application: {
    icon: FileText,
    label: 'Application',
    color: 'bg-cyan-500/10 text-cyan-600',
  },
};

export function EntityContextPicker({
  value,
  onChange,
  allowedTypes = ['candidate', 'company', 'user', 'prospect', 'job', 'application'],
  label,
  placeholder = 'Select entity...',
  disabled = false,
  className,
}: EntityContextPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<SelectedEntity['type']>(allowedTypes[0]);

  // Search candidates
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['entity-picker-candidates', search],
    queryFn: async () => {
      if (!allowedTypes.includes('candidate')) return [];
      const query = supabase
        .from('candidate_profiles')
        .select('id, full_name, email, current_title, avatar_url')
        .limit(20);
      
      if (search) {
        query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,current_title.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('candidate'),
  });

  // Search companies
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['entity-picker-companies', search],
    queryFn: async () => {
      if (!allowedTypes.includes('company')) return [];
      const query = supabase
        .from('companies')
        .select('id, name, industry, logo_url')
        .limit(20);
      
      if (search) {
        query.or(`name.ilike.%${search}%,industry.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('company'),
  });

  // Search team members (users with strategist/admin roles)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['entity-picker-users', search],
    queryFn: async () => {
      if (!allowedTypes.includes('user')) return [];
      const query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, current_title')
        .limit(20);
      
      if (search) {
        query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('user'),
  });

  // Search prospects
  const { data: prospects, isLoading: prospectsLoading } = useQuery({
    queryKey: ['entity-picker-prospects', search],
    queryFn: async () => {
      if (!allowedTypes.includes('prospect')) return [];
      const query = supabase
        .from('crm_prospects')
        .select('id, name, email, status, company_name')
        .limit(20);
      
      if (search) {
        query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('prospect'),
  });

  // Search jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['entity-picker-jobs', search],
    queryFn: async () => {
      if (!allowedTypes.includes('job')) return [];
      const query = supabase
        .from('jobs')
        .select('id, title, location, employment_type, companies(name)')
        .eq('is_active', true)
        .limit(20);
      
      if (search) {
        query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('job'),
  });

  // Search applications
  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ['entity-picker-applications', search],
    queryFn: async () => {
      if (!allowedTypes.includes('application')) return [];
      const query = supabase
        .from('applications')
        .select('id, position, company_name, status, user_id')
        .limit(20);
      
      if (search) {
        query.or(`position.ilike.%${search}%,company_name.ilike.%${search}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: open && allowedTypes.includes('application'),
  });

  const handleSelect = useCallback((entity: SelectedEntity) => {
    onChange(entity);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  }, [onChange]);

  const isLoading = candidatesLoading || companiesLoading || usersLoading || 
                    prospectsLoading || jobsLoading || applicationsLoading;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderEntityList = (type: SelectedEntity['type']) => {
    let items: any[] = [];
    
    switch (type) {
      case 'candidate':
        items = (candidates || []).map(c => ({
          type: 'candidate' as const,
          id: c.id,
          name: c.full_name || c.email,
          subtitle: c.current_title,
          avatarUrl: c.avatar_url,
        }));
        break;
      case 'company':
        items = (companies || []).map(c => ({
          type: 'company' as const,
          id: c.id,
          name: c.name,
          subtitle: c.industry,
          avatarUrl: c.logo_url,
        }));
        break;
      case 'user':
        items = (users || []).map(u => ({
          type: 'user' as const,
          id: u.id,
          name: u.full_name || u.email,
          subtitle: u.current_title,
          avatarUrl: u.avatar_url,
        }));
        break;
      case 'prospect':
        items = (prospects || []).map(p => ({
          type: 'prospect' as const,
          id: p.id,
          name: p.name || p.email,
          subtitle: p.company_name,
        }));
        break;
      case 'job':
        items = (jobs || []).map(j => {
          const company = Array.isArray(j.companies) ? j.companies[0] : j.companies;
          return {
            type: 'job' as const,
            id: j.id,
            name: j.title,
            subtitle: `${company?.name || 'Unknown'} • ${j.location || 'Remote'}`,
          };
        });
        break;
      case 'application':
        items = (applications || []).map(a => ({
          type: 'application' as const,
          id: a.id,
          name: a.position,
          subtitle: `${a.company_name} • ${a.status}`,
        }));
        break;
    }

    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          {isLoading ? 'Searching...' : 'No results found'}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {items.map((item) => {
          const config = entityConfig[item.type];
          const isSelected = value?.id === item.id && value?.type === item.type;
          
          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left",
                isSelected && "bg-accent"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.avatarUrl} />
                <AvatarFallback className={config.color}>
                  {getInitials(item.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                )}
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    );
  };

  const selectedConfig = value ? entityConfig[value.type] : null;
  const SelectedIcon = selectedConfig?.icon;

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-auto min-h-10 px-3 py-2",
              !value && "text-muted-foreground"
            )}
          >
            {value ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant="secondary" className={cn("shrink-0", selectedConfig?.color)}>
                  {SelectedIcon && <SelectedIcon className="h-3 w-3 mr-1" />}
                  {selectedConfig?.label}
                </Badge>
                <span className="truncate">{value.name}</span>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {value && (
                <X
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SelectedEntity['type'])}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto">
              {allowedTypes.map((type) => {
                const config = entityConfig[type];
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-3 py-2"
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            <ScrollArea className="h-[300px]">
              {allowedTypes.map((type) => (
                <TabsContent key={type} value={type} className="p-2 m-0">
                  {renderEntityList(type)}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
