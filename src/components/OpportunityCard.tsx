import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase, Calendar, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "./OpportunityModal";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
}

const FLAG_MAP: Record<string, { flag: string; name: string }> = {
  brazil: { flag: flagBR, name: "Brasil" },
  brasil: { flag: flagBR, name: "Brasil" },
  portugal: { flag: flagPT, name: "Portugal" },
  germany: { flag: flagDE, name: "Alemanha" },
  alemanha: { flag: flagDE, name: "Alemanha" },
  spain: { flag: flagES, name: "Espanha" },
  espanha: { flag: flagES, name: "Espanha" },
  ireland: { flag: flagIE, name: "Irlanda" },
  irlanda: { flag: flagIE, name: "Irlanda" },
  netherlands: { flag: flagNL, name: "Holanda" },
  holanda: { flag: flagNL, name: "Holanda" },
};

const getCountryFlag = (location: string | null) => {
  if (!location) return null;
  const lowerLocation = location.toLowerCase();
  for (const [key, value] of Object.entries(FLAG_MAP)) {
    if (lowerLocation.includes(key)) {
      return value;
    }
  }
  return null;
};

const WORK_MODEL_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

const SENIORITY_LABELS: Record<string, string> = {
  entry: "Entry",
  mid: "Pleno",
  senior: "Sênior",
  lead: "Lead",
  principal: "Principal",
  director: "Diretor",
  vp: "VP",
};

export const OpportunityCard = ({ opportunity, onClick }: OpportunityCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{opportunity.company_name}</h4>
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{opportunity.role_title}</span>
              </div>
            </div>
            
            {opportunity.job_url && (
              <a 
                href={opportunity.job_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {opportunity.seniority_level && (
              <Badge variant="secondary" className="text-xs">
                {SENIORITY_LABELS[opportunity.seniority_level] || opportunity.seniority_level}
              </Badge>
            )}
            {opportunity.work_model && (
              <Badge variant="outline" className="text-xs">
                {WORK_MODEL_LABELS[opportunity.work_model] || opportunity.work_model}
              </Badge>
            )}
          </div>

          {(opportunity.location || opportunity.next_action_date) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {opportunity.location && (
                <div className="flex items-center gap-1">
                  {(() => {
                    const countryInfo = getCountryFlag(opportunity.location);
                    return countryInfo ? (
                      <img 
                        src={countryInfo.flag} 
                        alt={countryInfo.name} 
                        className="w-4 h-3 object-cover rounded-sm"
                      />
                    ) : null;
                  })()}
                  <span className="truncate max-w-20">{opportunity.location}</span>
                </div>
              )}
              {opportunity.next_action_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(opportunity.next_action_date).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
            </div>
          )}

          {opportunity.match_score && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${opportunity.match_score}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-primary">{opportunity.match_score}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
