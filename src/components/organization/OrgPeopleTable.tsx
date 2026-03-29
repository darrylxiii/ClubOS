import { useTranslation } from 'react-i18next';
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, Linkedin, ExternalLink, UserCheck, Crown, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompanyPerson } from "@/hooks/usePartnerOrgIntelligence";
import { RECOGNIZED_DEPARTMENTS, SENIORITY_ORDER } from "@/lib/titleClassifier";

interface Props {
  people: CompanyPerson[];
}

export function OrgPeopleTable({ people }: Props) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterSeniority, setFilterSeniority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('current');

  const filtered = useMemo(() => {
    return people.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch = [p.full_name, p.current_title, p.department_inferred, p.location, ...(p.skills || [])]
          .filter(Boolean)
          .some(v => v!.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (filterDept !== 'all' && p.department_inferred !== filterDept) return false;
      if (filterSeniority !== 'all' && p.seniority_level !== filterSeniority) return false;
      if (filterStatus !== 'all' && p.employment_status !== filterStatus) return false;
      return true;
    });
  }, [people, search, filterDept, filterSeniority, filterStatus]);

  // Group by department
  const grouped = useMemo(() => {
    const map = new Map<string, CompanyPerson[]>();
    for (const p of filtered) {
      const dept = p.department_inferred || 'Unclassified';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(p);
    }

    // Sort departments by RECOGNIZED_DEPARTMENTS order
    const sortedEntries = [...map.entries()].sort((a, b) => {
      const aIdx = RECOGNIZED_DEPARTMENTS.indexOf(a[0] as any);
      const bIdx = RECOGNIZED_DEPARTMENTS.indexOf(b[0] as any);
      if (aIdx === -1 && bIdx === -1) return a[0].localeCompare(b[0]);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    // Sort people within each department by seniority
    for (const [, ppl] of sortedEntries) {
      ppl.sort((a, b) => {
        const aIdx = SENIORITY_ORDER.indexOf(a.seniority_level as any);
        const bIdx = SENIORITY_ORDER.indexOf(b.seniority_level as any);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });
    }

    return sortedEntries;
  }, [filtered]);

  // Decide view mode: accordion for < 50 people, flat table for more
  const useAccordion = filtered.length <= 100;
  const activeDepts = useMemo(() => {
    return new Set(people.filter(p => p.employment_status === 'current').map(p => p.department_inferred).filter(Boolean));
  }, [people]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("search_by_name_title", "Search by name, title, skill...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("department", "Department")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_departments", "All Departments")}</SelectItem>
            {RECOGNIZED_DEPARTMENTS.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
            <SelectItem value="Unclassified">{t("unclassified", "Unclassified")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeniority} onValueChange={setFilterSeniority}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("seniority", "Seniority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_levels", "All Levels")}</SelectItem>
            {SENIORITY_ORDER.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("status", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all", "All")}</SelectItem>
            <SelectItem value="current">{t("current", "Current")}</SelectItem>
            <SelectItem value="departed">{t("departed", "Departed")}</SelectItem>
            <SelectItem value="new_hire">{t("new_hire", "New Hire")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {people.length} people shown</p>

      {/* Department Accordions */}
      {useAccordion ? (
        <div className="space-y-2">
          {grouped.map(([dept, deptPeople], idx) => (
            <DepartmentAccordion
              key={dept}
              department={dept}
              people={deptPeople}
              defaultOpen={idx < 3}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map(person => (
                <PersonRow key={person.id} person={person} showDepartment />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DepartmentAccordion({ department, people, defaultOpen }: { department: string; people: CompanyPerson[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold">{department}</span>
              <Badge variant="secondary" className="text-xs">{people.length}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {people.filter(p => p.is_decision_maker).length > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Crown className="w-3 h-3" />
                  {people.filter(p => p.is_decision_maker).length} DMs
                </Badge>
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y border-t">
            {people.map(person => (
              <PersonRow key={person.id} person={person} />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function PersonRow({ person, showDepartment }: { person: CompanyPerson; showDepartment?: boolean }) {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={person.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {(person.full_name || '??').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{person.full_name || 'Unknown'}</span>
          {person.is_decision_maker && (
            <Crown className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          )}
          {person.matched_candidate_id && (
            <Badge variant="outline" className="text-xs gap-1 flex-shrink-0">
              <UserCheck className="w-3 h-3" />
              Talent Pool
            </Badge>
          )}
          {person.employment_status === 'departed' && (
            <Badge variant="destructive" className="text-xs">{t("departed", "Departed")}</Badge>
          )}
          {person.employment_status === 'new_hire' && (
            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{t("new", "New")}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{person.current_title || 'No title'}</p>
        {person.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {person.location}
          </p>
        )}
      </div>

      {showDepartment && person.department_inferred && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">{person.department_inferred}</Badge>
      )}

      {person.seniority_level && (
        <Badge variant="outline" className="text-xs flex-shrink-0 hidden md:flex">{person.seniority_level}</Badge>
      )}

      {person.years_at_company !== null && (
        <span className="text-xs text-muted-foreground flex-shrink-0 hidden lg:block w-16 text-right">
          {person.years_at_company}y tenure
        </span>
      )}

      {(person.skills || []).length > 0 && (
        <div className="hidden xl:flex gap-1 flex-shrink-0">
          {person.skills.slice(0, 3).map(skill => (
            <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        onClick={() => window.open(person.linkedin_url, '_blank')}
      >
        <Linkedin className="w-4 h-4" />
      </Button>
    </div>
  );
}
