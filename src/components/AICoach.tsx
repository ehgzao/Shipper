import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileText, User, Building2, Loader2 } from "lucide-react";
import type { Opportunity } from "@/components/OpportunityModal";

interface Profile {
  full_name: string | null;
  years_experience_total: number | null;
  years_experience_product: number | null;
  previous_background: string | null;
  strength_orientation: string | null;
  skills: string[] | null;
}

interface AICoachProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
  profile: Profile | null;
}

type CoachingType = "cover_letter" | "cv_highlights" | "company_intel";

export const AICoach = ({ open, onOpenChange, opportunity, profile }: AICoachProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CoachingType>("cover_letter");
  const [suggestions, setSuggestions] = useState<Record<CoachingType, string>>({
    cover_letter: "",
    cv_highlights: "",
    company_intel: "",
  });
  const { toast } = useToast();

  const fetchSuggestions = async (type: CoachingType) => {
    if (suggestions[type]) return; // Already fetched

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { type, opportunity, profile },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuggestions((prev) => ({ ...prev, [type]: data.suggestions }));
    } catch (error) {
      console.error("AI Coach error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error fetching suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    const type = value as CoachingType;
    setActiveTab(type);
    fetchSuggestions(type);
  };

  const handleOpen = () => {
    if (!suggestions.cover_letter) {
      fetchSuggestions("cover_letter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Coach - {opportunity.company_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cover_letter" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Cover Letter</span>
            </TabsTrigger>
            <TabsTrigger value="cv_highlights" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">CV</span>
            </TabsTrigger>
            <TabsTrigger value="company_intel" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Intel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover_letter" className="mt-4">
            <CoachingContent
              title="Cover Letter Tips"
              description="Personalized suggestions for your cover letter"
              content={suggestions.cover_letter}
              isLoading={isLoading && activeTab === "cover_letter"}
            />
          </TabsContent>

          <TabsContent value="cv_highlights" className="mt-4">
            <CoachingContent
              title="CV Highlights"
              description="What to prioritize in your resume for this role"
              content={suggestions.cv_highlights}
              isLoading={isLoading && activeTab === "cv_highlights"}
            />
          </TabsContent>

          <TabsContent value="company_intel" className="mt-4">
            <CoachingContent
              title="Company Intelligence"
              description="Insights to prepare for the process"
              content={suggestions.company_intel}
              isLoading={isLoading && activeTab === "company_intel"}
            />
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          💡 AI Coach suggests, you execute. Use these tips as a starting point.
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CoachingContentProps {
  title: string;
  description: string;
  content: string;
  isLoading: boolean;
}

const CoachingContent = ({ title, description, content, isLoading }: CoachingContentProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating personalized suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {content ? (
          <div className="prose prose-sm max-w-none text-foreground">
            {content.split("\n").map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Click on a tab to generate suggestions.</p>
        )}
      </CardContent>
    </Card>
  );
};