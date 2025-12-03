import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Trash2, ChevronRight, ChevronDown, Archive } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OpportunityCard } from "./OpportunityCard";
import type { Opportunity } from "./OpportunityModal";
import type { Database } from "@/integrations/supabase/types";
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

type OpportunityStatus = Database["public"]["Enums"]["opportunity_status"];

interface KanbanColumn {
  id: OpportunityStatus | "trash";
  title: string;
  color: string;
  borderColor: string;
  isTrash?: boolean;
  dragHint?: string;
}

const ACTIVE_COLUMNS: KanbanColumn[] = [
  { id: "researching", title: "Researching", color: "bg-gray-400", borderColor: "border-gray-400", dragHint: "Researching jobs? Drag cards here" },
  { id: "applied", title: "Applied", color: "bg-blue-500", borderColor: "border-blue-500", dragHint: "Applied to a job? Drag card here" },
  { id: "interviewing", title: "Interviewing", color: "bg-purple-500", borderColor: "border-purple-500", dragHint: "Scheduled an interview? Drag card here" },
  { id: "assessment", title: "Assessment", color: "bg-amber-500", borderColor: "border-amber-500", dragHint: "Have a test or case study? Drag card here" },
  { id: "offer", title: "Offer", color: "bg-green-500", borderColor: "border-green-500", dragHint: "Received an offer? Congrats! 🎉" },
];

const ARCHIVED_STATUSES: OpportunityStatus[] = ["rejected", "ghosted", "withdrawn"];

const TRASH_COLUMN: KanbanColumn = {
  id: "trash",
  title: "Trash",
  color: "bg-destructive",
  borderColor: "border-destructive",
  isTrash: true,
};

interface KanbanBoardProps {
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  onUpdate: () => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

// Forward onUpdate for card inline edits
interface KanbanColumnPropsWithUpdate extends KanbanColumnProps {
  onUpdateData?: () => void;
}

export const KanbanBoard = ({ 
  opportunities, 
  onOpportunityClick, 
  onUpdate,
  selectedIds = new Set(),
  onSelect,
  selectionMode = false
}: KanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingTrashOpportunity, setPendingTrashOpportunity] = useState<Opportunity | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const getOpportunitiesByStatus = (status: OpportunityStatus | "trash") => {
    if (status === "trash") return [];
    return opportunities
      .filter(o => o.status === status)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  };

  const archivedOpportunities = opportunities
    .filter(o => ARCHIVED_STATUSES.includes(o.status as OpportunityStatus))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const overId = over.id as string;
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    // Check if dropped on trash
    if (overId === "trash") {
      setPendingTrashOpportunity(opportunity);
      return;
    }

    // Check if dropped on a column directly
    let targetColumnId: string | null = null;
    const isActiveColumn = ACTIVE_COLUMNS.find(col => col.id === overId);
    const isArchivedDrop = overId === "archived";
    
    if (isActiveColumn) {
      targetColumnId = isActiveColumn.id;
    } else if (isArchivedDrop) {
      // Dropped on archived column - set to rejected by default
      targetColumnId = "rejected";
    } else {
      // Check if dropped on another opportunity card
      const targetOpportunity = opportunities.find(o => o.id === overId);
      if (targetOpportunity) {
        targetColumnId = targetOpportunity.status;
        
        // Handle reordering within the same column
        if (opportunity.status === targetColumnId) {
          const isArchivedStatus = ARCHIVED_STATUSES.includes(targetColumnId as OpportunityStatus);
          const columnOpportunities = isArchivedStatus 
            ? archivedOpportunities 
            : getOpportunitiesByStatus(targetColumnId as OpportunityStatus);
          
          const oldIndex = columnOpportunities.findIndex(o => o.id === opportunityId);
          const newIndex = columnOpportunities.findIndex(o => o.id === overId);
          
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(columnOpportunities, oldIndex, newIndex);
            const updates = reordered.map((opp, index) => ({
              id: opp.id,
              display_order: index,
            }));
            
            for (const update of updates) {
              await supabase
                .from("opportunities")
                .update({ display_order: update.display_order })
                .eq("id", update.id);
            }
            
            onUpdate();
            return;
          }
        }
      }
    }

    if (targetColumnId && opportunity.status !== targetColumnId) {
      const isArchivedTarget = ARCHIVED_STATUSES.includes(targetColumnId as OpportunityStatus);
      const targetColumnOpps = isArchivedTarget 
        ? archivedOpportunities 
        : getOpportunitiesByStatus(targetColumnId as OpportunityStatus);
      
      const maxOrder = targetColumnOpps.length > 0 
        ? Math.max(...targetColumnOpps.map(o => o.display_order || 0)) + 1 
        : 0;

      // Save previous status when moving to archived
      const updateData: Record<string, unknown> = {
        status: targetColumnId as OpportunityStatus,
        applied_at: targetColumnId === "applied" ? new Date().toISOString() : opportunity.applied_at,
        updated_at: new Date().toISOString(),
        display_order: maxOrder
      };

      if (isArchivedTarget) {
        updateData.previous_status = opportunity.status;
      }

      const { error } = await supabase
        .from("opportunities")
        .update(updateData)
        .eq("id", opportunityId);

      if (error) {
        toast({
          title: "Error updating",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const targetColumnTitle = ACTIVE_COLUMNS.find(c => c.id === targetColumnId)?.title || targetColumnId;
        
        if (targetColumnId === "offer") {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']
          });
          confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
        }
        
        toast({
          title: targetColumnId === "offer" ? "🎉 Congratulations!" : "Status updated",
          description: targetColumnId === "offer" 
            ? `You received an offer from ${opportunity.company_name}!`
            : `Moved to ${targetColumnTitle}`,
        });
        onUpdate();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingTrashOpportunity) return;

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", pendingTrashOpportunity.id);

    if (error) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity deleted",
        description: `${pendingTrashOpportunity.company_name} was removed.`,
      });
      onUpdate();
    }
    setPendingTrashOpportunity(null);
  };

  const handleRestore = async (opportunityId: string) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    const restoreStatus = (opportunity?.previous_status as OpportunityStatus) || "researching";
    
    const { error } = await supabase
      .from("opportunities")
      .update({ 
        status: restoreStatus,
        updated_at: new Date().toISOString(),
        previous_status: null
      })
      .eq("id", opportunityId);

    if (error) {
      toast({
        title: "Error restoring",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity restored",
        description: `Moved back to ${restoreStatus}`,
      });
      onUpdate();
    }
  };

  const activeOpportunity = activeId ? opportunities.find(o => o.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Active Columns */}
          {ACTIVE_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              opportunities={getOpportunitiesByStatus(column.id)}
              onOpportunityClick={onOpportunityClick}
              isDragging={!!activeId}
              selectedIds={selectedIds}
              onSelect={onSelect}
              selectionMode={selectionMode}
              onUpdateData={onUpdate}
            />
          ))}
          
          {/* Trash Column */}
          <TrashColumn isDragging={!!activeId} />
        </div>

        {/* Archived Section */}
        <ArchivedSection
          opportunities={archivedOpportunities}
          expanded={archivedExpanded}
          onToggle={() => setArchivedExpanded(!archivedExpanded)}
          onOpportunityClick={onOpportunityClick}
          onRestore={handleRestore}
          isDragging={!!activeId}
          selectedIds={selectedIds}
          onSelect={onSelect}
          selectionMode={selectionMode}
        />

        <DragOverlay>
          {activeOpportunity ? (
            <div className="opacity-90 rotate-2 scale-105 shadow-2xl">
              <OpportunityCard opportunity={activeOpportunity} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Trash Confirmation Dialog */}
      <AlertDialog open={!!pendingTrashOpportunity} onOpenChange={(open) => !open && setPendingTrashOpportunity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the opportunity at <strong>{pendingTrashOpportunity?.company_name}</strong> ({pendingTrashOpportunity?.role_title})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Trash Column Component
const TrashColumn = ({ isDragging }: { isDragging: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-background rounded-xl border-2 border-dashed p-4 min-h-[200px] md:min-h-[300px] transition-all duration-200 ${
        isOver 
          ? "border-destructive bg-destructive/10 scale-[1.02] shadow-lg" 
          : isDragging 
            ? "border-destructive/60 bg-destructive/5" 
            : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Trash2 className={`h-5 w-5 transition-colors ${isOver ? "text-destructive" : "text-muted-foreground"}`} />
        <h3 className={`font-medium transition-colors ${isOver ? "text-destructive" : ""}`}>Trash</h3>
      </div>
      <div className={`flex flex-col items-center justify-center py-4 md:py-8 text-sm transition-colors ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
        <Trash2 className={`h-8 w-8 md:h-12 md:w-12 mb-2 transition-colors ${isOver ? "text-destructive" : "text-muted-foreground/30"}`} />
        <p className="font-medium">{isOver ? "Drop to delete!" : "Drag to delete"}</p>
        {isOver && <p className="text-xs mt-1">⚠️ You'll need to confirm</p>}
      </div>
    </div>
  );
};

// Archived Section Component
interface ArchivedSectionProps {
  opportunities: Opportunity[];
  expanded: boolean;
  onToggle: () => void;
  onOpportunityClick: (opportunity: Opportunity) => void;
  onRestore: (opportunityId: string) => void;
  isDragging: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const ArchivedSection = ({ 
  opportunities, 
  expanded, 
  onToggle, 
  onOpportunityClick, 
  onRestore,
  isDragging,
  selectedIds = new Set(),
  onSelect,
  selectionMode = false
}: ArchivedSectionProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { setNodeRef, isOver } = useDroppable({ id: "archived" });

  const filteredOpportunities = statusFilter === "all" 
    ? opportunities 
    : opportunities.filter(o => o.status === statusFilter);

  const statusCounts = {
    rejected: opportunities.filter(o => o.status === "rejected").length,
    ghosted: opportunities.filter(o => o.status === "ghosted").length,
    withdrawn: opportunities.filter(o => o.status === "withdrawn").length,
  };

  if (opportunities.length === 0 && !isDragging) return null;

  return (
    <div 
      ref={setNodeRef}
      className={`mt-4 bg-background rounded-xl border-2 transition-all duration-200 ${
        isOver ? "border-gray-400 bg-gray-50 dark:bg-gray-900/50" : "border-border"
      }`}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 rounded-t-xl transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Archive className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Archived</span>
        <span className="text-muted-foreground text-xs ml-1">({opportunities.length})</span>
        {isDragging && !expanded && (
          <span className="text-xs text-muted-foreground ml-auto">
            Drop here to archive
          </span>
        )}
      </button>

      {/* Content - collapsed/expanded */}
      {expanded && (
        <div className="p-3 pt-0">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
            <button
              onClick={(e) => { e.stopPropagation(); setStatusFilter("all"); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              All ({opportunities.length})
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setStatusFilter("rejected"); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                statusFilter === "rejected"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              Rejected ({statusCounts.rejected})
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setStatusFilter("ghosted"); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                statusFilter === "ghosted"
                  ? "bg-gray-500 text-white border-gray-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              Ghosted ({statusCounts.ghosted})
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setStatusFilter("withdrawn"); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                statusFilter === "withdrawn"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              Withdrawn ({statusCounts.withdrawn})
            </button>
          </div>

          <SortableContext
            items={filteredOpportunities.map(o => o.id)}
            strategy={verticalListSortingStrategy}
            id="archived"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {filteredOpportunities.map((opportunity, index) => (
                <div 
                  key={opportunity.id}
                  className="animate-fade-in relative group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <OpportunityCard
                    opportunity={opportunity}
                    onClick={() => onOpportunityClick(opportunity)}
                    showArchivedBadge={true}
                    isSelected={selectedIds.has(opportunity.id)}
                    onSelect={onSelect}
                    selectionMode={selectionMode}
                  />
                  {/* Restore button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(opportunity.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md shadow-sm hover:bg-primary/90"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </SortableContext>
          
          {filteredOpportunities.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No {statusFilter !== "all" ? statusFilter : "archived"} opportunities
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Kanban Column Component
interface KanbanColumnProps {
  column: KanbanColumn;
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  isDragging: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
  onUpdateData?: () => void;
}

const KanbanColumn = ({ 
  column, 
  opportunities, 
  onOpportunityClick, 
  isDragging,
  selectedIds = new Set(),
  onSelect,
  selectionMode = false,
  onUpdateData
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-background rounded-xl border-2 p-3 min-h-[300px] transition-all duration-200 ${
        isOver 
          ? `${column.borderColor} scale-[1.02] shadow-lg` 
          : isDragging
            ? `${column.borderColor}`
            : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${column.color}`} />
        <h3 className="font-medium text-sm">{column.title}</h3>
        <span className="text-muted-foreground text-xs ml-auto">
          {opportunities.length}
        </span>
      </div>

      <SortableContext
        items={opportunities.map(o => o.id)}
        strategy={verticalListSortingStrategy}
        id={column.id}
      >
        <div className="space-y-2 min-h-[200px]">
          {opportunities.length === 0 ? (
            <div className={`text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-lg transition-all ${
              isOver ? `${column.borderColor}` : "border-border"
            }`}>
              <p className="font-medium">{isOver ? "Drop here!" : "No opportunities"}</p>
              <p className="mt-1 px-2">{isDragging && column.dragHint ? column.dragHint : "Drag cards here"}</p>
            </div>
          ) : (
            opportunities.map((opportunity, index) => (
              <div 
                key={opportunity.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <OpportunityCard
                  opportunity={opportunity}
                  onClick={() => onOpportunityClick(opportunity)}
                  isSelected={selectedIds.has(opportunity.id)}
                  onSelect={onSelect}
                  selectionMode={selectionMode}
                  onUpdate={onUpdateData}
                />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};
