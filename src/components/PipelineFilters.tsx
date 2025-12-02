import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Tag, MapPin } from "lucide-react";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  brazil: { name: "Brazil", flag: flagBR },
  brasil: { name: "Brazil", flag: flagBR },
  portugal: { name: "Portugal", flag: flagPT },
  germany: { name: "Germany", flag: flagDE },
  alemanha: { name: "Germany", flag: flagDE },
  spain: { name: "Spain", flag: flagES },
  espanha: { name: "Spain", flag: flagES },
  ireland: { name: "Ireland", flag: flagIE },
  irlanda: { name: "Ireland", flag: flagIE },
  netherlands: { name: "Netherlands", flag: flagNL },
  holanda: { name: "Netherlands", flag: flagNL },
};

interface PipelineFiltersProps {
  companies: string[];
  tags: string[];
  countries: string[];
  filters: {
    seniority: string;
    workModel: string;
    company: string;
    tag: string;
    country: string;
  };
  onFiltersChange: (filters: { seniority: string; workModel: string; company: string; tag: string; country: string }) => void;
}

export const PipelineFilters = ({ companies, tags, countries, filters, onFiltersChange }: PipelineFiltersProps) => {
  const hasFilters = filters.seniority !== "all" || filters.workModel !== "all" || filters.company !== "all" || filters.tag !== "all" || filters.country !== "all";

  const clearFilters = () => {
    onFiltersChange({ seniority: "all", workModel: "all", company: "all", tag: "all", country: "all" });
  };

  const getCountryInfo = (country: string) => {
    return COUNTRY_MAP[country.toLowerCase()] || { name: country.charAt(0).toUpperCase() + country.slice(1), flag: null };
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Select
        value={filters.seniority}
        onValueChange={(value) => onFiltersChange({ ...filters, seniority: value })}
      >
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Seniority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
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
          <SelectValue placeholder="Work Model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="remote">Remote</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
          <SelectItem value="onsite">On-site</SelectItem>
        </SelectContent>
      </Select>

      {countries.length > 0 && (
        <Select
          value={filters.country}
          onValueChange={(value) => onFiltersChange({ ...filters, country: value })}
        >
          <SelectTrigger className="w-[150px] bg-background">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {countries.map((country) => {
              const info = getCountryInfo(country);
              return (
                <SelectItem key={country} value={country}>
                  <div className="flex items-center gap-2">
                    {info.flag && (
                      <img src={info.flag} alt={info.name} className="w-4 h-3 object-cover rounded-sm" />
                    )}
                    {info.name}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.company}
        onValueChange={(value) => onFiltersChange({ ...filters, company: value })}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company} value={company}>
              {company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tags.length > 0 && (
        <Select
          value={filters.tag}
          onValueChange={(value) => onFiltersChange({ ...filters, tag: value })}
        >
          <SelectTrigger className="w-[150px] bg-background">
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
