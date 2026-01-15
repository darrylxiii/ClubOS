import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/PageLoader";
import { 
  Star, Clock, RefreshCw, Check, MessageSquare, 
  Heart, Share2, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function GigDetailPage() {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<"basic" | "standard" | "premium">("standard");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const { data: gig, isLoading } = useQuery({
    queryKey: ["gig-detail", gigId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("freelancer_gigs")
        .select(`
          *,
          freelancer:profiles!freelancer_gigs_freelancer_id_fkey(
            id, full_name, avatar_url, bio, location
          )
        `)
        .eq("id", gigId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!gigId,
  });

  if (isLoading) return <PageLoader />;

  if (!gig) {
    return (
      <AppLayout>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
          <Button onClick={() => navigate("/projects/gigs")}>Browse Gigs</Button>
        </div>
      </AppLayout>
    );
  }

  const packages = {
    basic: {
      name: "Basic",
      price: gig.basic_price,
      description: gig.basic_description,
      deliveryDays: gig.basic_delivery_days,
      revisions: gig.basic_revisions,
      features: gig.basic_features || [],
    },
    standard: {
      name: "Standard",
      price: gig.standard_price,
      description: gig.standard_description,
      deliveryDays: gig.standard_delivery_days,
      revisions: gig.standard_revisions,
      features: gig.standard_features || [],
    },
    premium: {
      name: "Premium",
      price: gig.premium_price,
      description: gig.premium_description,
      deliveryDays: gig.premium_delivery_days,
      revisions: gig.premium_revisions,
      features: gig.premium_features || [],
    },
  };

  const currentPackage = packages[selectedPackage];
  const images = gig.gallery_images || [];

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button onClick={() => navigate("/projects/gigs")} className="hover:text-primary">
                Gigs
              </button>
              <ChevronRight className="h-4 w-4" />
              <span>{gig.category}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold">{gig.title}</h1>

            {/* Seller Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={gig.freelancer?.avatar_url} />
                <AvatarFallback>
                  {gig.freelancer?.full_name?.charAt(0) || "F"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{gig.freelancer?.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{gig.avg_rating?.toFixed(1) || "New"}</span>
                  {gig.order_count > 0 && (
                    <span>({gig.order_count} orders)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Gallery */}
            {images.length > 0 && (
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={images[currentImageIndex]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev === 0 ? images.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev === images.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {images.map((img: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={cn(
                            "w-20 h-14 rounded-md overflow-hidden shrink-0 border-2",
                            currentImageIndex === i ? "border-primary" : "border-transparent"
                          )}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="about">About Seller</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <Card>
                  <CardContent className="pt-6 prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{gig.description}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={gig.freelancer?.avatar_url} />
                        <AvatarFallback>
                          {gig.freelancer?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{gig.freelancer?.full_name}</h3>
                        <p className="text-muted-foreground">{gig.freelancer?.location}</p>
                        <p className="mt-4">{gig.freelancer?.bio || "No bio provided."}</p>
                        <Button variant="outline" className="mt-4">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Contact Me
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground py-12">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet. Be the first to order!</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faq" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {gig.faqs && gig.faqs.length > 0 ? (
                      <div className="space-y-4">
                        {gig.faqs.map((faq: any, i: number) => (
                          <div key={i}>
                            <h4 className="font-medium">{faq.question}</h4>
                            <p className="text-muted-foreground mt-1">{faq.answer}</p>
                            {i < gig.faqs.length - 1 && <Separator className="mt-4" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No FAQs available.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Package Selection */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <div className="flex gap-1">
                  {(["basic", "standard", "premium"] as const).map((pkg) => (
                    <Button
                      key={pkg}
                      variant={selectedPackage === pkg ? "default" : "ghost"}
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      {pkg}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">€{currentPackage.price}</span>
                </div>

                {currentPackage.description && (
                  <p className="text-muted-foreground">{currentPackage.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{currentPackage.deliveryDays} day delivery</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {currentPackage.revisions === -1 ? "Unlimited" : currentPackage.revisions} revision{currentPackage.revisions !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {currentPackage.features.length > 0 && (
                  <div className="space-y-2">
                    {currentPackage.features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <Button className="w-full" size="lg">
                  Continue (€{currentPackage.price})
                </Button>

                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => setIsSaved(!isSaved)}
                  >
                    <Heart className={cn("h-4 w-4 mr-2", isSaved && "fill-red-500 text-red-500")} />
                    Save
                  </Button>
                  <Button variant="ghost" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {gig.tags && gig.tags.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Related Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {gig.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
