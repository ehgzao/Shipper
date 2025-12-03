import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Check, Filter, X } from "lucide-react";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

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

const FLAG_IMAGES: Record<string, string> = {
  BR: flagBR,
  PT: flagPT,
  DE: flagDE,
  ES: flagES,
  IE: flagIE,
  NL: flagNL,
};

const countryMap: Record<string, { name: string; code: string }> = {
  portugal: { name: "Portugal", code: "PT" },
  brazil: { name: "Brazil", code: "BR" },
  germany: { name: "Germany", code: "DE" },
  spain: { name: "Spain", code: "ES" },
  ireland: { name: "Ireland", code: "IE" },
  netherlands: { name: "Netherlands", code: "NL" },
};

export const PresetCompaniesView = ({ userId, existingCompanyNames, onCompanyAdded }: PresetCompaniesViewProps) => {
  const [presetCompanies, setPresetCompanies] = useState<PresetCompany[]>([]);
  const [addingCompanies, setAddingCompanies] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const { toast } = useToast();

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

  // Get unique countries and types for filters
  const countries = useMemo(() => {
    return [...new Set(presetCompanies.map(c => c.country))];
  }, [presetCompanies]);

  const companyTypes = useMemo(() => {
    return [...new Set(presetCompanies.map(c => c.company_type).filter(Boolean))];
  }, [presetCompanies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return presetCompanies.filter(c => {
      if (selectedCountry && c.country !== selectedCountry) return false;
      if (selectedType && c.company_type !== selectedType) return false;
      return true;
    });
  }, [presetCompanies, selectedCountry, selectedType]);

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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Company added!",
        description: `${company.company_name} was added to your target companies.`,
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

  const groupedCompanies = filteredCompanies.reduce((acc, company) => {
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
        <h3 className="font-semibold text-lg mb-2">Empty database</h3>
        <p className="text-muted-foreground text-sm">
          No preset companies available.
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {showBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 relative">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-2 right-2 p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <p className="text-sm text-muted-foreground pr-6">
            Explore our curated company database and add them to your target companies to track opportunities.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        
        {/* Country filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCountry(null)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
              selectedCountry === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            All countries
          </button>
          {countries.map((country) => {
            const info = countryMap[country];
            const code = info?.code || country.toUpperCase().slice(0, 2);
            return (
              <button
                key={country}
                onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                  selectedCountry === country
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {FLAG_IMAGES[code] && (
                  <img src={FLAG_IMAGES[code]} alt={info?.name || country} className="w-4 h-3 object-cover rounded-sm" />
                )}
                {info?.name || country}
              </button>
            );
          })}
        </div>

        {/* Type filter - using fixed labels matching onboarding */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              selectedType === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            All types
          </button>
          {(["tech_giant", "scaleup", "startup"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {type === "tech_giant" ? "Tech Giants" : type === "scaleup" ? "Scaleups" : "Startups"}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedCompanies).map(([country, countryCompanies]) => {
        const info = countryMap[country];
        const code = info?.code || country.toUpperCase().slice(0, 2);
        return (
          <div key={country} className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                {FLAG_IMAGES[code] && (
                  <img src={FLAG_IMAGES[code]} alt={info?.name || country} className="w-5 h-3.5 object-cover rounded-sm" />
                )}
                {info?.name || country}
                <span className="text-muted-foreground font-normal">
                  ({countryCompanies.length} companies)
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
                            View Jobs
                          </a>
                        </Button>
                      )}
                      {isAlreadyAdded ? (
                        <Button size="sm" variant="secondary" disabled className="gap-1">
                          <Check className="h-4 w-4" />
                          Added
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleAddCompany(company)}
                          disabled={isAdding}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {isAdding ? "Adding..." : "Add"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
