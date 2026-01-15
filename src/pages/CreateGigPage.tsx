import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Sparkles, ArrowRight, ArrowLeft, Check, 
  Package, Clock, DollarSign, Image, FileText,
  Plus, X, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const GIG_CATEGORIES = [
  "Web Development",
  "Mobile Apps",
  "UI/UX Design",
  "Data Science",
  "Marketing",
  "Content Writing",
  "Video Production",
  "Consulting",
  "Other",
];

interface PackageTier {
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

const STEPS = [
  { id: 1, title: "Overview", icon: FileText },
  { id: 2, title: "Packages", icon: Package },
  { id: 3, title: "Gallery", icon: Image },
  { id: 4, title: "Requirements", icon: Check },
];

export default function CreateGigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Overview
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Step 2: Packages
  const [packages, setPackages] = useState<PackageTier[]>([
    { name: "Basic", description: "", price: 50, deliveryDays: 7, revisions: 1, features: [] },
    { name: "Standard", description: "", price: 100, deliveryDays: 5, revisions: 2, features: [] },
    { name: "Premium", description: "", price: 200, deliveryDays: 3, revisions: 5, features: [] },
  ]);
  const [featureInput, setFeatureInput] = useState({ basic: "", standard: "", premium: "" });

  // Step 3: Gallery
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryInput, setGalleryInput] = useState("");

  // Step 4: Requirements
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  const createGigMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("freelancer_gigs")
        .insert({
          freelancer_id: user.id,
          title,
          description,
          category,
          tags,
          basic_price: packages[0].price,
          basic_description: packages[0].description,
          basic_delivery_days: packages[0].deliveryDays,
          basic_revisions: packages[0].revisions,
          basic_features: packages[0].features,
          standard_price: packages[1].price,
          standard_description: packages[1].description,
          standard_delivery_days: packages[1].deliveryDays,
          standard_revisions: packages[1].revisions,
          standard_features: packages[1].features,
          premium_price: packages[2].price,
          premium_description: packages[2].description,
          premium_delivery_days: packages[2].deliveryDays,
          premium_revisions: packages[2].revisions,
          premium_features: packages[2].features,
          gallery_images: galleryUrls,
          requirements,
          faqs,
          starting_price: packages[0].price,
          delivery_days: packages[0].deliveryDays,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-gigs"] });
      toast.success("Gig created successfully!");
      navigate(`/projects/gigs/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create gig");
    },
  });

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput) && tags.length < 5) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const addFeature = (tier: number) => {
    const key = tier === 0 ? "basic" : tier === 1 ? "standard" : "premium";
    const input = featureInput[key as keyof typeof featureInput];
    if (input) {
      const updated = [...packages];
      updated[tier].features = [...updated[tier].features, input];
      setPackages(updated);
      setFeatureInput({ ...featureInput, [key]: "" });
    }
  };

  const addGalleryUrl = () => {
    if (galleryInput && galleryUrls.length < 6) {
      setGalleryUrls([...galleryUrls, galleryInput]);
      setGalleryInput("");
    }
  };

  const addRequirement = () => {
    if (requirementInput && requirements.length < 10) {
      setRequirements([...requirements, requirementInput]);
      setRequirementInput("");
    }
  };

  const addFaq = () => {
    if (faqQuestion && faqAnswer && faqs.length < 5) {
      setFaqs([...faqs, { question: faqQuestion, answer: faqAnswer }]);
      setFaqQuestion("");
      setFaqAnswer("");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return title.length >= 10 && category && description.length >= 50;
      case 2:
        return packages.every(p => p.price > 0 && p.deliveryDays > 0);
      case 3:
        return true; // Gallery is optional
      case 4:
        return true; // Requirements are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      createGigMutation.mutate();
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Create a Gig
          </h1>
          <p className="text-muted-foreground mt-1">
            Package your expertise into a service clients can purchase
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Gig Title</Label>
                  <Input
                    id="title"
                    placeholder="I will create a stunning website for your business"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/80 characters. Start with "I will..."
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GIG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your service in detail. What will you deliver? What's included?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/2000 characters (minimum 50)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add up to 5 tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="secondary" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Create up to 3 pricing packages to offer different service levels
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {packages.map((pkg, index) => (
                    <Card key={index} className={cn(
                      "relative",
                      index === 1 && "border-primary ring-2 ring-primary/20"
                    )}>
                      {index === 1 && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                          Most Popular
                        </Badge>
                      )}
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            placeholder={`What's included in ${pkg.name}?`}
                            value={pkg.description}
                            onChange={(e) => {
                              const updated = [...packages];
                              updated[index].description = e.target.value;
                              setPackages(updated);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" /> Price
                            </Label>
                            <Input
                              type="number"
                              min={5}
                              value={pkg.price}
                              onChange={(e) => {
                                const updated = [...packages];
                                updated[index].price = Number(e.target.value);
                                setPackages(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Days
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={pkg.deliveryDays}
                              onChange={(e) => {
                                const updated = [...packages];
                                updated[index].deliveryDays = Number(e.target.value);
                                setPackages(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Revisions</Label>
                          <Select
                            value={String(pkg.revisions)}
                            onValueChange={(v) => {
                              const updated = [...packages];
                              updated[index].revisions = Number(v);
                              setPackages(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 5, 10, -1].map((r) => (
                                <SelectItem key={r} value={String(r)}>
                                  {r === -1 ? "Unlimited" : r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Features</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add feature"
                              value={featureInput[index === 0 ? "basic" : index === 1 ? "standard" : "premium"]}
                              onChange={(e) => setFeatureInput({
                                ...featureInput,
                                [index === 0 ? "basic" : index === 1 ? "standard" : "premium"]: e.target.value
                              })}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature(index))}
                            />
                            <Button size="icon" variant="secondary" onClick={() => addFeature(index)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1 mt-2">
                            {pkg.features.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Check className="h-3 w-3 text-primary" />
                                <span className="flex-1">{f}</span>
                                <X 
                                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive" 
                                  onClick={() => {
                                    const updated = [...packages];
                                    updated[index].features = pkg.features.filter((_, idx) => idx !== i);
                                    setPackages(updated);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Gallery Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Add up to 6 images showcasing your work. Enter image URLs.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={galleryInput}
                      onChange={(e) => setGalleryInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGalleryUrl())}
                    />
                    <Button type="button" variant="secondary" onClick={addGalleryUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryUrls.map((url, i) => (
                    <div key={i} className="relative group aspect-video bg-muted rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setGalleryUrls(galleryUrls.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {galleryUrls.length < 6 && (
                    <div className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Image className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Add image</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Requirements from Buyer</Label>
                  <p className="text-sm text-muted-foreground">
                    What information do you need from the buyer to get started?
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Please provide your logo files"
                      value={requirementInput}
                      onChange={(e) => setRequirementInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
                    />
                    <Button type="button" variant="secondary" onClick={addRequirement}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <span className="flex-1">{req}</span>
                        <X 
                          className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive" 
                          onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Frequently Asked Questions</Label>
                  <p className="text-sm text-muted-foreground">
                    Add common questions buyers might have
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Question"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                    />
                    <Textarea
                      placeholder="Answer"
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      rows={3}
                    />
                    <Button type="button" variant="secondary" onClick={addFaq}>
                      <Plus className="h-4 w-4 mr-2" /> Add FAQ
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{faq.question}</p>
                              <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                            </div>
                            <X 
                              className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive shrink-0" 
                              onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || createGigMutation.isPending}
          >
            {createGigMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Publish Gig
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
