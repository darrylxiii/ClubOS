import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Eye, EyeOff, Users, UserPlus, MapPin, Briefcase, Crown, Star,
  Sparkles, Shield, Clock, ExternalLink, GraduationCap, Award, Send, Plus,
} from 'lucide-react';
import { AvatarAccount, useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface ViewAvatarProfileDialogProps {
  account: AvatarAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

const riskColors: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

export function ViewAvatarProfileDialog({ account, open, onOpenChange }: ViewAvatarProfileDialogProps) {
  const { logConnectionsSent } = useAvatarAccounts();
  const [linkedinPw, setLinkedinPw] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [showLinkedinPw, setShowLinkedinPw] = useState(false);
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [loadingCreds, setLoadingCreds] = useState(false);

  useEffect(() => {
    if (account && open) {
      setShowLinkedinPw(false);
      setShowEmailPw(false);
      setLinkedinPw('');
      setEmailPw('');
      setLoadingCreds(true);
      supabase
        .from('linkedin_avatar_accounts')
        .select('linkedin_password_encrypted, email_account_password_encrypted')
        .eq('id', account.id)
        .single()
        .then(({ data }) => {
          if (data) {
            try {
              if ((data as any).linkedin_password_encrypted) setLinkedinPw(atob((data as any).linkedin_password_encrypted));
            } catch { /* ignore */ }
            try {
              if ((data as any).email_account_password_encrypted) setEmailPw(atob((data as any).email_account_password_encrypted));
            } catch { /* ignore */ }
          }
          setLoadingCreds(false);
        }, () => setLoadingCreds(false));
    }
  }, [account, open]);

  if (!account) return null;

  const initials = account.label.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const experience = account.experience_json as any[] | null;
  const education = account.education_json as any[] | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header with background */}
        <div className="relative">
          {account.background_picture_url ? (
            <div className="h-28 w-full overflow-hidden">
              <img src={account.background_picture_url} alt="" className="w-full h-full object-cover opacity-60" />
            </div>
          ) : (
            <div className="h-28 w-full bg-gradient-to-r from-primary/20 to-accent/10" />
          )}
          <div className="absolute -bottom-10 left-6">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={account.avatar_url ?? undefined} alt={account.label} />
              <AvatarFallback className="text-lg font-bold bg-muted">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-7rem)]">
          <div className="pt-14 px-6 pb-6 space-y-5">
            {/* Name + headline */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{account.label}</h2>
                {account.linkedin_url && (
                  <a href={account.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              {account.linkedin_headline && (
                <p className="text-sm text-muted-foreground mt-0.5">{account.linkedin_headline}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {account.current_company && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {account.current_company}
                  </span>
                )}
                {account.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {account.location}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {account.is_premium && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400">
                  <Crown className="h-3 w-3 mr-0.5" /> Premium
                </Badge>
              )}
              {account.is_creator && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-400">
                  <Sparkles className="h-3 w-3 mr-0.5" /> Creator
                </Badge>
              )}
              {account.is_influencer && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-400">
                  <Star className="h-3 w-3 mr-0.5" /> Influencer
                </Badge>
              )}
              {account.open_to_work && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-400">
                  Open to Work
                </Badge>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              <StatBox label="Connections" value={formatCompact(account.connections_count)} icon={<Users className="h-3.5 w-3.5" />} />
              <StatBox label="Followers" value={formatCompact(account.followers_count)} icon={<UserPlus className="h-3.5 w-3.5" />} />
              <StatBox label="Risk Score" value={`${account.risk_score}/100`} icon={<Shield className={`h-3.5 w-3.5 ${riskColors[account.risk_level]}`} />} />
              <StatBox label="Usage Today" value={`${account.daily_usage_minutes_today}m`} icon={<Clock className="h-3.5 w-3.5" />} />
            </div>

            {/* About */}
            {account.about && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">About</h3>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{account.about}</p>
                </div>
              </>
            )}

            {/* Skills */}
            {account.top_skills && account.top_skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {account.top_skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs font-normal">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Experience */}
            {experience && experience.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    <Briefcase className="h-3 w-3 inline mr-1" /> Experience
                  </h3>
                  <div className="space-y-3">
                    {experience.slice(0, 8).map((exp: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        {exp.logo_url ? (
                          <img src={exp.logo_url} alt="" className="h-8 w-8 rounded object-cover shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{exp.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground truncate">{exp.company || exp.company_name || ''}</p>
                          {(exp.start_date || exp.duration) && (
                            <p className="text-[11px] text-muted-foreground/60">
                              {exp.start_date && `${exp.start_date}`}
                              {exp.end_date && ` — ${exp.end_date}`}
                              {!exp.end_date && exp.start_date && ' — Present'}
                              {exp.duration && ` · ${exp.duration}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Education */}
            {education && education.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    <GraduationCap className="h-3 w-3 inline mr-1" /> Education
                  </h3>
                  <div className="space-y-3">
                    {education.map((edu: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{edu.school || edu.school_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(' · ')}
                          </p>
                          {(edu.start_year || edu.end_year) && (
                            <p className="text-[11px] text-muted-foreground/60">
                              {edu.start_year}{edu.end_year && ` — ${edu.end_year}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Credentials */}
            <Separator />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                <Award className="h-3 w-3 inline mr-1" /> Credentials
              </h3>
              <div className="space-y-2.5">
                <CredentialRow
                  label="LinkedIn Email"
                  value={account.linkedin_email || '—'}
                />
                <CredentialRow
                  label="LinkedIn Password"
                  value={loadingCreds ? 'Loading…' : (linkedinPw || '—')}
                  isPassword
                  show={showLinkedinPw}
                  onToggle={() => setShowLinkedinPw(v => !v)}
                  hasValue={!!linkedinPw}
                />
                <CredentialRow
                  label="Email Account"
                  value={account.email_account_address || '—'}
                />
                <CredentialRow
                  label="Email Password"
                  value={loadingCreds ? 'Loading…' : (emailPw || '—')}
                  isPassword
                  show={showEmailPw}
                  onToggle={() => setShowEmailPw(v => !v)}
                  hasValue={!!emailPw}
                />
              </div>
            </div>

            {/* Operational info */}
            <Separator />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <InfoRow label="Status" value={account.status.replace('_', ' ')} />
              <InfoRow label="Risk Level" value={account.risk_level} />
              <InfoRow label="Max Daily Min" value={`${account.max_daily_minutes}`} />
              <InfoRow label="Sessions Today" value={`${account.sessions_today}`} />
              <InfoRow label="Owner / Team" value={account.owner_team || '—'} />
              <InfoRow label="Public ID" value={account.public_identifier || '—'} />
              {account.last_synced_at && (
                <InfoRow label="Last Synced" value={formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })} />
              )}
              {account.created_at && (
                <InfoRow label="Created" value={format(new Date(account.created_at), 'dd MMM yyyy')} />
              )}
            </div>

            {/* Notes */}
            {account.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{account.notes}</p>
                </div>
              </>
            )}

            {/* Playbook */}
            {account.playbook && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Playbook</h3>
                  <p className="text-sm whitespace-pre-wrap">{account.playbook}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5 text-center">
      <div className="flex justify-center mb-1 text-muted-foreground">{icon}</div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CredentialRow({ label, value, isPassword, show, onToggle, hasValue }: {
  label: string;
  value: string;
  isPassword?: boolean;
  show?: boolean;
  onToggle?: () => void;
  hasValue?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-md bg-muted/30">
      <span className="text-xs text-muted-foreground shrink-0 w-32">{label}</span>
      <span className="text-xs font-mono truncate flex-1 text-right">
        {isPassword ? (show ? value : (hasValue ? '••••••••' : '—')) : value}
      </span>
      {isPassword && hasValue && onToggle && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onToggle}>
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
