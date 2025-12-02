import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Check } from "lucide-react";

interface PresetCompany {
  id: string;
  company_name: string;
  company_type: string | null;
  country: string;
  sector: string | null;
  careers_url: string | null;
}

interface PresetCompaniesViewProps {
  userId: string;
  existingCompanyNames: string[];
  onCompanyAdded: () => void;
}

export const PresetCompaniesView = ({ userId, existingCompanyNames, onCompanyAdded }: PresetCompaniesViewProps) => {
  const [presetCompanies, setPresetCompanies] = useState<PresetCompany[]>([]);
  const [addingCompanies, setAddingCompanies] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const countryMap: Record<string, { name: string; code: string }> = {
    portugal: { name: "Portugal", code: "PT" },
    brazil: { name: "Brasil", code: "BR" },
    germany: { name: "Alemanha", code: "DE" },
    spain: { name: "Espanha", code: "ES" },
    ireland: { name: "Irlanda", code: "IE" },
    netherlands: { name: "Holanda", code: "NL" },
  };

  useEffect(() => {
    const fetchPresetCompanies = async () => {
      const { data } = await supabase
        .from("preset_companies")
        .select("*")
        .order("country", { ascending: true });

      if (data) {
        setPresetCompanies(data);
      }
    };

    fetchPresetCompanies();
  }, []);

  const handleAddCompany = async (company: PresetCompany) => {
    setAddingCompanies((prev) => new Set(prev).add(company.id));

    const { error } = await supabase.from("target_companies").insert({
      user_id: userId,
      company_name: company.company_name,
      company_type: company.company_type as "tech_giant" | "scaleup" | "startup" | null,
      country: company.country,
      sector: company.sector,
      careers_url: company.careers_url,
      is_preset: true,
    });

    setAddingCompanies((prev) => {
      const newSet = new Set(prev);
      newSet.delete(company.id);
      return newSet;
    });

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Empresa adicionada!",
        description: `${company.company_name} foi adicionada às suas empresas alvo.`,
      });
      onCompanyAdded();
    }
  };

  const getTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case "tech_giant": return "bg-badge-tech-giant/10 text-badge-tech-giant";
      case "scaleup": return "bg-badge-scaleup/10 text-badge-scaleup";
      case "startup": return "bg-badge-startup/10 text-badge-startup";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case "tech_giant": return "Tech Giant";
      case "scaleup": return "Scaleup";
      case "startup": return "Startup";
      default: return type;
    }
  };

  const groupedCompanies = presetCompanies.reduce((acc, company) => {
    if (!acc[company.country]) {
      acc[company.country] = [];
    }
    acc[company.country].push(company);
    return acc;
  }, {} as Record<string, PresetCompany[]>);

  if (presetCompanies.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Database vazia</h3>
        <p className="text-muted-foreground text-sm">
          Nenhuma empresa pré-cadastrada disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Explore nossa base de empresas curadas e adicione às suas empresas alvo para acompanhar oportunidades.
        </p>
      </div>

      {Object.entries(groupedCompanies).map(([country, countryCompanies]) => (
        <div key={country} className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {countryMap[country]?.code || country.toUpperCase().slice(0, 2)}
              </span>
              {countryMap[country]?.name || country}
              <span className="text-muted-foreground font-normal">
                ({countryCompanies.length} empresas)
              </span>
            </h3>
          </div>
          <div className="divide-y divide-border">
            {countryCompanies.map((company) => {
              const isAlreadyAdded = existingCompanyNames.includes(company.company_name);
              const isAdding = addingCompanies.has(company.id);

              return (
                <div key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{company.company_name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(company.company_type)}`}>
                        {getTypeLabel(company.company_type)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{company.sector}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {company.careers_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                      >
                        <a href={company.careers_url} target="_blank" rel="noopener noreferrer">
                          Ver Vagas
                        </a>
                      </Button>
                    )}
                    {isAlreadyAdded ? (
                      <Button size="sm" variant="secondary" disabled className="gap-1">
                        <Check className="h-4 w-4" />
                        Adicionada
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleAddCompany(company)}
                        disabled={isAdding}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? "Adicionando..." : "Adicionar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
