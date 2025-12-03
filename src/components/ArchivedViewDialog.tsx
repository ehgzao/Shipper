import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { Opportunity } from "./OpportunityModal";

interface ArchivedViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  onRestore: (opportunityId: string) => void;
  onDelete: (opportunityId: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  ghosted: { label: "Ghosted", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  withdrawn: { label: "Withdrawn", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

export const ArchivedViewDialog = ({
  open,
  onOpenChange,
  opportunities,
  onOpportunityClick,
  onRestore,
  onDelete,
}: ArchivedViewDialogProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOpportunities = statusFilter === "all"
    ? opportunities
    : opportunities.filter(o => o.status === statusFilter);

  const statusCounts = {
    rejected: opportunities.filter(o => o.status === "rejected").length,
    ghosted: opportunities.filter(o => o.status === "ghosted").length,
    withdrawn: opportunities.filter(o => o.status === "withdrawn").length,
  };

  const getUpdatedTimeText = (updatedAt: string | null) => {
    if (!updatedAt) return null;
    try {
      return formatDistanceToNow(parseISO(updatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Archived Opportunities
            <Badge variant="secondary" className="ml-2">
              {opportunities.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            All ({opportunities.length})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === "rejected"
                ? "bg-red-500 text-white border-red-500"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Rejected ({statusCounts.rejected})
          </button>
          <button
            onClick={() => setStatusFilter("ghosted")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === "ghosted"
                ? "bg-gray-500 text-white border-gray-500"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Ghosted ({statusCounts.ghosted})
          </button>
          <button
            onClick={() => setStatusFilter("withdrawn")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === "withdrawn"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Withdrawn ({statusCounts.withdrawn})
          </button>
        </div>

        {/* Opportunities list */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No archived opportunities</p>
            </div>
          ) : (
            filteredOpportunities.map((opportunity) => {
              const statusConfig = STATUS_LABELS[opportunity.status || ""];
              const previousStatus = opportunity.previous_status || "researching";
              const updatedText = getUpdatedTimeText(opportunity.updated_at);

              return (
                <div
                  key={opportunity.id}
                  className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        onOpportunityClick(opportunity);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{opportunity.company_name}</h4>
                        {statusConfig && (
                          <Badge className={`text-[10px] px-1.5 py-0 h-5 ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{opportunity.role_title}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {updatedText && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {updatedText}
                          </span>
                        )}
                        {previousStatus && previousStatus !== opportunity.status && (
                          <span className="text-muted-foreground/70">
                            · Was in: {previousStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => onRestore(opportunity.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(opportunity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
