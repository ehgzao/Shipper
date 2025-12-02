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
import { Trash2 } from "lucide-react";
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

const COLUMNS: KanbanColumn[] = [
  { id: "researching", title: "Researching", color: "bg-muted-foreground", borderColor: "border-muted-foreground", dragHint: "Researching jobs? Drag cards here" },
  { id: "applied", title: "Applied", color: "bg-status-applied", borderColor: "border-status-applied", dragHint: "Applied to a job? Drag card here" },
  { id: "interviewing", title: "Interviewing", color: "bg-status-interviewing", borderColor: "border-status-interviewing", dragHint: "Scheduled an interview? Drag card here" },
  { id: "technical_test", title: "Technical Test", color: "bg-amber-500", borderColor: "border-amber-500", dragHint: "Received a technical test? Drag card here" },
  { id: "final_interview", title: "Final Interview", color: "bg-pink-500", borderColor: "border-pink-500", dragHint: "Advanced to final interview? Drag card here" },
  { id: "offer", title: "Offer", color: "bg-status-offer", borderColor: "border-status-offer", dragHint: "Received an offer? Congrats! Drag card here 🎉" },
  { id: "trash", title: "Trash", color: "bg-destructive", borderColor: "border-destructive", isTrash: true },
];

interface KanbanBoardProps {
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  onUpdate: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onUpdateRole?: (id: string, role: string) => void;
  onFreeze?: (id: string, frozen: boolean) => void;
  allTags?: string[];
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

export const KanbanBoard = ({ 
  opportunities, 
  onOpportunityClick, 
  onUpdate,
  onDelete,
  onDuplicate,
  onUpdateTags,
  onUpdateRole,
  onFreeze,
  allTags,
  selectedIds = new Set(),
  onSelect,
  selectionMode = false
}: KanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingTrashOpportunity, setPendingTrashOpportunity] = useState<Opportunity | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getOpportunitiesByStatus = (status: OpportunityStatus | "trash") => {
    if (status === "trash") return [];
    return opportunities
      .filter(o => o.status === status)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const overId = over.id as string;

    // Find the opportunity being dragged
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    // Check if dropped on trash
    if (overId === "trash") {
      setPendingTrashOpportunity(opportunity);
      return;
    }

    // Check if dropped on a column directly
    let targetColumnId: string | null = null;
    const targetColumn = COLUMNS.find(col => col.id === overId);
    
    if (targetColumn && !targetColumn.isTrash) {
      targetColumnId = targetColumn.id;
    } else {
      // Check if dropped on another opportunity card - find which column it belongs to
      const targetOpportunity = opportunities.find(o => o.id === overId);
      if (targetOpportunity) {
        targetColumnId = targetOpportunity.status;
        
        // Handle reordering within the same column
        if (opportunity.status === targetColumnId) {
          const columnOpportunities = getOpportunitiesByStatus(targetColumnId as OpportunityStatus);
          const oldIndex = columnOpportunities.findIndex(o => o.id === opportunityId);
          const newIndex = columnOpportunities.findIndex(o => o.id === overId);
          
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(columnOpportunities, oldIndex, newIndex);
            
            // Update display_order for all affected items
            const updates = reordered.map((opp, index) => ({
              id: opp.id,
              display_order: index,
            }));
            
            // Batch update
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
      // Get the max display_order in the target column
      const targetColumnOpps = getOpportunitiesByStatus(targetColumnId as OpportunityStatus);
      const maxOrder = targetColumnOpps.length > 0 
        ? Math.max(...targetColumnOpps.map(o => o.display_order || 0)) + 1 
        : 0;

      // Update status in database
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          status: targetColumnId as OpportunityStatus,
          applied_at: targetColumnId === "applied" ? new Date().toISOString() : opportunity.applied_at,
          updated_at: new Date().toISOString(),
          display_order: maxOrder
        })
        .eq("id", opportunityId);

      if (error) {
        toast({
          title: "Error updating",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const targetColumnTitle = COLUMNS.find(c => c.id === targetColumnId)?.title;
        
        // Trigger confetti when moved to offer
        if (targetColumnId === "offer") {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']
          });
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
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

  const activeOpportunity = activeId 
    ? opportunities.find(o => o.id === activeId) 
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {COLUMNS.map((column) => {
            const columnOpportunities = getOpportunitiesByStatus(column.id);
            
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                opportunities={columnOpportunities}
                onOpportunityClick={onOpportunityClick}
                isDragging={!!activeId}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onUpdateTags={onUpdateTags}
                onUpdateRole={onUpdateRole}
                onFreeze={onFreeze}
                allTags={allTags}
                selectedIds={selectedIds}
                onSelect={onSelect}
                selectionMode={selectionMode}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeOpportunity ? (
            <div className="opacity-90 rotate-2 scale-105 shadow-2xl">
              <OpportunityCard 
                opportunity={activeOpportunity} 
                onClick={() => {}} 
              />
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

interface KanbanColumnProps {
  column: KanbanColumn;
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  isDragging: boolean;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onUpdateRole?: (id: string, role: string) => void;
  onFreeze?: (id: string, frozen: boolean) => void;
  allTags?: string[];
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const KanbanColumn = ({ 
  column, 
  opportunities, 
  onOpportunityClick, 
  isDragging,
  onDelete,
  onDuplicate,
  onUpdateTags,
  onUpdateRole,
  onFreeze,
  allTags,
  selectedIds = new Set(),
  onSelect,
  selectionMode = false
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Trash column styling
  if (column.isTrash) {
    return (
      <div 
        ref={setNodeRef}
        className={`bg-background rounded-xl border-2 border-dashed p-4 min-h-[300px] transition-all duration-200 ${
          isOver 
            ? "border-destructive bg-destructive/10 scale-[1.02] shadow-lg" 
            : isDragging 
              ? "border-destructive/60" 
              : "border-border"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className={`h-5 w-5 transition-colors duration-200 ${
            isOver ? "text-destructive" : "text-muted-foreground"
          }`} />
          <h3 className={`font-medium transition-colors duration-200 ${isOver ? "text-destructive" : ""}`}>
            {column.title}
          </h3>
        </div>
        <div className={`flex flex-col items-center justify-center py-8 text-sm transition-colors duration-200 ${
          isOver ? "text-destructive" : "text-muted-foreground"
        }`}>
          <Trash2 className={`h-12 w-12 mb-2 transition-colors duration-200 ${
            isOver ? "text-destructive" : "text-muted-foreground/30"
          }`} />
          <p className="font-medium">
            {isOver ? "Drop to delete!" : "Drag to delete"}
          </p>
          {isOver && (
            <p className="text-xs mt-1">
              ⚠️ You'll need to confirm
            </p>
          )}
        </div>
      </div>
    );
  }

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
            <div className={`text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-lg transition-all duration-200 ${
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
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onUpdateTags={onUpdateTags}
                  onUpdateRole={onUpdateRole}
                  onFreeze={onFreeze}
                  allTags={allTags}
                  isSelected={selectedIds.has(opportunity.id)}
                  onSelect={onSelect}
                  selectionMode={selectionMode}
                />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};
