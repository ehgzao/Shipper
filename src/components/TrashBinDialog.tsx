import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2, MapPin, Briefcase } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { Opportunity } from "./OpportunityModal";

interface TrashBinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletedOpportunities: Opportunity[];
  onRestore: (opportunityId: string) => void;
  onPermanentDelete: (opportunityId: string) => void;
  onEmptyTrash: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  researching: { label: "Researching", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  applied: { label: "Applied", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  interviewing: { label: "Interviewing", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  assessment: { label: "Assessment", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  offer: { label: "Offer", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  ghosted: { label: "Ghosted", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  withdrawn: { label: "Withdrawn", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

export const TrashBinDialog = ({
  open,
  onOpenChange,
  deletedOpportunities,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashBinDialogProps) => {
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const getDeletedTimeText = (deletedAt: string | null) => {
    if (!deletedAt) return "Unknown";
    try {
      return formatDistanceToNow(parseISO(deletedAt), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const getDeletedDate = (deletedAt: string | null) => {
    if (!deletedAt) return null;
    try {
      return format(parseISO(deletedAt), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-muted-foreground" />
              Trash Bin
              <Badge variant="secondary" className="ml-2">
                {deletedOpportunities.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Opportunities list */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {deletedOpportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-medium">Trash is empty</p>
                <p className="text-sm mt-1">Deleted opportunities will appear here</p>
              </div>
            ) : (
              deletedOpportunities.map((opportunity) => {
                const statusConfig = STATUS_LABELS[opportunity.status || "researching"];
                const deletedDate = getDeletedDate(opportunity.deleted_at);
                const deletedTimeAgo = getDeletedTimeText(opportunity.deleted_at);

                return (
                  <div
                    key={opportunity.id}
                    className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm">{opportunity.company_name}</h4>
                          {statusConfig && (
                            <Badge className={`text-[10px] px-1.5 py-0 h-5 ${statusConfig.color}`}>
                              {statusConfig.label}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Role */}
                        <p className="text-sm text-foreground mb-2">{opportunity.role_title}</p>
                        
                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {opportunity.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {opportunity.location}
                            </span>
                          )}
                          {opportunity.work_model && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {opportunity.work_model}
                            </span>
                          )}
                        </div>

                        {/* Deleted info */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                          <Trash2 className="h-3 w-3 text-destructive/70" />
                          <span className="text-xs text-destructive/70">
                            Deleted {deletedTimeAgo}
                          </span>
                          {deletedDate && (
                            <span className="text-xs text-muted-foreground/50">
                              ({deletedDate})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => onRestore(opportunity.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setItemToDelete(opportunity.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Empty Trash button */}
          {deletedOpportunities.length > 0 && (
            <DialogFooter className="border-t pt-4">
              <Button
                variant="destructive"
                onClick={() => setShowEmptyConfirm(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Empty Trash ({deletedOpportunities.length})
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirmation */}
      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletedOpportunities.length} opportunities</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onEmptyTrash();
                setShowEmptyConfirm(false);
              }}
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Item Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This opportunity will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (itemToDelete) onPermanentDelete(itemToDelete);
                setItemToDelete(null);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
