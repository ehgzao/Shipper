import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PipelineFiltersProps {
  companies: string[];
  filters: {
    seniority: string;
    workModel: string;
    company: string;
  };
  onFiltersChange: (filters: { seniority: string; workModel: string; company: string }) => void;
}

export const PipelineFilters = ({ companies, filters, onFiltersChange }: PipelineFiltersProps) => {
  const hasFilters = filters.seniority !== "all" || filters.workModel !== "all" || filters.company !== "all";

  const clearFilters = () => {
    onFiltersChange({ seniority: "all", workModel: "all", company: "all" });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Select
        value={filters.seniority}
        onValueChange={(value) => onFiltersChange({ ...filters, seniority: value })}
      >
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Senioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="entry">Entry</SelectItem>
          <SelectItem value="mid">Mid</SelectItem>
          <SelectItem value="senior">Senior</SelectItem>
          <SelectItem value="lead">Lead</SelectItem>
          <SelectItem value="principal">Principal</SelectItem>
          <SelectItem value="director">Director</SelectItem>
          <SelectItem value="vp">VP</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.workModel}
        onValueChange={(value) => onFiltersChange({ ...filters, workModel: value })}
      >
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="remote">Remoto</SelectItem>
          <SelectItem value="hybrid">Híbrido</SelectItem>
          <SelectItem value="onsite">Presencial</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.company}
        onValueChange={(value) => onFiltersChange({ ...filters, company: value })}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company} value={company}>
              {company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
};
