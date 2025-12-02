import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Ship, ChevronRight, ChevronLeft, Briefcase, MapPin, Building2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type StrengthOrientation = Database["public"]["Enums"]["strength_orientation"];

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

const EXPERIENCE_OPTIONS = [
  { value: "0-1", label: "0-1 anos" },
  { value: "1-3", label: "1-3 anos" },
  { value: "3-5", label: "3-5 anos" },
  { value: "5+", label: "5+ anos" },
];

const BACKGROUND_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "engineering", label: "Engenharia" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Vendas" },
  { value: "operations", label: "Operações" },
  { value: "consulting", label: "Consultoria" },
  { value: "other", label: "Outro" },
];

const COUNTRY_OPTIONS = [
  { value: "brazil", label: "🇧🇷 Brasil" },
  { value: "portugal", label: "🇵🇹 Portugal" },
  { value: "germany", label: "🇩🇪 Alemanha" },
  { value: "spain", label: "🇪🇸 Espanha" },
  { value: "ireland", label: "🇮🇪 Irlanda" },
  { value: "netherlands", label: "🇳🇱 Holanda" },
];

const COMPANY_STAGE_OPTIONS = [
  { value: "startup", label: "Startup (seed/série A)" },
  { value: "scaleup", label: "Scaleup (série B+)" },
  { value: "tech_giant", label: "Tech Giant (FAANG+)" },
];

const STRENGTH_OPTIONS: { value: StrengthOrientation; label: string; description: string }[] = [
  { value: "technical", label: "Técnico", description: "Foco em especificações e métricas" },
  { value: "business", label: "Negócios", description: "Foco em estratégia e stakeholders" },
  { value: "balanced", label: "Equilibrado", description: "Mix de ambos" },
];

export const OnboardingFlow = ({ userId, onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [yearsExperience, setYearsExperience] = useState("");
  const [background, setBackground] = useState<AppRole | "">("");
  const [countries, setCountries] = useState<string[]>([]);
  const [companyStages, setCompanyStages] = useState<string[]>([]);
  const [strengthOrientation, setStrengthOrientation] = useState<StrengthOrientation | "">("");

  const totalSteps = 4;

  const toggleArrayValue = (array: string[], value: string, setter: (v: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return yearsExperience && background;
      case 2: return countries.length > 0;
      case 3: return companyStages.length > 0;
      case 4: return strengthOrientation;
      default: return false;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    const yearsMap: Record<string, number> = {
      "0-1": 0,
      "1-3": 2,
      "3-5": 4,
      "5+": 6,
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        years_experience_product: yearsMap[yearsExperience] || 0,
        previous_background: background as AppRole,
        preferred_countries: countries,
        preferred_company_stage: companyStages,
        strength_orientation: strengthOrientation as StrengthOrientation,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas preferências.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil configurado!",
        description: "Suas preferências foram salvas com sucesso.",
      });
      onComplete();
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ship className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shipper</span>
          </div>
          <h1 className="text-2xl font-bold">Vamos configurar seu perfil</h1>
          <p className="text-muted-foreground mt-2">
            Responda algumas perguntas para personalizarmos sua experiência
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
        <div className="bg-card border border-border rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Briefcase className="h-5 w-5" />
                <h2 className="font-semibold">Experiência</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Anos de experiência em Produto</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={yearsExperience === opt.value ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setYearsExperience(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Background anterior</Label>
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
                <h2 className="font-semibold">Países de interesse</h2>
              </div>
              
              <div className="space-y-3">
                {COUNTRY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={countries.includes(opt.value)}
                      onCheckedChange={() => toggleArrayValue(countries, opt.value, setCountries)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Building2 className="h-5 w-5" />
                <h2 className="font-semibold">Tipo de empresa</h2>
              </div>
              
              <div className="space-y-3">
                {COMPANY_STAGE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={companyStages.includes(opt.value)}
                      onCheckedChange={() => toggleArrayValue(companyStages, opt.value, setCompanyStages)}
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
                <h2 className="font-semibold">Orientação de força</h2>
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
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || isLoading}>
              {isLoading ? "Salvando..." : "Começar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
