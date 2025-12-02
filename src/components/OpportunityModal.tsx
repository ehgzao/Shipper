import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OpportunityStatus = Database["public"]["Enums"]["opportunity_status"];
type SeniorityLevel = Database["public"]["Enums"]["seniority_level"];
type WorkModel = Database["public"]["Enums"]["work_model"];

export interface Opportunity {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  status: OpportunityStatus | null;
  job_url: string | null;
  location: string | null;
  work_model: WorkModel | null;
  seniority_level: SeniorityLevel | null;
  salary_range: string | null;
  contact_name: string | null;
  contact_linkedin: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  match_score: number | null;
  created_at: string | null;
  updated_at: string | null;
  applied_at: string | null;
}

interface OpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity | null;
  userId: string;
  onSaved: () => void;
  onDeleted?: () => void;
}

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
  { value: "director", label: "Diretor" },
  { value: "vp", label: "VP" },
];

const WORK_MODEL_OPTIONS: { value: WorkModel; label: string }[] = [
  { value: "remote", label: "Remoto" },
  { value: "hybrid", label: "Híbrido" },
  { value: "onsite", label: "Presencial" },
];

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "researching", label: "Pesquisando" },
  { value: "applied", label: "Candidatado" },
  { value: "interviewing", label: "Entrevistando" },
  { value: "offer", label: "Oferta" },
  { value: "rejected", label: "Rejeitado" },
  { value: "ghosted", label: "Ghosted" },
  { value: "withdrawn", label: "Desistiu" },
];

export const OpportunityModal = ({ 
  open, 
  onOpenChange, 
  opportunity, 
  userId, 
  onSaved,
  onDeleted 
}: OpportunityModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [status, setStatus] = useState<OpportunityStatus>("researching");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState<WorkModel | "">("");
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel | "">("");
  const [salaryRange, setSalaryRange] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when opportunity changes
  useEffect(() => {
    if (opportunity) {
      setCompanyName(opportunity.company_name);
      setRoleTitle(opportunity.role_title);
      setStatus(opportunity.status || "researching");
      setJobUrl(opportunity.job_url || "");
      setLocation(opportunity.location || "");
      setWorkModel(opportunity.work_model || "");
      setSeniorityLevel(opportunity.seniority_level || "");
      setSalaryRange(opportunity.salary_range || "");
      setContactName(opportunity.contact_name || "");
      setContactLinkedin(opportunity.contact_linkedin || "");
      setNextAction(opportunity.next_action || "");
      setNextActionDate(opportunity.next_action_date || "");
      setNotes(opportunity.notes || "");
    } else {
      // Reset for new opportunity
      setCompanyName("");
      setRoleTitle("");
      setStatus("researching");
      setJobUrl("");
      setLocation("");
      setWorkModel("");
      setSeniorityLevel("");
      setSalaryRange("");
      setContactName("");
      setContactLinkedin("");
      setNextAction("");
      setNextActionDate("");
      setNotes("");
    }
  }, [opportunity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !roleTitle.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Empresa e cargo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const data = {
      company_name: companyName.trim(),
      role_title: roleTitle.trim(),
      status,
      job_url: jobUrl.trim() || null,
      location: location.trim() || null,
      work_model: workModel || null,
      seniority_level: seniorityLevel || null,
      salary_range: salaryRange.trim() || null,
      contact_name: contactName.trim() || null,
      contact_linkedin: contactLinkedin.trim() || null,
      next_action: nextAction.trim() || null,
      next_action_date: nextActionDate || null,
      notes: notes.trim() || null,
      user_id: userId,
    };

    let error;

    if (opportunity) {
      // Update existing
      const result = await supabase
        .from("opportunities")
        .update(data)
        .eq("id", opportunity.id);
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from("opportunities")
        .insert(data);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: opportunity ? "Oportunidade atualizada!" : "Oportunidade criada!",
        description: `${companyName} - ${roleTitle}`,
      });
      onSaved();
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", opportunity.id);

    if (error) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Oportunidade deletada",
        description: `${opportunity.company_name} foi removida.`,
      });
      onDeleted?.();
      onOpenChange(false);
    }
    setIsDeleting(false);
  };

  const isEditing = !!opportunity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Empresa *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleTitle">Cargo *</Label>
              <Input
                id="roleTitle"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Product Manager"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Link da Vaga</Label>
              <Input
                id="jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Location & Work Model */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="São Paulo, SP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workModel">Modelo</Label>
              <Select value={workModel} onValueChange={(v) => setWorkModel(v as WorkModel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniorityLevel">Senioridade</Label>
              <Select value={seniorityLevel} onValueChange={(v) => setSeniorityLevel(v as SeniorityLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary & Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salaryRange">Faixa Salarial</Label>
              <Input
                id="salaryRange"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="R$ 15.000 - R$ 20.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Nome do Contato</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Maria Silva"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactLinkedin">LinkedIn do Contato</Label>
            <Input
              id="contactLinkedin"
              value={contactLinkedin}
              onChange={(e) => setContactLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {/* Next Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nextAction">Próxima Ação</Label>
              <Input
                id="nextAction"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Enviar follow-up"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextActionDate">Data da Próxima Ação</Label>
              <Input
                id="nextActionDate"
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a oportunidade..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="gap-1 sm:mr-auto">
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar oportunidade?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar a oportunidade em {opportunity?.company_name}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? "Deletando..." : "Deletar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
