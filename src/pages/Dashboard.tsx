import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X, LogOut, Database, TrendingUp, Filter, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { KanbanBoard } from "@/components/KanbanBoard";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";
import { OpportunityModal, type Opportunity } from "@/components/OpportunityModal";
import { PipelineFilters } from "@/components/PipelineFilters";
import { PresetCompaniesView } from "@/components/PresetCompaniesView";
import { SearchInput } from "@/components/SearchInput";
import { StatusCounters } from "@/components/StatusCounters";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  onboarding_completed: boolean;
  years_experience_total: number | null;
  years_experience_product: number | null;
  previous_background: string | null;
  strength_orientation: string | null;
  skills: string[] | null;
  target_roles: string[] | null;
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
  const [filters, setFilters] = useState({ seniority: "all", workModel: "all", company: "all", tag: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get unique company names for filter
  const companyNames = useMemo(() => {
    return [...new Set(opportunities.map(o => o.company_name))].sort();
  }, [opportunities]);

  // Get unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    opportunities.forEach(o => {
      if (o.tags) o.tags.forEach(tag => tags.add(tag));
    });
    return [...tags].sort();
  }, [opportunities]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (filters.seniority !== "all" && o.seniority_level !== filters.seniority) return false;
      if (filters.workModel !== "all" && o.work_model !== filters.workModel) return false;
      if (filters.company !== "all" && o.company_name !== filters.company) return false;
      if (filters.tag !== "all" && (!o.tags || !o.tags.includes(filters.tag))) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          o.company_name.toLowerCase().includes(query) ||
          o.role_title.toLowerCase().includes(query) ||
          o.location?.toLowerCase().includes(query) ||
          o.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [opportunities, filters, searchQuery]);

  // Filter target companies by search
  const filteredTargetCompanies = useMemo(() => {
    if (!searchQuery) return targetCompanies;
    const query = searchQuery.toLowerCase();
    return targetCompanies.filter(c => 
      c.company_name.toLowerCase().includes(query) ||
      c.sector?.toLowerCase().includes(query)
    );
  }, [targetCompanies, searchQuery]);

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

  const handleDeleteOpportunity = async (id: string) => {
    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Oportunidade excluída",
        description: "A oportunidade foi removida.",
      });
      fetchData();
    }
  };

  const handleDuplicateOpportunity = async (opportunity: Opportunity) => {
    if (!user) return;

    const { error } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        company_name: opportunity.company_name,
        role_title: opportunity.role_title,
        status: "researching",
        location: opportunity.location,
        seniority_level: opportunity.seniority_level,
        work_model: opportunity.work_model,
        tags: opportunity.tags,
        job_url: opportunity.job_url,
        salary_range: opportunity.salary_range,
      });

    if (error) {
      toast({
        title: "Erro ao duplicar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Oportunidade duplicada",
        description: `Cópia de ${opportunity.company_name} criada.`,
      });
      fetchData();
    }
  };

  const handleUpdateOpportunityTags = async (id: string, tags: string[]) => {
    const { error } = await supabase
      .from("opportunities")
      .update({ tags })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar tags",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchData();
    }
  };

  const handleUpdateOpportunityRole = async (id: string, role_title: string) => {
    const { error } = await supabase
      .from("opportunities")
      .update({ role_title })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar cargo",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchData();
    }
  };

  const handleCreateOpportunityFromCompany = async (company: TargetCompany, role?: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        company_name: company.company_name,
        role_title: role || "Product Manager",
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

  const handleDeleteTargetCompany = async (companyId: string) => {
    const { error } = await supabase
      .from("target_companies")
      .delete()
      .eq("id", companyId);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Empresa removida",
        description: "A empresa foi removida da sua lista.",
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
                <Link to="/stats">
                  <TrendingUp className="h-5 w-5" />
                </Link>
              </Button>
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
        {/* Status Counters */}
        {opportunities.length > 0 && (
          <div className="mb-4">
            <StatusCounters opportunities={opportunities} />
          </div>
        )}

        {/* Search */}
        <div className="mb-4 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar empresas, cargos..."
          />
        </div>

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
              <TabsTrigger value="database" className="gap-2">
                <Database className="h-4 w-4" />
                Database
              </TabsTrigger>
            </TabsList>
            <Button className="gap-2" onClick={handleNewOpportunity}>
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Button>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            <PipelineFilters 
              companies={companyNames}
              tags={allTags}
              filters={filters}
              onFiltersChange={setFilters}
            />
            <KanbanBoard 
              opportunities={filteredOpportunities}
              onOpportunityClick={handleOpportunityClick}
              onUpdate={fetchData}
              onDelete={handleDeleteOpportunity}
              onDuplicate={handleDuplicateOpportunity}
              onUpdateTags={handleUpdateOpportunityTags}
              onUpdateRole={handleUpdateOpportunityRole}
            />
          </TabsContent>
          
          <TabsContent value="companies" className="mt-0">
            <CompaniesView 
              companies={filteredTargetCompanies} 
              opportunities={opportunities}
              onCreateOpportunity={handleCreateOpportunityFromCompany}
              onDeleteCompany={handleDeleteTargetCompany}
            />
          </TabsContent>

          <TabsContent value="database" className="mt-0">
            {user && (
              <PresetCompaniesView 
                userId={user.id}
                existingCompanyNames={targetCompanies.map(c => c.company_name)}
                onCompanyAdded={fetchData}
              />
            )}
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
          onDeleted={fetchData}
          onDuplicate={fetchData}
          profile={profile}
        />
      )}
    </div>
  );
};

interface CompaniesViewProps {
  companies: TargetCompany[];
  opportunities: Opportunity[];
  onCreateOpportunity: (company: TargetCompany, role?: string) => void;
  onDeleteCompany: (companyId: string) => void;
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
  brazil: { name: "Brasil", code: "BR" },
  germany: { name: "Alemanha", code: "DE" },
  spain: { name: "Espanha", code: "ES" },
  ireland: { name: "Irlanda", code: "IE" },
  netherlands: { name: "Holanda", code: "NL" },
};

const CompaniesView = ({ companies, opportunities, onCreateOpportunity, onDeleteCompany }: CompaniesViewProps) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<TargetCompany | null>(null);

  const getOpportunityCountByCompany = (companyName: string) => {
    return opportunities.filter(o => o.company_name === companyName).length;
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

  // Get unique countries and types
  const countries = useMemo(() => [...new Set(companies.map(c => c.country))], [companies]);
  const companyTypes = useMemo(() => [...new Set(companies.map(c => c.company_type).filter(Boolean))], [companies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (selectedCountry && c.country !== selectedCountry) return false;
      if (selectedType && c.company_type !== selectedType) return false;
      return true;
    });
  }, [companies, selectedCountry, selectedType]);

  const groupedCompanies = filteredCompanies.reduce((acc, company) => {
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>

        {/* Country filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCountry(null)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              selectedCountry === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Todos países
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

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {companyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>


      {Object.entries(groupedCompanies).map(([country, countryCompanies]) => {
        const countryInfo = countryMap[country];
        const countryCode = countryInfo?.code || country.toUpperCase().slice(0, 2);
        return (
        <div key={country} className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              {FLAG_IMAGES[countryCode] && (
                <img 
                  src={FLAG_IMAGES[countryCode]} 
                  alt={countryInfo?.name} 
                  className="w-5 h-3.5 object-cover rounded-sm"
                />
              )}
              {countryInfo?.name || country}
              <span className="text-muted-foreground font-normal text-sm">
                ({countryCompanies.length})
              </span>
            </h3>
          </div>
          <div className="divide-y divide-border">
            {countryCompanies.map((company) => {
              const oppCount = getOpportunityCountByCompany(company.company_name);
              return (
              <div key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{company.company_name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(company.company_type)}`}>
                      {getTypeLabel(company.company_type)}
                    </span>
                    {oppCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {oppCount} {oppCount === 1 ? "oportunidade" : "oportunidades"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{company.sector}</p>
                </div>
                <div className="flex items-center gap-2">
                  {company.careers_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={company.careers_url} target="_blank" rel="noopener noreferrer">
                        Ver Vagas
                      </a>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCompanyToDelete(company)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => onCreateOpportunity(company)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Criar Oportunidade
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{companyToDelete?.company_name}</strong> da sua lista de empresas alvo?
              {getOpportunityCountByCompany(companyToDelete?.company_name || "") > 0 && (
                <span className="block mt-2 text-warning">
                  Esta empresa possui {getOpportunityCountByCompany(companyToDelete?.company_name || "")} oportunidade(s) associada(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (companyToDelete) {
                  onDeleteCompany(companyToDelete.id);
                  setCompanyToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
