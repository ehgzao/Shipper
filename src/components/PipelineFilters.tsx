import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

const FLAG_IMAGES: Record<string, string> = {
  brazil: flagBR,
  brasil: flagBR,
  portugal: flagPT,
  germany: flagDE,
  alemanha: flagDE,
  spain: flagES,
  espanha: flagES,
  ireland: flagIE,
  irlanda: flagIE,
  netherlands: flagNL,
  holanda: flagNL,
};

const COUNTRY_MAP: Record<string, { name: string; code: string }> = {
  brazil: { name: "Brazil", code: "BR" },
  brasil: { name: "Brazil", code: "BR" },
  portugal: { name: "Portugal", code: "PT" },
  germany: { name: "Germany", code: "DE" },
  alemanha: { name: "Germany", code: "DE" },
  spain: { name: "Spain", code: "ES" },
  espanha: { name: "Spain", code: "ES" },
  ireland: { name: "Ireland", code: "IE" },
  irlanda: { name: "Ireland", code: "IE" },
  netherlands: { name: "Netherlands", code: "NL" },
  holanda: { name: "Netherlands", code: "NL" },
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  tech_giant: "Tech Giants",
  scaleup: "Scaleups",
  startup: "Startups",
};

interface PipelineFiltersProps {
  companies: string[];
  tags: string[];
  countries: string[];
  companyTypes?: string[];
  filters: {
    seniority: string;
    workModel: string;
    company: string;
    tag: string;
    country: string;
    companyType: string;
  };
  onFiltersChange: (filters: { seniority: string; workModel: string; company: string; tag: string; country: string; companyType: string }) => void;
}

export const PipelineFilters = ({ countries, companyTypes = [], filters, onFiltersChange }: PipelineFiltersProps) => {
  const hasFilters = filters.country !== "all" || filters.companyType !== "all";

  const clearFilters = () => {
    onFiltersChange({ seniority: "all", workModel: "all", company: "all", tag: "all", country: "all", companyType: "all" });
  };

  const getCountryFlag = (country: string) => {
    const lowerCountry = country.toLowerCase();
    for (const [key, flag] of Object.entries(FLAG_IMAGES)) {
      if (lowerCountry.includes(key) || key.includes(lowerCountry)) {
        return flag;
      }
    }
    return null;
  };

  const getCountryName = (country: string) => {
    const lowerCountry = country.toLowerCase();
    return COUNTRY_MAP[lowerCountry]?.name || country.charAt(0).toUpperCase() + country.slice(1);
  };

  // Deduplicate countries by normalized name
  const uniqueCountries = [...new Set(countries.map(c => {
    const lowerC = c.toLowerCase();
    return COUNTRY_MAP[lowerC]?.name || c;
  }))];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filters:
      </div>

      {/* Country filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFiltersChange({ ...filters, country: "all" })}
          className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
            filters.country === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          All countries
        </button>
        {uniqueCountries.map((countryName) => {
          // Find original country value to use for filter
          const originalCountry = countries.find(c => getCountryName(c) === countryName) || countryName;
          const flag = getCountryFlag(countryName);
          return (
            <button
              key={countryName}
              onClick={() => onFiltersChange({ 
                ...filters, 
                country: filters.country === originalCountry.toLowerCase() ? "all" : originalCountry.toLowerCase() 
              })}
              className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                filters.country === originalCountry.toLowerCase()
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {flag && (
                <img src={flag} alt={countryName} className="w-4 h-3 object-cover rounded-sm" />
              )}
              {countryName}
            </button>
          );
        })}
      </div>

      {/* Company type filter */}
      {companyTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, companyType: "all" })}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filters.companyType === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            All types
          </button>
          {(["tech_giant", "scaleup", "startup"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFiltersChange({ 
                ...filters, 
                companyType: filters.companyType === type ? "all" : type 
              })}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filters.companyType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {COMPANY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
};
