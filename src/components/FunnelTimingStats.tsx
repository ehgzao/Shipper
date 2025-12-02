import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Clock } from "lucide-react";
import type { Opportunity } from "./OpportunityModal";
import { differenceInDays, parseISO } from "date-fns";

interface FunnelTimingStatsProps {
  opportunities: Opportunity[];
}

interface StageTransition {
  from: string;
  to: string;
  label: string;
  avgDays: number | null;
  count: number;
}

const STAGE_ORDER = ["researching", "applied", "interviewing", "offer"];

const STAGE_LABELS: Record<string, string> = {
  researching: "Pesquisando",
  applied: "Candidatado",
  interviewing: "Entrevistando",
  offer: "Oferta",
};

export const FunnelTimingStats = ({ opportunities }: FunnelTimingStatsProps) => {
  const transitions = useMemo(() => {
    const result: StageTransition[] = [];

    // Calculate Researching → Applied
    const appliedOpps = opportunities.filter(o => 
      o.status && STAGE_ORDER.indexOf(o.status) >= 1 && o.applied_at && o.created_at
    );
    
    if (appliedOpps.length > 0) {
      const days = appliedOpps.map(o => {
        const created = parseISO(o.created_at!);
        const applied = parseISO(o.applied_at!);
        return differenceInDays(applied, created);
      }).filter(d => d >= 0);
      
      result.push({
        from: "researching",
        to: "applied",
        label: `${STAGE_LABELS.researching} → ${STAGE_LABELS.applied}`,
        avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
        count: days.length,
      });
    }

    // Calculate Applied → Interviewing
    const interviewingOpps = opportunities.filter(o => 
      o.status && (o.status === "interviewing" || o.status === "offer") && o.applied_at && o.updated_at
    );
    
    if (interviewingOpps.length > 0) {
      const days = interviewingOpps.map(o => {
        const applied = parseISO(o.applied_at!);
        const updated = parseISO(o.updated_at!);
        return differenceInDays(updated, applied);
      }).filter(d => d >= 0 && d < 365); // Filter unreasonable values
      
      result.push({
        from: "applied",
        to: "interviewing",
        label: `${STAGE_LABELS.applied} → ${STAGE_LABELS.interviewing}`,
        avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
        count: days.length,
      });
    }

    // Calculate Interviewing → Offer
    const offerOpps = opportunities.filter(o => o.status === "offer" && o.updated_at);
    
    if (offerOpps.length > 0) {
      // For offers, we use the time from applied_at to offer (updated_at when status changed to offer)
      const days = offerOpps.map(o => {
        if (!o.applied_at) return null;
        const applied = parseISO(o.applied_at);
        const offer = parseISO(o.updated_at!);
        return differenceInDays(offer, applied);
      }).filter((d): d is number => d !== null && d >= 0 && d < 365);
      
      result.push({
        from: "interviewing",
        to: "offer",
        label: `${STAGE_LABELS.interviewing} → ${STAGE_LABELS.offer}`,
        avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
        count: days.length,
      });
    }

    return result;
  }, [opportunities]);

  // Calculate total pipeline time for completed opportunities
  const totalPipelineTime = useMemo(() => {
    const completedOpps = opportunities.filter(o => 
      o.status === "offer" && o.created_at && o.updated_at
    );
    
    if (completedOpps.length === 0) return null;

    const days = completedOpps.map(o => {
      const created = parseISO(o.created_at!);
      const completed = parseISO(o.updated_at!);
      return differenceInDays(completed, created);
    }).filter(d => d >= 0 && d < 365);

    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
  }, [opportunities]);

  if (transitions.length === 0 && totalPipelineTime === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Tempo entre Etapas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Dados insuficientes. Mova oportunidades pelo funil para ver estatísticas de tempo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Tempo Médio entre Etapas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transitions.map((transition, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{STAGE_LABELS[transition.from]}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{STAGE_LABELS[transition.to]}</span>
            </div>
            <div className="flex items-center gap-2">
              {transition.avgDays !== null ? (
                <>
                  <span className="font-semibold text-primary">
                    {transition.avgDays} {transition.avgDays === 1 ? "dia" : "dias"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({transition.count} {transition.count === 1 ? "opp" : "opps"})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </div>
          </div>
        ))}

        {totalPipelineTime !== null && (
          <>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tempo total até oferta</span>
                <span className="font-bold text-lg text-status-offer">
                  {totalPipelineTime} {totalPipelineTime === 1 ? "dia" : "dias"}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
