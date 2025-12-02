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
} from "@dnd-kit/sortable";
import { Trash2 } from "lucide-react";
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
  isTrash?: boolean;
}

const COLUMNS: KanbanColumn[] = [
  { id: "researching", title: "Pesquisando", color: "bg-muted-foreground" },
  { id: "applied", title: "Candidatado", color: "bg-status-applied" },
  { id: "interviewing", title: "Entrevistando", color: "bg-status-interviewing" },
  { id: "offer", title: "Oferta", color: "bg-status-offer" },
  { id: "trash", title: "Lixeira", color: "bg-destructive", isTrash: true },
];

interface KanbanBoardProps {
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  onUpdate: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onUpdateRole?: (id: string, role: string) => void;
  allTags?: string[];
}

export const KanbanBoard = ({ 
  opportunities, 
  onOpportunityClick, 
  onUpdate,
  onDelete,
  onDuplicate,
  onUpdateTags,
  onUpdateRole,
  allTags
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
    return opportunities.filter(o => o.status === status);
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
      }
    }

    if (targetColumnId && opportunity.status !== targetColumnId) {
      // Update status in database
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          status: targetColumnId as OpportunityStatus,
          applied_at: targetColumnId === "applied" ? new Date().toISOString() : opportunity.applied_at
        })
        .eq("id", opportunityId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const targetColumnTitle = COLUMNS.find(c => c.id === targetColumnId)?.title;
        toast({
          title: "Status atualizado",
          description: `Movido para ${targetColumnTitle}`,
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
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Oportunidade excluída",
        description: `${pendingTrashOpportunity.company_name} foi removida.`,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                allTags={allTags}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeOpportunity ? (
            <div className="opacity-80">
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
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a oportunidade em <strong>{pendingTrashOpportunity?.company_name}</strong> ({pendingTrashOpportunity?.role_title})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Excluir
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
  allTags?: string[];
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
  allTags
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Trash column styling with enhanced animation
  if (column.isTrash) {
    return (
      <div 
        ref={setNodeRef}
        className={`bg-background rounded-xl border-2 border-dashed p-4 min-h-[300px] transition-all duration-300 ${
          isOver 
            ? "border-destructive bg-destructive/20 scale-105 shadow-lg shadow-destructive/20" 
            : isDragging 
              ? "border-destructive/50 bg-destructive/5 animate-pulse" 
              : "border-border"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className={`h-5 w-5 transition-all duration-300 ${
            isOver ? "text-destructive scale-125 animate-bounce" : "text-muted-foreground"
          }`} />
          <h3 className={`font-medium transition-colors duration-300 ${isOver ? "text-destructive" : ""}`}>
            {column.title}
          </h3>
        </div>
        <div className={`flex flex-col items-center justify-center py-8 text-sm transition-all duration-300 ${
          isOver ? "text-destructive scale-110" : "text-muted-foreground"
        }`}>
          <Trash2 className={`h-12 w-12 mb-2 transition-all duration-300 ${
            isOver ? "text-destructive animate-bounce" : "text-muted-foreground/30"
          }`} />
          <p className="font-medium">
            {isOver ? "Solte para excluir!" : "Arraste para excluir"}
          </p>
          {isOver && (
            <p className="text-xs mt-1 animate-pulse">
              ⚠️ Você precisará confirmar a exclusão
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`bg-background rounded-xl border border-border p-4 min-h-[300px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${column.color}`} />
        <h3 className="font-medium">{column.title}</h3>
        <span className="text-muted-foreground text-sm ml-auto">
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
            <div className={`text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-colors ${
              isOver ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <p>Nenhuma oportunidade</p>
              <p className="text-xs mt-1">Arraste cards para cá</p>
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onClick={() => onOpportunityClick(opportunity)}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onUpdateTags={onUpdateTags}
                onUpdateRole={onUpdateRole}
                allTags={allTags}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};
