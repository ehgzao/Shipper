import { useEffect, useState } from "react";
import { AlertTriangle, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";
import type { Opportunity } from "./OpportunityModal";

interface StaleNotificationsProps {
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
}

interface StaleOpportunity {
  opportunity: Opportunity;
  daysStale: number;
  stageName: string;
}

const STAGE_THRESHOLDS: Record<string, number> = {
  researching: 7,
  applied: 14,
  interviewing: 10,
};

const STAGE_NAMES: Record<string, string> = {
  researching: "Researching",
  applied: "Applied",
  interviewing: "Interviewing",
};

export const StaleNotifications = ({ opportunities, onOpportunityClick }: StaleNotificationsProps) => {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [staleOpportunities, setStaleOpportunities] = useState<StaleOpportunity[]>([]);

  useEffect(() => {
    const now = new Date();
    const stale: StaleOpportunity[] = [];

    opportunities.forEach(opp => {
      if (!opp.status || !STAGE_THRESHOLDS[opp.status]) return;
      
      const lastUpdate = opp.updated_at ? new Date(opp.updated_at) : new Date(opp.created_at || now);
      const daysStale = differenceInDays(now, lastUpdate);
      const threshold = STAGE_THRESHOLDS[opp.status];

      if (daysStale >= threshold && !dismissed.includes(opp.id)) {
        stale.push({
          opportunity: opp,
          daysStale,
          stageName: STAGE_NAMES[opp.status] || opp.status,
        });
      }
    });

    // Sort by days stale (most stale first)
    stale.sort((a, b) => b.daysStale - a.daysStale);
    setStaleOpportunities(stale);
  }, [opportunities, dismissed]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => [...prev, id]);
  };

  const handleDismissAll = () => {
    setDismissed(staleOpportunities.map(s => s.opportunity.id));
  };

  if (staleOpportunities.length === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-medium text-sm">
            Stale opportunities ({staleOpportunities.length})
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={handleDismissAll}
        >
          Dismiss all
        </Button>
      </div>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {staleOpportunities.slice(0, 5).map(({ opportunity, daysStale, stageName }) => (
          <div 
            key={opportunity.id}
            className="flex items-center justify-between bg-background/50 rounded-lg p-3 cursor-pointer hover:bg-background transition-colors group"
            onClick={() => onOpportunityClick(opportunity)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{opportunity.company_name}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">{opportunity.role_title}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                <Clock className="h-3 w-3" />
                <span>{daysStale} days in "{stageName}"</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleDismiss(opportunity.id, e)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {staleOpportunities.length > 5 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            And {staleOpportunities.length - 5} more opportunity(ies)...
          </p>
        )}
      </div>
    </div>
  );
};