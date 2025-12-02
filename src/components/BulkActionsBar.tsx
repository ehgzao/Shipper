import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, MoveRight, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OpportunityStatus = Database["public"]["Enums"]["opportunity_status"];

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMoveToStatus: (status: OpportunityStatus) => void;
  onDeleteSelected: () => void;
}

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "technical_test", label: "Technical Test" },
  { value: "final_interview", label: "Final Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onMoveToStatus,
  onDeleteSelected,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <MoveRight className="h-4 w-4 text-muted-foreground" />
        <Select onValueChange={(value) => onMoveToStatus(value as OpportunityStatus)}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Move to..." />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteSelected}
        className="h-8"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    </div>
  );
};
