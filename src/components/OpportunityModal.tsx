import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Sparkles, Copy, Star, Snowflake } from "lucide-react";
import { AICoach } from "@/components/AICoach";
import { opportunitySchema, getValidationError } from "@/lib/validations";

import type { Database } from "@/integrations/supabase/types";

type OpportunityStatus = Database["public"]["Enums"]["opportunity_status"];
type SeniorityLevel = Database["public"]["Enums"]["seniority_level"];
type WorkModel = Database["public"]["Enums"]["work_model"];

export interface Opportunity {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  status: OpportunityStatus | null;
  job_url: string | null;
  location: string | null;
  work_model: WorkModel | null;
  seniority_level: SeniorityLevel | null;
  salary_range: string | null;
  contact_name: string | null;
  contact_linkedin: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  match_score: number | null;
  created_at: string | null;
  updated_at: string | null;
  applied_at: string | null;
  tags: string[] | null;
  display_order?: number | null;
  fit_level?: number | null;
  opportunity_tag?: string | null;
  previous_status?: string | null;
  is_favorite?: boolean | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
}

export interface OpportunityProfile {
  full_name: string | null;
  years_experience_total: number | null;
  years_experience_product: number | null;
  previous_background: string | null;
  strength_orientation: string | null;
  skills: string[] | null;
}

interface OpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity | null;
  userId: string;
  onSaved: () => void;
  onDeleted?: () => void;
  onDuplicate?: () => void;
  profile?: OpportunityProfile | null;
}

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
];

const WORK_MODEL_OPTIONS: { value: WorkModel; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "assessment", label: "Assessment" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
  { value: "withdrawn", label: "Withdrawn" },
];

const TAG_OPTIONS = [
  { value: "none", label: "None" },
  { value: "high_priority", label: "🔥 High Priority" },
  { value: "referral", label: "🤝 Referral" },
  { value: "dream_job", label: "💜 Dream Job" },
];

export const OpportunityModal = ({ 
  open, 
  onOpenChange, 
  opportunity, 
  userId, 
  onSaved,
  onDeleted,
  onDuplicate,
  profile 
}: OpportunityModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [status, setStatus] = useState<OpportunityStatus>("researching");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState<WorkModel | "">("");
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel | "">("");
  const [salaryRange, setSalaryRange] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [fitLevel, setFitLevel] = useState<number>(2);
  const [opportunityTag, setOpportunityTag] = useState<string>("");

  // Reset form when opportunity changes
  useEffect(() => {
    if (opportunity) {
      setCompanyName(opportunity.company_name);
      setRoleTitle(opportunity.role_title);
      setStatus(opportunity.status || "researching");
      setJobUrl(opportunity.job_url || "");
      setLocation(opportunity.location || "");
      setWorkModel(opportunity.work_model || "");
      setSeniorityLevel(opportunity.seniority_level || "");
      setSalaryRange(opportunity.salary_range || "");
      setContactName(opportunity.contact_name || "");
      setContactLinkedin(opportunity.contact_linkedin || "");
      setNextAction(opportunity.next_action || "");
      setNextActionDate(opportunity.next_action_date || "");
      setNotes(opportunity.notes || "");
      setFitLevel(opportunity.fit_level || 2);
      setOpportunityTag(opportunity.opportunity_tag || "none");
    } else {
      // Reset for new opportunity
      setCompanyName("");
      setRoleTitle("");
      setStatus("researching");
      setJobUrl("");
      setLocation("");
      setWorkModel("");
      setSeniorityLevel("");
      setSalaryRange("");
      setContactName("");
      setContactLinkedin("");
      setNextAction("");
      setNextActionDate("");
      setNotes("");
      setFitLevel(2);
      setOpportunityTag("none");
    }
  }, [opportunity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      jobUrl: jobUrl.trim(),
      location: location.trim(),
      salaryRange: salaryRange.trim(),
      contactName: contactName.trim(),
      contactLinkedin: contactLinkedin.trim(),
      nextAction: nextAction.trim(),
      notes: notes.trim(),
      tags: [],
    };

    const validationError = getValidationError(opportunitySchema, formData);
    if (validationError) {
      toast({
        title: "Validation error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const data = {
      company_name: formData.companyName,
      role_title: formData.roleTitle,
      status,
      job_url: formData.jobUrl || null,
      location: formData.location || null,
      work_model: workModel || null,
      seniority_level: seniorityLevel || null,
      salary_range: formData.salaryRange || null,
      contact_name: formData.contactName || null,
      contact_linkedin: formData.contactLinkedin || null,
      next_action: formData.nextAction || null,
      next_action_date: nextActionDate || null,
      notes: formData.notes || null,
      user_id: userId,
      fit_level: fitLevel,
      opportunity_tag: opportunityTag === "none" ? null : opportunityTag || null,
    };

    let error;

    if (opportunity) {
      const result = await supabase
        .from("opportunities")
        .update(data)
        .eq("id", opportunity.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("opportunities")
        .insert(data);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: opportunity ? "Opportunity updated!" : "Opportunity created!",
        description: `${companyName} - ${roleTitle}`,
      });
      onSaved();
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity deleted",
        description: `${opportunity.company_name} was removed.`,
      });
      onDeleted?.();
      onOpenChange(false);
    }
    setIsDeleting(false);
  };

  const handleDuplicate = async () => {
    if (!opportunity) return;
    setIsDuplicating(true);

    const { error } = await supabase
      .from("opportunities")
      .insert({
        user_id: userId,
        company_name: opportunity.company_name,
        role_title: `${opportunity.role_title} (Copy)`,
        status: "researching",
        job_url: opportunity.job_url,
        location: opportunity.location,
        work_model: opportunity.work_model,
        seniority_level: opportunity.seniority_level,
        salary_range: opportunity.salary_range,
        contact_name: opportunity.contact_name,
        contact_linkedin: opportunity.contact_linkedin,
        notes: opportunity.notes,
        fit_level: opportunity.fit_level,
        opportunity_tag: opportunity.opportunity_tag,
      });

    if (error) {
      toast({
        title: "Error duplicating",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity duplicated!",
        description: `Copy of ${opportunity.company_name} created.`,
      });
      onDuplicate?.();
      onOpenChange(false);
    }
    setIsDuplicating(false);
  };

  const handleToggleFrozen = async () => {
    if (!opportunity) return;
    setIsFreezing(true);

    const currentTags = opportunity.tags || [];
    const isFrozen = currentTags.includes("frozen");
    const newTags = isFrozen 
      ? currentTags.filter(t => t !== "frozen")
      : [...currentTags, "frozen"];

    const { error } = await supabase
      .from("opportunities")
      .update({ 
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isFrozen ? "Opportunity unfrozen" : "Opportunity frozen",
        description: isFrozen 
          ? `${opportunity.company_name} is now active.`
          : `${opportunity.company_name} is now frozen.`,
      });
      onSaved();
      onOpenChange(false);
    }
    setIsFreezing(false);
  };

  const isFrozen = opportunity?.tags?.includes("frozen") || false;
  const isEditing = !!opportunity;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>
              {isEditing ? "Edit Opportunity" : "New Opportunity"}
            </DialogTitle>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAICoach(true)}
              >
                <Sparkles className="h-4 w-4" />
                AI Coach
              </Button>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleTitle">Role Title *</Label>
                <Input
                  id="roleTitle"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Product Manager"
                  required
                />
              </div>
            </div>

            {/* Location & Work Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workModel">Work Model</Label>
                <Select value={workModel} onValueChange={(v) => setWorkModel(v as WorkModel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job URL</Label>
              <Input
                id="jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="border-t border-border pt-4" />

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fit Level */}
            <div className="space-y-2">
              <Label>Fit Level</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFitLevel(level)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border transition-all ${
                      fitLevel === level 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {[...Array(level)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                    {[...Array(3 - level)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    ))}
                    <span className="ml-1 text-sm">
                      {level === 1 ? "Low" : level === 2 ? "Medium" : "High"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tag */}
            <div className="space-y-2">
              <Label htmlFor="opportunityTag">Tag</Label>
              <Select value={opportunityTag} onValueChange={setOpportunityTag}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4" />

            {/* Next Action */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextAction">Next Action</Label>
                <Input
                  id="nextAction"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Prepare case study"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextActionDate">Due Date</Label>
                <Input
                  id="nextActionDate"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Maria Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactLinkedin">Contact LinkedIn</Label>
                <Input
                  id="contactLinkedin"
                  value={contactLinkedin}
                  onChange={(e) => setContactLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes about this opportunity..."
                rows={3}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && (
                <div className="flex gap-2 sm:mr-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete opportunity?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the opportunity at {opportunity?.company_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className={`gap-1 ${isFrozen ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 hover:bg-sky-200 dark:hover:bg-sky-800" : ""}`}
                    onClick={handleToggleFrozen}
                    disabled={isFreezing}
                  >
                    <Snowflake className={`h-4 w-4 ${isFrozen ? "text-sky-500" : ""}`} />
                    {isFreezing ? "..." : isFrozen ? "Unfreeze" : "Freeze"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="gap-1"
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                  >
                    <Copy className="h-4 w-4" />
                    {isDuplicating ? "Duplicating..." : "Duplicate"}
                  </Button>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Coach Modal */}
      {opportunity && (
        <AICoach
          open={showAICoach}
          onOpenChange={setShowAICoach}
          opportunity={opportunity}
          profile={profile || null}
        />
      )}
    </>
  );
};
