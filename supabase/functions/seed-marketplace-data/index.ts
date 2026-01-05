import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all existing user IDs for realistic assignments
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .limit(50);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No profiles found. Create users first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = profiles.map(p => p.id);
    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const pickRandomId = () => pickRandom(userIds);

    // Categories for projects
    const categories = [
      "Development", "Design", "Marketing", "Writing", "Video Production",
      "Data Science", "Mobile Development", "DevOps", "UI/UX", "Consulting"
    ];

    const skills = {
      Development: ["React", "TypeScript", "Node.js", "Python", "PostgreSQL", "GraphQL"],
      Design: ["Figma", "UI Design", "Brand Identity", "Illustration", "Motion Graphics"],
      Marketing: ["SEO", "Content Marketing", "Social Media", "Google Ads", "Analytics"],
      Writing: ["Copywriting", "Technical Writing", "Blog Posts", "UX Writing", "Editing"],
      "Video Production": ["Premiere Pro", "After Effects", "DaVinci Resolve", "Animation"],
      "Data Science": ["Python", "Machine Learning", "SQL", "TensorFlow", "Data Visualization"],
      "Mobile Development": ["React Native", "Flutter", "iOS", "Android", "Swift"],
      DevOps: ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform"],
      "UI/UX": ["User Research", "Wireframing", "Prototyping", "Usability Testing"],
      Consulting: ["Strategy", "Business Analysis", "Process Optimization", "Project Management"]
    };

    const projectTitles = [
      "Build Modern E-commerce Platform with React",
      "Design Premium Brand Identity Package",
      "Create SEO-Optimized Content Strategy",
      "Develop AI-Powered Chatbot Integration",
      "Mobile App Development for iOS and Android",
      "Data Dashboard and Analytics Platform",
      "Corporate Video Production Series",
      "Full-Stack SaaS Application Build",
      "UI/UX Redesign for Fintech Platform",
      "DevOps Infrastructure Setup and Migration",
      "Marketing Automation System Implementation",
      "Technical Documentation and API Guides",
      "3D Product Visualization and Animation",
      "Custom CRM Development Project",
      "Social Media Management and Growth"
    ];

    const projectDescriptions = [
      "Looking for an experienced developer to build a scalable, high-performance platform with modern best practices.",
      "We need a talented designer to create a complete brand identity that reflects our innovative approach.",
      "Seeking a marketing expert to develop and execute a comprehensive digital strategy.",
      "Building cutting-edge AI solutions that will transform how our users interact with our platform.",
      "Creating a cross-platform mobile experience that delights users and drives engagement."
    ];

    // Seed Marketplace Projects
    const marketplaceProjects = [];
    for (let i = 0; i < 15; i++) {
      const category = pickRandom(categories);
      const budget = Math.floor(Math.random() * 45000) + 5000;
      marketplaceProjects.push({
        client_id: pickRandomId(),
        title: pickRandom(projectTitles) + ` #${i + 1}`,
        description: pickRandom(projectDescriptions),
        category,
        budget_min: budget,
        budget_max: budget + Math.floor(Math.random() * 10000),
        timeline_weeks: Math.floor(Math.random() * 12) + 2,
        required_skills: skills[category as keyof typeof skills]?.slice(0, 3) || [],
        status: pickRandom(["open", "open", "open", "in_progress", "completed"]),
        visibility: "public",
        urgency_level: pickRandom(["low", "medium", "high"]),
      });
    }

    const { data: insertedProjects, error: projectError } = await supabase
      .from("marketplace_projects")
      .insert(marketplaceProjects)
      .select();

    if (projectError) throw projectError;

    // Seed Freelance Profiles
    const freelanceProfiles = [];
    const freelancerTitles = [
      "Senior Full-Stack Developer",
      "UI/UX Design Lead",
      "Growth Marketing Specialist",
      "Technical Writer & Documentation Expert",
      "Video Production Director",
      "Data Science Consultant",
      "Mobile Development Expert",
      "DevOps Engineer",
      "Product Design Manager",
      "Strategy Consultant"
    ];

    for (let i = 0; i < Math.min(25, userIds.length); i++) {
      const category = pickRandom(categories);
      freelanceProfiles.push({
        user_id: userIds[i],
        headline: pickRandom(freelancerTitles),
        bio: "Experienced professional with a passion for delivering exceptional results. I bring years of expertise and a client-focused approach to every project.",
        hourly_rate: Math.floor(Math.random() * 150) + 50,
        skills: skills[category as keyof typeof skills] || [],
        experience_years: Math.floor(Math.random() * 15) + 2,
        availability_status: pickRandom(["available", "available", "busy", "unavailable"]),
        portfolio_urls: ["https://portfolio.example.com"],
        is_verified: Math.random() > 0.3,
        verification_level: pickRandom(["basic", "verified", "premium"]),
        total_earnings: Math.floor(Math.random() * 50000),
        total_projects_completed: Math.floor(Math.random() * 30),
        average_rating: Number((Math.random() * 1 + 4).toFixed(1)),
        response_time_hours: Math.floor(Math.random() * 12) + 1,
      });
    }

    const { data: insertedFreelancers, error: freelancerError } = await supabase
      .from("freelance_profiles")
      .upsert(freelanceProfiles, { onConflict: "user_id" })
      .select();

    if (freelancerError) throw freelancerError;

    // Seed Project Proposals
    const proposals = [];
    const coverLetters = [
      "I'm excited to apply for this project! With my extensive experience in this field, I'm confident I can deliver exceptional results.",
      "Your project caught my attention immediately. I have successfully completed similar projects and understand exactly what you need.",
      "I've reviewed your requirements carefully and believe my skill set is a perfect match. Let me show you what I can bring to the table.",
      "This is exactly the type of project I excel at. I would love to discuss how we can work together to achieve your goals.",
      "With my track record of successful projects and satisfied clients, I'm ready to bring the same excellence to your project."
    ];

    const openProjects = insertedProjects?.filter(p => p.status === "open") || [];
    for (const project of openProjects) {
      const numProposals = Math.floor(Math.random() * 5) + 2;
      for (let j = 0; j < numProposals; j++) {
        const freelancerId = pickRandomId();
        if (freelancerId !== project.client_id) {
          proposals.push({
            project_id: project.id,
            freelancer_id: freelancerId,
            cover_letter: pickRandom(coverLetters),
            proposed_rate: Math.floor(Math.random() * 100) + 50,
            proposed_timeline_weeks: project.timeline_weeks || Math.floor(Math.random() * 8) + 2,
            status: pickRandom(["submitted", "submitted", "shortlisted", "rejected"]),
            match_score: Math.floor(Math.random() * 30) + 70,
          });
        }
      }
    }

    const { error: proposalError } = await supabase
      .from("project_proposals")
      .insert(proposals);

    if (proposalError) throw proposalError;

    // Seed Freelancer Gigs
    const gigs = [];
    const gigTitles = [
      "I will build your React web application",
      "I will design a stunning UI/UX for your product",
      "I will create engaging marketing content",
      "I will develop your mobile app",
      "I will set up your cloud infrastructure"
    ];

    for (const freelancer of insertedFreelancers || []) {
      const numGigs = Math.floor(Math.random() * 3) + 1;
      for (let k = 0; k < numGigs; k++) {
        const basePrice = Math.floor(Math.random() * 500) + 100;
        gigs.push({
          freelancer_id: freelancer.user_id,
          title: pickRandom(gigTitles),
          description: "Professional service with fast delivery and unlimited revisions until you're 100% satisfied.",
          category: pickRandom(categories),
          base_price: basePrice,
          basic_price: basePrice,
          standard_price: basePrice * 2,
          premium_price: basePrice * 3.5,
          delivery_time_days: Math.floor(Math.random() * 14) + 3,
          revision_count: Math.floor(Math.random() * 3) + 1,
          status: "active",
          is_featured: Math.random() > 0.8,
        });
      }
    }

    const { error: gigError } = await supabase
      .from("freelancer_gigs")
      .insert(gigs);

    if (gigError) throw gigError;

    // Seed Project Reviews
    const reviews = [];
    const completedProjects = insertedProjects?.filter(p => p.status === "completed") || [];
    for (const project of completedProjects) {
      reviews.push({
        reviewer_id: project.client_id,
        reviewee_id: pickRandomId(),
        project_id: project.id,
        rating: Math.floor(Math.random() * 2) + 4,
        review_text: pickRandom([
          "Excellent work! Highly recommended.",
          "Great communication and delivered on time.",
          "Professional and skilled. Would hire again.",
          "Outstanding quality and attention to detail.",
          "Very satisfied with the final results."
        ]),
        review_type: "client_to_freelancer",
      });
    }

    const { error: reviewError } = await supabase
      .from("project_reviews")
      .insert(reviews);

    if (reviewError) throw reviewError;

    return new Response(
      JSON.stringify({
        success: true,
        seeded: {
          projects: insertedProjects?.length || 0,
          freelancers: insertedFreelancers?.length || 0,
          proposals: proposals.length,
          gigs: gigs.length,
          reviews: reviews.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Seed error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
