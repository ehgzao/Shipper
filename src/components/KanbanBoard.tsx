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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OpportunityCard } from "./OpportunityCard";
import type { Opportunity } from "./OpportunityModal";
import type { Database } from "@/integrations/supabase/types";

type OpportunityStatus = Database["public"]["Enums"]["opportunity_status"];

interface KanbanColumn {
  id: OpportunityStatus;
  title: string;
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: "researching", title: "Pesquisando", color: "bg-muted-foreground" },
  { id: "applied", title: "Candidatado", color: "bg-status-applied" },
  { id: "interviewing", title: "Entrevistando", color: "bg-status-interviewing" },
  { id: "offer", title: "Oferta", color: "bg-status-offer" },
];

interface KanbanBoardProps {
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
  onUpdate: () => void;
}

export const KanbanBoard = ({ opportunities, onOpportunityClick, onUpdate }: KanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getOpportunitiesByStatus = (status: OpportunityStatus) => {
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

    // Check if dropped on a column
    const targetColumn = COLUMNS.find(col => col.id === overId);
    
    if (targetColumn) {
      const opportunity = opportunities.find(o => o.id === opportunityId);
      if (opportunity && opportunity.status !== targetColumn.id) {
        // Update status in database
        const { error } = await supabase
          .from("opportunities")
          .update({ 
            status: targetColumn.id,
            applied_at: targetColumn.id === "applied" ? new Date().toISOString() : opportunity.applied_at
          })
          .eq("id", opportunityId);

        if (error) {
          toast({
            title: "Erro ao atualizar",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Status atualizado",
            description: `Movido para ${targetColumn.title}`,
          });
          onUpdate();
        }
      }
    }
  };

  const activeOpportunity = activeId 
    ? opportunities.find(o => o.id === activeId) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnOpportunities = getOpportunitiesByStatus(column.id);
          
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              opportunities={columnOpportunities}
              onOpportunityClick={onOpportunityClick}
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
  );
};

interface KanbanColumnProps {
  column: KanbanColumn;
  opportunities: Opportunity[];
  onOpportunityClick: (opportunity: Opportunity) => void;
}

const KanbanColumn = ({ column, opportunities, onOpportunityClick }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

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
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};
