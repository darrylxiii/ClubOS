import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  TrendingUp, 
  Scale, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  List
} from 'lucide-react';
import { useCandidateOffers, type CandidateOffer } from '@/hooks/useCandidateOffers';
import { OfferCard } from '@/components/offers/OfferCard';
import { OfferComparisonTable } from '@/components/offers/OfferComparisonTable';
import { CompensationBreakdown } from '@/components/offers/CompensationBreakdown';
import { OfferNegotiationChat } from '@/components/offers/OfferNegotiationChat';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function OfferComparison() {
  const { offers, stats, isLoading, acceptOffer, declineOffer, startNegotiation } = useCandidateOffers();
  const [selectedOffer, setSelectedOffer] = useState<CandidateOffer | null>(null);
  const [showNegotiationChat, setShowNegotiationChat] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter offers by status
  const filteredOffers = offers.filter(offer => {
    switch (activeTab) {
      case 'pending':
        return ['sent', 'viewed', 'negotiating'].includes(offer.status || '');
      case 'accepted':
        return offer.status === 'accepted';
      case 'declined':
        return offer.status === 'declined' || offer.status === 'expired';
      default:
        return true;
    }
  });

  const handleViewDetails = (offer: CandidateOffer) => {
    setSelectedOffer(offer);
  };

  const handleNegotiate = (offer: CandidateOffer) => {
    setSelectedOffer(offer);
    setShowNegotiationChat(true);
    startNegotiation(offer.id);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Offer Comparison</h1>
              <p className="text-muted-foreground">
                Compare and evaluate your job offers with Club AI's insights
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Offers</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Negotiating</p>
                  <p className="text-2xl font-bold">{stats.negotiating}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Highest Offer</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.highestOffer)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {offers.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No offers yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                When you receive job offers, they'll appear here for easy comparison and negotiation support.
              </p>
              <Button asChild>
                <a href="/jobs">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs and View Toggle */}
            <div className="flex items-center justify-between mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">
                    All ({offers.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({stats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="accepted">
                    Accepted ({stats.accepted})
                  </TabsTrigger>
                  <TabsTrigger value="declined">
                    Declined ({stats.declined})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Scale className="h-4 w-4 mr-1" />
                  Compare
                </Button>
              </div>
            </div>

            {/* Offers Display */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={() => acceptOffer(offer.id)}
                    onDecline={() => declineOffer(offer.id)}
                    onNegotiate={() => handleNegotiate(offer)}
                    onViewDetails={() => handleViewDetails(offer)}
                  />
                ))}
              </div>
            ) : (
              <OfferComparisonTable
                offers={filteredOffers}
                onSelectOffer={(id) => {
                  const offer = offers.find(o => o.id === id);
                  if (offer) handleViewDetails(offer);
                }}
                highlightBest
              />
            )}
          </>
        )}

        {/* Offer Detail Dialog */}
        <Dialog open={!!selectedOffer && !showNegotiationChat} onOpenChange={(open) => !open && setSelectedOffer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedOffer?.job?.companies?.name || 'Company'} — {selectedOffer?.job?.title || 'Position'}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              {selectedOffer && (
                <div className="space-y-6">
                  <CompensationBreakdown offer={selectedOffer} />
                  
                  {/* AI Insights */}
                  {selectedOffer.ai_recommendation && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Club AI Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedOffer.ai_recommendation.summary && (
                          <p className="text-sm">{selectedOffer.ai_recommendation.summary}</p>
                        )}
                        
                        {selectedOffer.ai_recommendation.negotiation_tips && 
                         selectedOffer.ai_recommendation.negotiation_tips.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Negotiation Tips</p>
                            <ul className="text-sm space-y-1">
                              {selectedOffer.ai_recommendation.negotiation_tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1" 
                      onClick={() => setShowNegotiationChat(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Get Negotiation Help
                    </Button>
                    {['sent', 'viewed', 'negotiating'].includes(selectedOffer.status || '') && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            acceptOffer(selectedOffer.id);
                            setSelectedOffer(null);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            declineOffer(selectedOffer.id);
                            setSelectedOffer(null);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Negotiation Chat Dialog */}
        <Dialog open={showNegotiationChat} onOpenChange={setShowNegotiationChat}>
          <DialogContent className="max-w-2xl p-0">
            {selectedOffer && (
              <OfferNegotiationChat 
                offer={selectedOffer} 
                onClose={() => setShowNegotiationChat(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
