import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, Star, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Opportunity } from "./OpportunityModal";
import { formatDistanceToNow, isToday, isPast, parseISO } from "date-fns";

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

const WORK_MODEL_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" };
const ARCHIVED_STATUS_LABELS: Record<string, string> = { rejected: "Rejected", ghosted: "Ghosted", withdrawn: "Withdrawn" };

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  showArchivedBadge?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

export const OpportunityCard = ({ 
  opportunity, 
  onClick, 
  showArchivedBadge = false, 
  isSelected = false, 
  onSelect, 
  selectionMode = false 
}: OpportunityCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const statusColor = STATUS_COLORS[opportunity.status || "researching"] || "#9ca3af";

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

  const tagKey = opportunity.opportunity_tag;
  const tagConfig = tagKey ? TAG_CONFIG[tagKey] : null;
  const updatedText = getUpdatedTimeText();
  const actionIsDue = isNextActionDue();
  const hasFooter = updatedText || opportunity.next_action;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        relative bg-card rounded-lg overflow-hidden cursor-grab active:cursor-grabbing 
        transition-all duration-200 group
        ${isDragging ? "opacity-60 shadow-xl scale-[1.02]" : "shadow-sm hover:shadow-md hover:-translate-y-0.5"} 
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      {/* Status color indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: statusColor }} 
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
            {/* Header: Company name + Fit stars */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
                {opportunity.company_name}
              </h4>
              <FitIndicator />
            </div>
            
            {/* Role title */}
            <p className="text-sm text-muted-foreground truncate leading-tight">
              {opportunity.role_title}
            </p>
            
            {/* Location + Work model */}
            {(opportunity.location || opportunity.work_model) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {opportunity.location}
                  {opportunity.location && opportunity.work_model && " · "}
                  {opportunity.work_model && WORK_MODEL_LABELS[opportunity.work_model]}
                </span>
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
            
            {/* Tag badge */}
            {tagConfig && (
              <Badge 
                className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 ${tagConfig.bg} ${tagConfig.text}`}
              >
                <span className="mr-0.5">{tagConfig.icon}</span>
                {tagConfig.label}
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
          </div>
        </div>
      </div>
    </div>
  );
};
