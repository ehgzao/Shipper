import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Opportunity } from "./OpportunityModal";
import { formatDistanceToNow, isToday, parseISO } from "date-fns";
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
};

const ARCHIVED_STATUS_LABELS: Record<string, string> = { rejected: "Rejected", ghosted: "Ghosted", withdrawn: "Withdrawn" };

const FLAG_IMAGES: Record<string, { flag: string; name: string }> = {
  brazil: { flag: flagBR, name: "Brazil" },
  brasil: { flag: flagBR, name: "Brazil" },
  portugal: { flag: flagPT, name: "Portugal" },
  germany: { flag: flagDE, name: "Germany" },
  alemanha: { flag: flagDE, name: "Germany" },
  spain: { flag: flagES, name: "Spain" },
  espanha: { flag: flagES, name: "Spain" },
  ireland: { flag: flagIE, name: "Ireland" },
  irlanda: { flag: flagIE, name: "Ireland" },
  netherlands: { flag: flagNL, name: "Netherlands" },
  holanda: { flag: flagNL, name: "Netherlands" },
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

  // Check if opportunity is frozen
  const isFrozen = opportunity.tags?.includes("frozen") || false;

  const getUpdatedTimeText = () => {
    if (!opportunity.updated_at) return null;
    try {
      const date = parseISO(opportunity.updated_at);
      if (isToday(date)) return "Today";
      return formatDistanceToNow(date, { addSuffix: false }) + " ago";
    } catch { return null; }
  };

  const getCountryInfo = (location: string | null) => {
    if (!location) return null;
    const lowerLocation = location.toLowerCase();
    for (const [key, info] of Object.entries(FLAG_IMAGES)) {
      if (lowerLocation.includes(key)) {
        return info;
      }
    }
    return null;
  };

  const handleFitLevelChange = async (newLevel: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    
    await supabase
      .from("opportunities")
      .update({ 
        fit_level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunity.id);
    
    setIsUpdating(false);
    onUpdate?.();
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

  const FitIndicator = () => {
    const fitLevel = opportunity.fit_level || 2;
    return (
      <div 
        className="flex items-center gap-0.5" 
        title={`Fit: ${fitLevel}/3 - Click to change`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={(e) => handleFitLevelChange(level, e)}
            disabled={isUpdating}
            className="p-0 hover:scale-110 transition-transform"
          >
            <Star 
              className={`h-3.5 w-3.5 transition-colors cursor-pointer ${
                level <= fitLevel 
                  ? "fill-amber-400 text-amber-400 hover:fill-amber-500 hover:text-amber-500" 
                  : "fill-muted text-muted hover:fill-amber-200 hover:text-amber-200"
              }`} 
            />
          </button>
        ))}
      </div>
    );
  };

  const tagKey = opportunity.opportunity_tag;
  const tagConfig = tagKey ? TAG_CONFIG[tagKey] : null;
  const updatedText = getUpdatedTimeText();
  const countryInfo = getCountryInfo(opportunity.location);

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
          ? "bg-gradient-to-br from-sky-50 via-sky-100/50 to-sky-50 dark:from-sky-950/40 dark:via-sky-900/30 dark:to-sky-950/40 border border-sky-200 dark:border-sky-800 animate-pulse-subtle" 
          : "bg-card shadow-sm hover:shadow-md"
        }
        ${isDragging ? "opacity-60 shadow-xl scale-[1.02]" : "hover:-translate-y-0.5"} 
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      {/* Ice effect overlay for frozen cards */}
      {isFrozen && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent opacity-50" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-sky-200 dark:bg-sky-700 rounded-full blur-sm opacity-60" />
          <div className="absolute -top-0.5 right-2 w-2 h-2 bg-sky-300 dark:bg-sky-600 rounded-full blur-sm opacity-50" />
          <div className="absolute top-2 -right-1 w-2.5 h-2.5 bg-sky-200 dark:bg-sky-700 rounded-full blur-sm opacity-40" />
        </div>
      )}

      {/* Status color indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: isFrozen ? "#0ea5e9" : statusColor }} 
      />
      
      <div className="pl-4 pr-3 py-3 relative">
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
            {/* Row 1: Company name */}
            <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
              {opportunity.company_name}
            </h4>
            
            {/* Row 2: Role title - clickable dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <p className="text-sm text-muted-foreground truncate leading-tight cursor-pointer hover:text-foreground transition-colors">
                  {opportunity.role_title}
                </p>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto bg-popover z-50" onClick={(e) => e.stopPropagation()}>
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
            
            {/* Row 3: Country flag + name */}
            {countryInfo && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <img 
                  src={countryInfo.flag} 
                  alt={countryInfo.name} 
                  className="w-4 h-3 object-cover rounded-sm flex-shrink-0" 
                />
                <span>{countryInfo.name}</span>
              </div>
            )}
            
            {/* Row 4: Fit stars (clickable) */}
            <FitIndicator />
            
            {/* Row 5: Tag - clickable dropdown */}
            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {tagConfig ? (
                    <Badge 
                      className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 cursor-pointer hover:opacity-80 transition-opacity ${tagConfig.bg} ${tagConfig.text}`}
                    >
                      <span className="mr-0.5">{tagConfig.icon}</span>
                      {tagConfig.label}
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 font-medium cursor-pointer hover:bg-muted border-dashed transition-colors"
                    >
                      + Tag
                    </Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
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
            </div>
            
            {/* Row 6: Last updated */}
            {updatedText && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                <span>{updatedText}</span>
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

            {/* Frozen indicator badge */}
            {isFrozen && (
              <Badge 
                className="text-[10px] px-1.5 py-0 h-5 font-medium bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-0"
              >
                🧊 Frozen
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
