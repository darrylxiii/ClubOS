import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Plus,
  MoreVertical,
  Trash2,
  ExternalLink,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TalentTier } from '@/hooks/useTalentPool';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTalentPoolListDetail } from '@/hooks/useTalentPoolLists';
import { TierBadge, MoveProbabilityBadge } from '@/components/talent-pool';
import { formatDistanceToNow } from 'date-fns';

export default function TalentPoolListDetail() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { list, members, isLoading, removeMember } = useTalentPoolListDetail(listId);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">List not found</h3>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/talent-pool/lists')}>
              Back to Lists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/talent-pool/lists')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${list.list_type === 'smart' ? 'bg-accent/10' : 'bg-primary/10'}`}>
              {list.list_type === 'smart' ? (
                <Sparkles className="w-4 h-4 text-accent" />
              ) : (
                <FolderOpen className="w-4 h-4 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold">{list.name}</h1>
            {list.list_type === 'smart' && (
              <Badge variant="secondary">Smart List</Badge>
            )}
          </div>
          {list.description && (
            <p className="text-muted-foreground mt-1">{list.description}</p>
          )}
        </div>
        {list.list_type === 'manual' && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidates
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{members.length} candidates</span>
        </div>
        <span>Created {formatDistanceToNow(new Date(list.created_at), { addSuffix: true })}</span>
      </div>

      {/* Members Table */}
      {members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No candidates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {list.list_type === 'smart'
                ? 'No candidates match the smart list criteria'
                : 'Add candidates to this list from the talent pool'}
            </p>
            {list.list_type === 'manual' && (
              <Button onClick={() => navigate('/admin/talent-pool')}>
                <Plus className="w-4 h-4 mr-2" />
                Browse Talent Pool
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedMembers.size === members.length}
                    onChange={toggleAll}
                    className="rounded border-input"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Move Probability</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member, index) => {
                const candidate = member.candidate;
                if (!candidate) return null;

                return (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="group"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => toggleMember(member.id)}
                        className="rounded border-input"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {candidate.full_name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{candidate.full_name}</div>
                          <div className="text-sm text-muted-foreground">{candidate.current_title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{candidate.current_company || '—'}</TableCell>
                    <TableCell>
                      <TierBadge tier={(candidate.talent_tier || 'pool') as TalentTier} />
                    </TableCell>
                    <TableCell>
                      <MoveProbabilityBadge probability={candidate.move_probability} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(member.added_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/candidate/${candidate.id}`)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          {list.list_type === 'manual' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from List
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
