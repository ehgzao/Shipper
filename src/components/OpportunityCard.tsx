import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, ArrowRight, Clock, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Opportunity } from "./OpportunityModal";
import { formatDistanceToNow, isToday, isPast, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

const STATUS_COLORS: Record<string, string> = {
  researching: "#9ca3af",
  applied: "#3b82f6",
  interviewing: "#8b5cf6",
  assessment: "#f59e0b",
  offer: "#22c55e",
  rejected: "#6b7280",
  ghosted: "#6b7280",
  withdrawn: "#6b7280",
};

const TAG_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  high_priority: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", icon: "🔥", label: "High Priority" },
  referral: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", icon: "🤝", label: "Referral" },
  dream_job: { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", icon: "💜", label: "Dream Job" },
  frozen: { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", icon: "🧊", label: "Frozen" },
};

const WORK_MODEL_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" };
const ARCHIVED_STATUS_LABELS: Record<string, string> = { rejected: "Rejected", ghosted: "Ghosted", withdrawn: "Withdrawn" };

const FLAG_IMAGES: Record<string, string> = {
  brazil: flagBR,
  brasil: flagBR,
  portugal: flagPT,
  germany: flagDE,
  alemanha: flagDE,
  spain: flagES,
  espanha: flagES,
  ireland: flagIE,
  irlanda: flagIE,
  netherlands: flagNL,
  holanda: flagNL,
};

const PM_ROLE_SUGGESTIONS = [
  "Product Manager",
  "Senior Product Manager",
  "Lead Product Manager",
  "Principal Product Manager",
  "Group Product Manager",
  "Director of Product",
  "VP of Product",
  "Head of Product",
  "Associate Product Manager",
  "Technical Product Manager",
  "Growth Product Manager",
  "Platform Product Manager",
];

const TAG_OPTIONS = [
  { value: "none", label: "None", icon: "" },
  { value: "high_priority", label: "High Priority", icon: "🔥" },
  { value: "referral", label: "Referral", icon: "🤝" },
  { value: "dream_job", label: "Dream Job", icon: "💜" },
];

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  showArchivedBadge?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
  onUpdate?: () => void;
}

export const OpportunityCard = ({ 
  opportunity, 
  onClick, 
  showArchivedBadge = false, 
  isSelected = false, 
  onSelect, 
  selectionMode = false,
  onUpdate 
}: OpportunityCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const statusColor = STATUS_COLORS[opportunity.status || "researching"] || "#9ca3af";
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if opportunity is frozen (has frozen tag in tags array or special marker)
  const isFrozen = opportunity.tags?.includes("frozen") || false;

  const getUpdatedTimeText = () => {
    if (!opportunity.updated_at) return null;
    try {
      const date = parseISO(opportunity.updated_at);
      if (isToday(date)) return "Today";
      return formatDistanceToNow(date, { addSuffix: false }) + " ago";
    } catch { return null; }
  };

  const isNextActionDue = () => {
    if (!opportunity.next_action_date) return false;
    try {
      const date = parseISO(opportunity.next_action_date);
      return isToday(date) || isPast(date);
    } catch { return false; }
  };

  const getCountryFlag = (location: string | null) => {
    if (!location) return null;
    const lowerLocation = location.toLowerCase();
    for (const [key, flag] of Object.entries(FLAG_IMAGES)) {
      if (lowerLocation.includes(key)) {
        return flag;
      }
    }
    return null;
  };

  const FitIndicator = () => {
    const fitLevel = opportunity.fit_level || 2;
    return (
      <div className="flex items-center gap-0.5" title={`Fit: ${fitLevel}/3`}>
        {[1, 2, 3].map((level) => (
          <Star 
            key={level} 
            className={`h-3 w-3 transition-colors ${
              level <= fitLevel 
                ? "fill-amber-400 text-amber-400" 
                : "fill-muted text-muted"
            }`} 
          />
        ))}
      </div>
    );
  };

  const handleTagChange = async (newTag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    
    await supabase
      .from("opportunities")
      .update({ 
        opportunity_tag: newTag === "none" ? null : newTag,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunity.id);
    
    setIsUpdating(false);
    onUpdate?.();
  };

  const handleRoleChange = async (newRole: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    
    await supabase
      .from("opportunities")
      .update({ 
        role_title: newRole,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunity.id);
    
    setIsUpdating(false);
    onUpdate?.();
  };

  const handleToggleFrozen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    
    const currentTags = opportunity.tags || [];
    const newTags = isFrozen 
      ? currentTags.filter(t => t !== "frozen")
      : [...currentTags, "frozen"];
    
    await supabase
      .from("opportunities")
      .update({ 
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunity.id);
    
    setIsUpdating(false);
    onUpdate?.();
  };

  const tagKey = opportunity.opportunity_tag;
  const tagConfig = tagKey ? TAG_CONFIG[tagKey] : null;
  const updatedText = getUpdatedTimeText();
  const actionIsDue = isNextActionDue();
  const hasFooter = updatedText || opportunity.next_action;
  const countryFlag = getCountryFlag(opportunity.location);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing 
        transition-all duration-200 group
        ${isFrozen 
          ? "bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800" 
          : "bg-card shadow-sm hover:shadow-md"
        }
        ${isDragging ? "opacity-60 shadow-xl scale-[1.02]" : "hover:-translate-y-0.5"} 
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      {/* Status color indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: isFrozen ? "#0ea5e9" : statusColor }} 
      />
      
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start gap-2">
          {/* Selection checkbox */}
          {(selectionMode || isSelected) && onSelect && (
            <div 
              className="flex-shrink-0 pt-0.5" 
              onClick={(e) => e.stopPropagation()} 
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={(checked) => onSelect(opportunity.id, !!checked)} 
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Tag badge (above company name) - clickable */}
            {tagConfig && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Badge 
                    className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 cursor-pointer hover:opacity-80 ${tagConfig.bg} ${tagConfig.text}`}
                  >
                    <span className="mr-0.5">{tagConfig.icon}</span>
                    {tagConfig.label}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                  {TAG_OPTIONS.map((tag) => (
                    <DropdownMenuItem 
                      key={tag.value} 
                      onClick={(e) => handleTagChange(tag.value, e)}
                    >
                      {tag.icon && <span className="mr-2">{tag.icon}</span>}
                      {tag.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* No tag - show clickable "Add tag" */}
            {!tagConfig && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Badge 
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-medium cursor-pointer hover:bg-muted border-dashed"
                  >
                    + Tag
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                  {TAG_OPTIONS.filter(t => t.value !== "none").map((tag) => (
                    <DropdownMenuItem 
                      key={tag.value} 
                      onClick={(e) => handleTagChange(tag.value, e)}
                    >
                      {tag.icon && <span className="mr-2">{tag.icon}</span>}
                      {tag.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Header: Company name + Country flag + Fit stars */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
                  {opportunity.company_name}
                </h4>
                {countryFlag && (
                  <img 
                    src={countryFlag} 
                    alt="Country" 
                    className="w-4 h-3 object-cover rounded-sm flex-shrink-0" 
                  />
                )}
              </div>
              <FitIndicator />
            </div>
            
            {/* Role title - clickable */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <p className="text-sm text-muted-foreground truncate leading-tight cursor-pointer hover:text-foreground transition-colors">
                  {opportunity.role_title}
                </p>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {PM_ROLE_SUGGESTIONS.map((role) => (
                  <DropdownMenuItem 
                    key={role} 
                    onClick={(e) => handleRoleChange(role, e)}
                  >
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Work model */}
            {opportunity.work_model && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                <span>{WORK_MODEL_LABELS[opportunity.work_model]}</span>
              </div>
            )}
            
            {/* Archived status badge */}
            {showArchivedBadge && opportunity.status && ARCHIVED_STATUS_LABELS[opportunity.status] && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-5 font-medium bg-muted/80"
              >
                {ARCHIVED_STATUS_LABELS[opportunity.status]}
              </Badge>
            )}
            
            {/* Footer: Updated time + Next action */}
            {hasFooter && (
              <div className="pt-2 mt-2 border-t border-border/50 space-y-1">
                {updatedText && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    <span>{updatedText}</span>
                  </div>
                )}
                {opportunity.next_action && (
                  <div 
                    className={`flex items-center gap-1 text-xs ${
                      actionIsDue 
                        ? "text-amber-600 dark:text-amber-400 font-medium" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{opportunity.next_action}</span>
                  </div>
                )}
              </div>
            )}

            {/* Frozen toggle button */}
            <div 
              className="pt-2 mt-2 border-t border-border/50"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleToggleFrozen}
                disabled={isUpdating}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-all ${
                  isFrozen 
                    ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900" 
                    : "bg-muted/50 text-muted-foreground hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-600 dark:hover:text-sky-400"
                }`}
              >
                <Snowflake className={`h-3.5 w-3.5 ${isFrozen ? "text-sky-500" : ""}`} />
                {isFrozen ? "Unfreeze" : "Freeze"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
