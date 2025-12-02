import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { KanbanBoard } from "@/components/KanbanBoard";
import { OpportunityModal, type Opportunity } from "@/components/OpportunityModal";

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

interface TargetCompany {
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
  const [targetCompanies, setTargetCompanies] = useState<TargetCompany[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

    // Fetch target companies (user's companies)
    const { data: companiesData } = await supabase
      .from("target_companies")
      .select("*")
      .eq("user_id", user.id)
      .order("country", { ascending: true });

    if (companiesData) {
      setTargetCompanies(companiesData);
    }

    // Fetch opportunities
    const { data: opportunitiesData } = await supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (opportunitiesData) {
      setOpportunities(opportunitiesData as Opportunity[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
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
    fetchData(); // Refresh data after onboarding
  };

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowOpportunityModal(true);
  };

  const handleNewOpportunity = () => {
    setSelectedOpportunity(null);
    setShowOpportunityModal(true);
  };

  const handleOpportunitySaved = () => {
    fetchData();
  };

  const handleCreateOpportunityFromCompany = async (company: TargetCompany) => {
    if (!user) return;

    const { error } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        company_name: company.company_name,
        role_title: "Product Manager",
        status: "researching",
        location: company.country,
      });

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Oportunidade criada!",
        description: `${company.company_name} adicionada ao pipeline.`,
      });
      fetchData();
    }
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
      {showAlert && opportunities.length === 0 && (
        <div className="bg-warning/10 border-b border-warning/20">
          <div className="container-wide py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm">
                Bem-vindo, <strong>{profile?.full_name || "usuário"}</strong>! 
                Comece adicionando oportunidades ao seu pipeline.
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
                {opportunities.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {opportunities.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                Empresas Alvo
                {targetCompanies.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {targetCompanies.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <Button className="gap-2" onClick={handleNewOpportunity}>
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Button>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            <KanbanBoard 
              opportunities={opportunities}
              onOpportunityClick={handleOpportunityClick}
              onUpdate={fetchData}
            />
          </TabsContent>
          
          <TabsContent value="companies" className="mt-0">
            <CompaniesView 
              companies={targetCompanies} 
              onCreateOpportunity={handleCreateOpportunityFromCompany}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Opportunity Modal */}
      {user && (
        <OpportunityModal
          open={showOpportunityModal}
          onOpenChange={setShowOpportunityModal}
          opportunity={selectedOpportunity}
          userId={user.id}
          onSaved={handleOpportunitySaved}
        />
      )}
    </div>
  );
};

interface CompaniesViewProps {
  companies: TargetCompany[];
  onCreateOpportunity: (company: TargetCompany) => void;
}

const CompaniesView = ({ companies, onCreateOpportunity }: CompaniesViewProps) => {
  const countryMap: Record<string, { name: string; code: string }> = {
    portugal: { name: "Portugal", code: "PT" },
    brazil: { name: "Brasil", code: "BR" },
    germany: { name: "Alemanha", code: "DE" },
    spain: { name: "Espanha", code: "ES" },
    ireland: { name: "Irlanda", code: "IE" },
    netherlands: { name: "Holanda", code: "NL" },
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
  }, {} as Record<string, TargetCompany[]>);

  if (companies.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Nenhuma empresa alvo</h3>
        <p className="text-muted-foreground text-sm">
          Complete o onboarding para adicionar empresas à sua lista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  <Button size="sm" onClick={() => onCreateOpportunity(company)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Criar Oportunidade
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
