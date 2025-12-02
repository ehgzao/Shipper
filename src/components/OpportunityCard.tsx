import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, Star, ArrowRight } from "lucide-react";
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

const TAG_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  high_priority: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800", icon: "🔥" },
  referral: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", icon: "🤝" },
  dream_job: { bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800", icon: "💜" },
};

const TAG_LABELS: Record<string, string> = { high_priority: "High Priority", referral: "Referral", dream_job: "Dream Job" };
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

export const OpportunityCard = ({ opportunity, onClick, showArchivedBadge = false, isSelected = false, onSelect, selectionMode = false }: OpportunityCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opportunity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const statusColor = STATUS_COLORS[opportunity.status || "researching"] || "#9ca3af";

  const getUpdatedTimeText = () => {
    if (!opportunity.updated_at) return null;
    try {
      const date = parseISO(opportunity.updated_at);
      if (isToday(date)) return "Updated today";
      return `Updated ${formatDistanceToNow(date, { addSuffix: false })} ago`;
    } catch { return null; }
  };

  const isNextActionDue = () => {
    if (!opportunity.next_action_date) return false;
    try {
      const date = parseISO(opportunity.next_action_date);
      return isToday(date) || isPast(date);
    } catch { return false; }
  };

  const renderFitStars = () => {
    const fitLevel = opportunity.fit_level || 2;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((level) => (
          <Star key={level} className={`h-3.5 w-3.5 ${level <= fitLevel ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300 dark:text-gray-600"}`} />
        ))}
      </div>
    );
  };

  const tagKey = opportunity.opportunity_tag;
  const tagStyle = tagKey ? TAG_STYLES[tagKey] : null;
  const tagLabel = tagKey ? TAG_LABELS[tagKey] : null;
  const updatedText = getUpdatedTimeText();
  const actionIsDue = isNextActionDue();

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeft: `4px solid ${statusColor}` }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-card rounded-xl p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isDragging ? "opacity-50 shadow-xl" : "shadow-sm"} ${isSelected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start gap-2">
        {(selectionMode || isSelected) && onSelect && (
          <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(opportunity.id, !!checked)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-base text-foreground truncate">{opportunity.company_name}</h4>
            {renderFitStars()}
          </div>
          <p className="text-sm text-muted-foreground mt-1 truncate">{opportunity.role_title}</p>
          {(opportunity.location || opportunity.work_model) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {opportunity.location}{opportunity.location && opportunity.work_model && " · "}{opportunity.work_model && WORK_MODEL_LABELS[opportunity.work_model]}
              </span>
            </div>
          )}
          {showArchivedBadge && opportunity.status && ARCHIVED_STATUS_LABELS[opportunity.status] && (
            <Badge variant="outline" className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
              {ARCHIVED_STATUS_LABELS[opportunity.status]}
            </Badge>
          )}
          {tagStyle && tagLabel && (
            <Badge className={`mt-2 text-xs ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border} border`}>
              {tagStyle.icon} {tagLabel}
            </Badge>
          )}
          {(updatedText || opportunity.next_action) && <div className="border-t border-border my-3" />}
          {updatedText && <p className="text-xs text-muted-foreground">{updatedText}</p>}
          {opportunity.next_action && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${actionIsDue ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{opportunity.next_action}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
