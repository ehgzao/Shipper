import type { Opportunity } from "@/components/OpportunityModal";

interface StatusCountersProps {
  opportunities: Opportunity[];
}

export const StatusCounters = ({ opportunities }: StatusCountersProps) => {
  const counts = {
    researching: opportunities.filter(o => o.status === "researching").length,
    applied: opportunities.filter(o => o.status === "applied").length,
    interviewing: opportunities.filter(o => o.status === "interviewing").length,
    offer: opportunities.filter(o => o.status === "offer").length,
  };

  const statuses = [
    { key: "researching", label: "Researching", color: "bg-muted-foreground" },
    { key: "applied", label: "Applied", color: "bg-status-applied" },
    { key: "interviewing", label: "Interviewing", color: "bg-status-interviewing" },
    { key: "offer", label: "Offer", color: "bg-status-offer" },
  ];

  return (
    <div className="flex items-center gap-4 text-sm">
      {statuses.map((status) => (
        <div key={status.key} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className="text-muted-foreground">{status.label}</span>
          <span className="font-medium">{counts[status.key as keyof typeof counts]}</span>
        </div>
      ))}
    </div>
  );
};
