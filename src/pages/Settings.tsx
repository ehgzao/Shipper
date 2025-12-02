import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, ArrowLeft, Save, KeyRound, Mail, User, Settings as SettingsIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type StrengthOrientation = Database["public"]["Enums"]["strength_orientation"];

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  years_experience_total: number | null;
  years_experience_product: number | null;
  previous_background: AppRole | null;
  strength_orientation: StrengthOrientation | null;
  preferred_countries: string[] | null;
  preferred_company_stage: string[] | null;
  country_work_preferences: Record<string, string[]> | null;
}

const COUNTRIES = [
  { id: "portugal", name: "Portugal", code: "PT" },
  { id: "brazil", name: "Brasil", code: "BR" },
  { id: "germany", name: "Alemanha", code: "DE" },
  { id: "spain", name: "Espanha", code: "ES" },
  { id: "ireland", name: "Irlanda", code: "IE" },
  { id: "netherlands", name: "Holanda", code: "NL" },
];

const WORK_MODELS = ["remote", "hybrid", "onsite"];
const COMPANY_STAGES = ["tech_giant", "scaleup", "startup"];

const BACKGROUND_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "engineering", label: "Engenharia" },
  { value: "design", label: "Design" },
  { value: "sales", label: "Vendas" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operações" },
  { value: "consulting", label: "Consultoria" },
  { value: "other", label: "Outro" },
];

const STRENGTH_OPTIONS: { value: StrengthOrientation; label: string }[] = [
  { value: "technical", label: "Técnico" },
  { value: "business", label: "Negócios" },
  { value: "balanced", label: "Equilibrado" },
];

const Settings = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [yearsTotal, setYearsTotal] = useState(0);
  const [yearsProduct, setYearsProduct] = useState(0);
  const [background, setBackground] = useState<AppRole | "">("");
  const [strength, setStrength] = useState<StrengthOrientation | "">("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryWorkPrefs, setCountryWorkPrefs] = useState<Record<string, string[]>>({});
  const [companyStages, setCompanyStages] = useState<string[]>([]);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as unknown as Profile);
        setFullName(data.full_name || "");
        setYearsTotal(data.years_experience_total || 0);
        setYearsProduct(data.years_experience_product || 0);
        setBackground(data.previous_background || "");
        setStrength(data.strength_orientation || "");
        setSelectedCountries(data.preferred_countries || []);
        setCountryWorkPrefs((data.country_work_preferences as Record<string, string[]>) || {});
        setCompanyStages(data.preferred_company_stage || []);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        years_experience_total: yearsTotal,
        years_experience_product: yearsProduct,
        previous_background: background || null,
        strength_orientation: strength || null,
        preferred_countries: selectedCountries,
        country_work_preferences: countryWorkPrefs,
        preferred_company_stage: companyStages,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas.",
      });
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsChangingPassword(false);
  };

  const toggleCountry = (countryId: string) => {
    if (selectedCountries.includes(countryId)) {
      setSelectedCountries(selectedCountries.filter(c => c !== countryId));
      const newPrefs = { ...countryWorkPrefs };
      delete newPrefs[countryId];
      setCountryWorkPrefs(newPrefs);
    } else {
      setSelectedCountries([...selectedCountries, countryId]);
      setCountryWorkPrefs({ ...countryWorkPrefs, [countryId]: ["remote"] });
    }
  };

  const toggleWorkModel = (countryId: string, model: string) => {
    const current = countryWorkPrefs[countryId] || [];
    if (current.includes(model)) {
      if (current.length > 1) {
        setCountryWorkPrefs({
          ...countryWorkPrefs,
          [countryId]: current.filter(m => m !== model),
        });
      }
    } else {
      setCountryWorkPrefs({
        ...countryWorkPrefs,
        [countryId]: [...current, model],
      });
    }
  };

  const toggleCompanyStage = (stage: string) => {
    if (companyStages.includes(stage)) {
      setCompanyStages(companyStages.filter(s => s !== stage));
    } else {
      setCompanyStages([...companyStages, stage]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Ship className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="container-wide">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <Ship className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Shipper</span>
              </Link>
            </div>
            <h1 className="text-lg font-medium flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Configurações
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-wide py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
              <CardDescription>
                Informações básicas do seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsTotal">Anos de Experiência Total</Label>
                  <Input
                    id="yearsTotal"
                    type="number"
                    min={0}
                    value={yearsTotal}
                    onChange={(e) => setYearsTotal(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsProduct">Anos em Produto</Label>
                  <Input
                    id="yearsProduct"
                    type="number"
                    min={0}
                    value={yearsProduct}
                    onChange={(e) => setYearsProduct(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Anterior</Label>
                  <Select value={background} onValueChange={(v) => setBackground(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientação de Força</Label>
                  <Select value={strength} onValueChange={(v) => setStrength(v as StrengthOrientation)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Countries Section */}
          <Card>
            <CardHeader>
              <CardTitle>Países de Interesse</CardTitle>
              <CardDescription>
                Selecione os países e modelos de trabalho preferidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COUNTRIES.map((country) => (
                  <div
                    key={country.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedCountries.includes(country.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => toggleCountry(country.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCountries.includes(country.id)}
                        onCheckedChange={() => toggleCountry(country.id)}
                      />
                      <span className="text-xs font-bold text-muted-foreground">{country.code}</span>
                      <span className="font-medium text-sm">{country.name}</span>
                    </div>
                    {selectedCountries.includes(country.id) && (
                      <div className="mt-2 flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {WORK_MODELS.map((model) => (
                          <button
                            key={model}
                            onClick={() => toggleWorkModel(country.id, model)}
                            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                              countryWorkPrefs[country.id]?.includes(model)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {model === "remote" ? "Remoto" : model === "hybrid" ? "Híbrido" : "Presencial"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company Stages Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Empresa</CardTitle>
              <CardDescription>
                Quais estágios de empresa você prefere?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {[
                  { id: "tech_giant", label: "Tech Giants" },
                  { id: "scaleup", label: "Scaleups" },
                  { id: "startup", label: "Startups" },
                ].map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => toggleCompanyStage(stage.id)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      companyStages.includes(stage.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Atualize sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                variant="outline"
                className="w-full"
              >
                {isChangingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </CardTitle>
              <CardDescription>
                Seu email de acesso: {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {user?.email_confirmed_at 
                  ? "✓ Email confirmado" 
                  : "Email não confirmado. Verifique sua caixa de entrada."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
