import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingFlow } from "@/components/OnboardingFlow";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  onboarding_completed: boolean;
}

interface PresetCompany {
  id: string;
  company_name: string;
  company_type: string | null;
  country: string;
  sector: string | null;
  careers_url: string | null;
}

const Dashboard = () => {
  const [showAlert, setShowAlert] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presetCompanies, setPresetCompanies] = useState<PresetCompany[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setShowOnboarding(!profileData.onboarding_completed);
      }

      // Fetch preset companies
      const { data: companiesData } = await supabase
        .from("preset_companies")
        .select("*")
        .order("country", { ascending: true });

      if (companiesData) {
        setPresetCompanies(companiesData);
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Até logo!",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setProfile(prev => prev ? { ...prev, onboarding_completed: true } : null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Ship className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (showOnboarding && user) {
    return <OnboardingFlow userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="container-wide">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Ship className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Shipper</span>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {getInitials(profile?.full_name)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {showAlert && (
        <div className="bg-warning/10 border-b border-warning/20">
          <div className="container-wide py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm">
                Bem-vindo, <strong>{profile?.full_name || "usuário"}</strong>! 
                Comece adicionando empresas à sua lista de alvos.
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowAlert(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container-wide py-6">
        <Tabs defaultValue="pipeline" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-background border border-border">
              <TabsTrigger value="pipeline" className="gap-2">
                <Kanban className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                Empresas Alvo
              </TabsTrigger>
            </TabsList>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Oportunidade
            </Button>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            <PipelineView />
          </TabsContent>
          
          <TabsContent value="companies" className="mt-0">
            <CompaniesView companies={presetCompanies} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const PipelineView = () => {
  const columns = [
    { id: "researching", title: "Pesquisando", color: "bg-muted-foreground" },
    { id: "applied", title: "Candidatado", color: "bg-status-applied" },
    { id: "interviewing", title: "Entrevistando", color: "bg-status-interviewing" },
    { id: "offer", title: "Oferta", color: "bg-status-offer" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.id} className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="font-medium">{column.title}</h3>
            <span className="text-muted-foreground text-sm ml-auto">0</span>
          </div>
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>Nenhuma oportunidade ainda</p>
            <p className="mt-2 text-xs">Adicione sua primeira oportunidade!</p>
          </div>
        </div>
      ))}
    </div>
  );
};

interface CompaniesViewProps {
  companies: PresetCompany[];
}

const CompaniesView = ({ companies }: CompaniesViewProps) => {
  const countryMap: Record<string, { name: string; flag: string }> = {
    portugal: { name: "Portugal", flag: "🇵🇹" },
    brazil: { name: "Brasil", flag: "🇧🇷" },
    germany: { name: "Alemanha", flag: "🇩🇪" },
    spain: { name: "Espanha", flag: "🇪🇸" },
    ireland: { name: "Irlanda", flag: "🇮🇪" },
    netherlands: { name: "Holanda", flag: "🇳🇱" },
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

  const groupedCompanies = companies.reduce((acc, company) => {
    if (!acc[company.country]) {
      acc[company.country] = [];
    }
    acc[company.country].push(company);
    return acc;
  }, {} as Record<string, PresetCompany[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedCompanies).map(([country, countryCompanies]) => (
        <div key={country} className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-xl">{countryMap[country]?.flag || "🌍"}</span>
              {countryMap[country]?.name || country}
              <span className="text-muted-foreground font-normal">
                ({countryCompanies.length} empresas)
              </span>
            </h3>
          </div>
          <div className="divide-y divide-border">
            {countryCompanies.map((company) => (
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
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
