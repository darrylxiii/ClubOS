import { lazy } from "react";
import { AppLayout } from "@/components/AppLayout";
import { CoverLetterBuilder } from "@/components/applications/CoverLetterBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CoverLetterGenerator() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase flex items-center gap-3">
                <div className="w-1.5 h-10 bg-primary" />
                Cover Letter Builder
              </h1>
              <p className="text-muted-foreground mt-2">
                Generate personalized, AI-powered cover letters tailored to specific job opportunities
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Powered by QUIN</span>
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Select a Job</p>
                    <p className="text-sm text-muted-foreground">
                      Choose from your applications or saved jobs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Choose Your Tone</p>
                    <p className="text-sm text-muted-foreground">
                      Professional, conversational, or executive style
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Generate & Customize</p>
                    <p className="text-sm text-muted-foreground">
                      Edit, export to PDF, or save to your documents
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Builder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CoverLetterBuilder />
        </motion.div>
      </div>
    </AppLayout>
  );
}
