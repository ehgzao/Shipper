import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Ship, ChevronRight, ChevronLeft, Briefcase, MapPin, Building2, Target, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

type AppRole = Database["public"]["Enums"]["app_role"];
type StrengthOrientation = Database["public"]["Enums"]["strength_orientation"];
type WorkModel = Database["public"]["Enums"]["work_model"];

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

interface PresetCompany {
  id: string;
  company_name: string;
  company_type: string | null;
  country: string;
  sector: string | null;
  careers_url: string | null;
}

interface CountryWorkPreference {
  country: string;
  workModels: WorkModel[];
}

const TOTAL_EXPERIENCE_OPTIONS = [
  { value: "0-2", label: "0-2 years", years: 1 },
  { value: "2-5", label: "2-5 years", years: 3 },
  { value: "5-10", label: "5-10 years", years: 7 },
  { value: "10+", label: "10+ years", years: 12 },
];

const PRODUCT_EXPERIENCE_OPTIONS = [
  { value: "0", label: "Transitioning", years: 0 },
  { value: "0-1", label: "0-1 years", years: 1 },
  { value: "1-3", label: "1-3 years", years: 2 },
  { value: "3-5", label: "3-5 years", years: 4 },
  { value: "5+", label: "5+ years", years: 6 },
];

const BACKGROUND_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const FLAG_IMAGES: Record<string, string> = {
  BR: flagBR,
  PT: flagPT,
  DE: flagDE,
  ES: flagES,
  IE: flagIE,
  NL: flagNL,
};

const COUNTRY_OPTIONS = [
  { value: "brazil", code: "BR", label: "Brazil" },
  { value: "portugal", code: "PT", label: "Portugal" },
  { value: "germany", code: "DE", label: "Germany" },
  { value: "spain", code: "ES", label: "Spain" },
  { value: "ireland", code: "IE", label: "Ireland" },
  { value: "netherlands", code: "NL", label: "Netherlands" },
];

const WORK_MODEL_OPTIONS: { value: WorkModel; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const COMPANY_STAGE_OPTIONS = [
  { value: "startup", label: "Startup (seed/series A)" },
  { value: "scaleup", label: "Scaleup (series B+)" },
  { value: "tech_giant", label: "Tech Giant (FAANG+)" },
];

const STRENGTH_OPTIONS: { value: StrengthOrientation; label: string; description: string }[] = [
  { value: "technical", label: "Technical", description: "Focus on specs and metrics" },
  { value: "business", label: "Business", description: "Focus on strategy and stakeholders" },
  { value: "balanced", label: "Balanced", description: "Mix of both" },
];

// Role suggestions based on profile
const getSuggestedRoles = (
  productYears: string,
  background: AppRole | "",
  strength: StrengthOrientation | ""
): { role: string; fit: string }[] => {
  const roles: { role: string; fit: string }[] = [];
  
  // Base roles by experience level
  if (productYears === "0") {
    roles.push(
      { role: "Associate Product Manager", fit: "Ideal for career transition" },
      { role: "Junior Product Manager", fit: "Entry level in product" }
    );
  } else if (productYears === "0-1") {
    roles.push(
      { role: "Product Manager", fit: "Initial mid-level" },
      { role: "Associate Product Manager", fit: "Build experience" }
    );
  } else if (productYears === "1-3") {
    roles.push(
      { role: "Product Manager", fit: "Mid-level" },
      { role: "Senior Product Manager", fit: "Next step" }
    );
  } else if (productYears === "3-5") {
    roles.push(
      { role: "Senior Product Manager", fit: "Senior level" },
      { role: "Lead Product Manager", fit: "Technical leadership" }
    );
  } else if (productYears === "5+") {
    roles.push(
      { role: "Lead Product Manager", fit: "Team leadership" },
      { role: "Principal Product Manager", fit: "Senior IC" },
      { role: "Head of Product", fit: "Area management" }
    );
  }
  
  // Add specialization based on background
  if (background === "engineering" && strength !== "business") {
    roles.push({ role: "Technical Product Manager", fit: `Engineering background` });
  }
  if (background === "design") {
    roles.push({ role: "Product Design Manager", fit: "Design background" });
  }
  if ((background === "sales" || background === "marketing") && strength !== "technical") {
    roles.push({ role: "Growth Product Manager", fit: `${background} background` });
  }
  if (background === "operations") {
    roles.push({ role: "Platform Product Manager", fit: "Operations background" });
  }
  
  return roles.slice(0, 5); // Max 5 suggestions
};

export const OnboardingFlow = ({ userId, onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [yearsExperienceTotal, setYearsExperienceTotal] = useState("");
  const [yearsExperienceProduct, setYearsExperienceProduct] = useState("");
  const [background, setBackground] = useState<AppRole | "">("");
  const [countryPreferences, setCountryPreferences] = useState<CountryWorkPreference[]>([]);
  const [companyStages, setCompanyStages] = useState<string[]>([]);
  const [strengthOrientation, setStrengthOrientation] = useState<StrengthOrientation | "">("");
  
  // Target companies
  const [presetCompanies, setPresetCompanies] = useState<PresetCompany[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const totalSteps = 5;

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from("preset_companies")
        .select("*")
        .order("company_name");
      if (data) setPresetCompanies(data);
    };
    fetchCompanies();
  }, []);

  const toggleCountry = (countryValue: string) => {
    const exists = countryPreferences.find(p => p.country === countryValue);
    if (exists) {
      setCountryPreferences(countryPreferences.filter(p => p.country !== countryValue));
    } else {
      setCountryPreferences([...countryPreferences, { country: countryValue, workModels: [] }]);
    }
  };

  const toggleWorkModel = (countryValue: string, workModel: WorkModel) => {
    setCountryPreferences(prev => prev.map(p => {
      if (p.country !== countryValue) return p;
      const hasModel = p.workModels.includes(workModel);
      return {
        ...p,
        workModels: hasModel 
          ? p.workModels.filter(w => w !== workModel)
          : [...p.workModels, workModel]
      };
    }));
  };

  const toggleCompanyStage = (stage: string) => {
    if (companyStages.includes(stage)) {
      setCompanyStages(companyStages.filter(s => s !== stage));
    } else {
      setCompanyStages([...companyStages, stage]);
    }
  };

  const toggleCompany = (companyId: string) => {
    if (selectedCompanyIds.includes(companyId)) {
      setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== companyId));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, companyId]);
    }
  };

  const toggleAllCompaniesInCountry = (companyIds: string[]) => {
    const allSelected = companyIds.every(id => selectedCompanyIds.includes(id));
    if (allSelected) {
      setSelectedCompanyIds(selectedCompanyIds.filter(id => !companyIds.includes(id)));
    } else {
      const newIds = companyIds.filter(id => !selectedCompanyIds.includes(id));
      setSelectedCompanyIds([...selectedCompanyIds, ...newIds]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return yearsExperienceTotal && yearsExperienceProduct && background;
      case 2: return countryPreferences.length > 0 && countryPreferences.every(p => p.workModels.length > 0);
      case 3: return companyStages.length > 0;
      case 4: return strengthOrientation;
      case 5: return selectedCompanyIds.length > 0;
      default: return false;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    const totalYearsMap: Record<string, number> = {
      "0-2": 1, "2-5": 3, "5-10": 7, "10+": 12,
    };
    const productYearsMap: Record<string, number> = {
      "0": 0, "0-1": 1, "1-3": 2, "3-5": 4, "5+": 6,
    };

    // Build country work preferences object
    const countryWorkPrefsObj = countryPreferences.reduce((acc, p) => {
      acc[p.country] = p.workModels;
      return acc;
    }, {} as Record<string, WorkModel[]>);

    // Get suggested roles to save
    const suggestedRoles = getSuggestedRoles(yearsExperienceProduct, background, strengthOrientation);
    const targetRoles = suggestedRoles.map(r => r.role);

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        years_experience_total: totalYearsMap[yearsExperienceTotal] || 0,
        years_experience_product: productYearsMap[yearsExperienceProduct] || 0,
        previous_background: background as AppRole,
        preferred_countries: countryPreferences.map(p => p.country),
        country_work_preferences: countryWorkPrefsObj,
        preferred_company_stage: companyStages,
        strength_orientation: strengthOrientation as StrengthOrientation,
        target_roles: targetRoles,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      toast({
        title: "Error saving profile",
        description: profileError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Add selected companies as target companies
    const selectedCompanies = presetCompanies.filter(c => selectedCompanyIds.includes(c.id));
    const targetCompaniesData = selectedCompanies.map(company => ({
      user_id: userId,
      company_name: company.company_name,
      company_type: company.company_type as Database["public"]["Enums"]["company_type"] | null,
      country: company.country,
      sector: company.sector,
      careers_url: company.careers_url,
      is_preset: true,
    }));

    if (targetCompaniesData.length > 0) {
      const { error: companiesError } = await supabase
        .from("target_companies")
        .insert(targetCompaniesData);

      if (companiesError) {
        toast({
          title: "Error adding companies",
          description: companiesError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: "Profile configured!",
      description: `${selectedCompanyIds.length} companies added to your list.`,
    });
    onComplete();
    setIsLoading(false);
  };

  // Map company stages to company_type values from database
  const stageToTypeMap: Record<string, string> = {
    startup: "startup",
    scaleup: "scaleup", 
    tech_giant: "tech_giant",
  };

  // Get companies filtered by selected countries AND company types
  const filteredCompanies = presetCompanies.filter(c => {
    const matchesCountry = countryPreferences.some(p => p.country === c.country);
    const matchesType = companyStages.length === 0 || 
      companyStages.some(stage => stageToTypeMap[stage] === c.company_type);
    return matchesCountry && matchesType;
  });

  // Group companies by country
  const companiesByCountry = filteredCompanies.reduce((acc, company) => {
    if (!acc[company.country]) acc[company.country] = [];
    acc[company.country].push(company);
    return acc;
  }, {} as Record<string, PresetCompany[]>);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ship className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shipper</span>
          </div>
          <h1 className="text-2xl font-bold">Let's set up your profile</h1>
          <p className="text-muted-foreground mt-2">
            Answer a few questions to personalize your experience
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="bg-card border border-border rounded-2xl p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Briefcase className="h-5 w-5" />
                <h2 className="font-semibold">Experience</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Total career length</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {TOTAL_EXPERIENCE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={yearsExperienceTotal === opt.value ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setYearsExperienceTotal(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Years of Product experience</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PRODUCT_EXPERIENCE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={yearsExperienceProduct === opt.value ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setYearsExperienceProduct(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {yearsExperienceProduct === "0" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Got it! We'll recommend entry-level roles suitable for transition.
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Previous background</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {BACKGROUND_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={background === opt.value ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setBackground(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <MapPin className="h-5 w-5" />
                <h2 className="font-semibold">Countries and work model</h2>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Select countries and define the work model for each one.
              </p>

              <div className="space-y-4">
                {COUNTRY_OPTIONS.map((country) => {
                  const pref = countryPreferences.find(p => p.country === country.value);
                  const isSelected = !!pref;
                  
                  return (
                    <div
                      key={country.value}
                      className={`rounded-lg border transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <label className="flex items-center gap-3 p-3 cursor-pointer">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCountry(country.value)}
                        />
                        <img 
                          src={FLAG_IMAGES[country.code]} 
                          alt={country.label} 
                          className="w-6 h-4 object-cover rounded-sm"
                        />
                        <span className="font-medium">{country.label}</span>
                      </label>
                      
                      {isSelected && (
                        <div className="px-3 pb-3 pt-1 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Work model:</p>
                          <div className="flex gap-2 flex-wrap">
                            {WORK_MODEL_OPTIONS.map((wm) => (
                              <button
                                key={wm.value}
                                type="button"
                                onClick={() => toggleWorkModel(country.value, wm.value)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                  pref?.workModels.includes(wm.value)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:bg-muted"
                                }`}
                              >
                                {wm.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Building2 className="h-5 w-5" />
                <h2 className="font-semibold">Company type</h2>
              </div>
              
              <div className="space-y-3">
                {COMPANY_STAGE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={companyStages.includes(opt.value)}
                      onCheckedChange={() => toggleCompanyStage(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Target className="h-5 w-5" />
                <h2 className="font-semibold">Strength orientation</h2>
              </div>
              
              <div className="space-y-3">
                {STRENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      strengthOrientation === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setStrengthOrientation(opt.value)}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Plus className="h-5 w-5" />
                <h2 className="font-semibold">Initial target companies</h2>
              </div>
              
              {/* Suggested roles based on profile */}
              {(() => {
                const suggestedRoles = getSuggestedRoles(yearsExperienceProduct, background, strengthOrientation);
                return suggestedRoles.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-primary mb-2">
                      🎯 Recommended roles for you:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedRoles.map((item, idx) => (
                        <div 
                          key={idx}
                          className="bg-background border border-border rounded-full px-3 py-1 text-xs"
                          title={item.fit}
                        >
                          <span className="font-medium">{item.role}</span>
                          <span className="text-muted-foreground ml-1">· {item.fit}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Look for these roles at the companies below
                    </p>
                  </div>
                );
              })()}

              <p className="text-sm text-muted-foreground">
                Select companies to start your pipeline. You can add more later.
              </p>

              <div className="text-sm text-muted-foreground mb-2">
                {selectedCompanyIds.length} of {filteredCompanies.length} company(ies) selected
              </div>

              <div className="space-y-4">
                {Object.entries(companiesByCountry).map(([country, companies]) => {
                  const countryInfo = COUNTRY_OPTIONS.find(c => c.value === country);
                  const countryPref = countryPreferences.find(p => p.country === country);
                  const workModelLabels = countryPref?.workModels.map(wm => 
                    WORK_MODEL_OPTIONS.find(opt => opt.value === wm)?.label
                  ).filter(Boolean);
                  
                  const countryCompanyIds = companies.map(c => c.id);
                  const allCountrySelected = countryCompanyIds.every(id => selectedCompanyIds.includes(id));
                  const someCountrySelected = countryCompanyIds.some(id => selectedCompanyIds.includes(id));
                  
                  return (
                    <div key={country}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          {countryInfo?.code && (
                            <img 
                              src={FLAG_IMAGES[countryInfo.code]} 
                              alt={countryInfo?.label} 
                              className="w-5 h-3.5 object-cover rounded-sm"
                            />
                          )}
                          {countryInfo?.label}
                          {workModelLabels && workModelLabels.length > 0 && (
                            <span className="text-xs font-normal text-muted-foreground">
                              ({workModelLabels.join(", ")})
                            </span>
                          )}
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggleAllCompaniesInCountry(countryCompanyIds)}
                          className="text-xs text-primary hover:underline"
                        >
                          {allCountrySelected ? "Deselect all" : someCountrySelected ? "Select all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {companies.map((company) => {
                          const isSelected = selectedCompanyIds.includes(company.id);
                          return (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => toggleCompany(company.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <div>
                                <span className="font-medium">{company.company_name}</span>
                                {company.sector && (
                                  <span className="text-muted-foreground ml-2">· {company.sector}</span>
                                )}
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || isLoading}>
              {isLoading ? "Saving..." : "Get Started"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};