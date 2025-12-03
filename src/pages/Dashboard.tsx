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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X, LogOut, Compass, TrendingUp, MoreVertical, CheckSquare, Trash2, Download, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { KanbanBoard } from "@/components/KanbanBoard";
import { StaleNotifications } from "@/components/StaleNotifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import type { Database as SupabaseDB } from "@/integrations/supabase/types";

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
  const [filters, setFilters] = useState({ seniority: "all", workModel: "all", company: "all", tag: "all", country: "all", companyType: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
      if (o.opportunity_tag) tags.add(o.opportunity_tag);
    });
    return [...tags].sort();
  }, [opportunities]);

  // Get unique countries for filter
  const allCountries = useMemo(() => {
    const countries = new Set<string>();
    opportunities.forEach(o => {
      if (o.location) countries.add(o.location.toLowerCase());
    });
    return [...countries].sort();
  }, [opportunities]);

  // Get unique company types from target companies (for opportunities with matching company names)
  const allCompanyTypes = useMemo(() => {
    const types = new Set<string>();
    targetCompanies.forEach(tc => {
      if (tc.company_type) types.add(tc.company_type);
    });
    return [...types];
  }, [targetCompanies]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (filters.seniority !== "all" && o.seniority_level !== filters.seniority) return false;
      if (filters.workModel !== "all" && o.work_model !== filters.workModel) return false;
      if (filters.company !== "all" && o.company_name !== filters.company) return false;
      if (filters.tag !== "all" && o.opportunity_tag !== filters.tag) return false;
      if (filters.country !== "all" && !o.location?.toLowerCase().includes(filters.country)) return false;
      // Filter by company type - check if company exists in target companies with that type
      if (filters.companyType && filters.companyType !== "all") {
        const matchingCompany = targetCompanies.find(tc => tc.company_name === o.company_name);
        if (!matchingCompany || matchingCompany.company_type !== filters.companyType) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          o.company_name.toLowerCase().includes(query) ||
          o.role_title.toLowerCase().includes(query) ||
          o.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [opportunities, filters, searchQuery, targetCompanies]);

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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      setShowOnboarding(!profileData.onboarding_completed);
    }

    const { data: companiesData } = await supabase
      .from("target_companies")
      .select("*")
      .eq("user_id", user.id)
      .order("country", { ascending: true });

    if (companiesData) {
      setTargetCompanies(companiesData);
    }

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
      title: "Goodbye!",
      description: "You have been signed out successfully.",
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
    fetchData();
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
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity deleted",
        description: "The opportunity was removed.",
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
        job_url: opportunity.job_url,
        salary_range: opportunity.salary_range,
        fit_level: opportunity.fit_level,
        opportunity_tag: opportunity.opportunity_tag,
      });

    if (error) {
      toast({
        title: "Error duplicating",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity duplicated",
        description: `Copy of ${opportunity.company_name} created.`,
      });
      fetchData();
    }
  };

  // Bulk selection handlers
  const handleSelectOpportunity = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkMoveToStatus = async (status: SupabaseDB["public"]["Enums"]["opportunity_status"]) => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from("opportunities")
      .update({ 
        status,
        applied_at: status === "applied" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error moving opportunities",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunities moved",
        description: `${selectedIds.size} opportunities moved.`,
      });
      handleClearSelection();
      fetchData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error deleting opportunities",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunities deleted",
        description: `${selectedIds.size} opportunities were deleted.`,
      });
      handleClearSelection();
      fetchData();
    }
    setShowBulkDeleteConfirm(false);
  };

  const handleClearPipeline = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error clearing pipeline",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pipeline cleared",
        description: "All opportunities were removed.",
      });
      fetchData();
    }
    setShowClearConfirm(false);
  };

  const handleExportData = () => {
    const exportData = {
      opportunities,
      targetCompanies,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipper-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Data exported",
      description: "Your data has been downloaded.",
    });
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity created!",
        description: `${company.company_name} added to pipeline.`,
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
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Company removed",
        description: "The company was removed from your list.",
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
            <div className="flex items-center gap-2">
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
              <ThemeToggle />
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
                Welcome, <strong>{profile?.full_name || "user"}</strong>! 
                Start by adding opportunities to your pipeline.
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
            placeholder="Search companies, roles..."
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
                Target Companies
                {targetCompanies.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {targetCompanies.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="explore" className="gap-2">
                <Compass className="h-4 w-4" />
                Explore
              </TabsTrigger>
            </TabsList>
            
            {/* Header Buttons */}
            <div className="flex items-center gap-2">
              <Button className="gap-2" onClick={handleNewOpportunity}>
                <Plus className="h-4 w-4" />
                New
              </Button>
              
              {opportunities.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) handleClearSelection();
                      }}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      {selectionMode ? "Cancel Selection" : "Select Multiple"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowClearConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Pipeline
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            <StaleNotifications 
              opportunities={opportunities}
              onOpportunityClick={handleOpportunityClick}
            />
            <PipelineFilters 
              companies={companyNames}
              tags={allTags}
              countries={allCountries}
              companyTypes={allCompanyTypes}
              filters={filters}
              onFiltersChange={setFilters}
            />
            <KanbanBoard
              opportunities={filteredOpportunities}
              onOpportunityClick={handleOpportunityClick}
              onUpdate={fetchData}
              selectedIds={selectedIds}
              onSelect={handleSelectOpportunity}
              selectionMode={selectionMode}
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

          <TabsContent value="explore" className="mt-0">
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

      {/* Clear Pipeline Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear entire pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>all {opportunities.length} opportunities</strong> from your pipeline.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearPipeline}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected opportunities?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedIds.size} selected opportunities</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onMoveToStatus={handleBulkMoveToStatus}
        onDeleteSelected={() => setShowBulkDeleteConfirm(true)}
      />
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
  brazil: { name: "Brazil", code: "BR" },
  germany: { name: "Germany", code: "DE" },
  spain: { name: "Spain", code: "ES" },
  ireland: { name: "Ireland", code: "IE" },
  netherlands: { name: "Netherlands", code: "NL" },
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

  // Get unique countries and types for filters
  const countries = useMemo(() => {
    return [...new Set(companies.map(c => c.country.toLowerCase()))];
  }, [companies]);

  const companyTypes = useMemo(() => {
    return [...new Set(companies.map(c => c.company_type).filter(Boolean))];
  }, [companies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const country = c.country.toLowerCase();
      if (selectedCountry && country !== selectedCountry) return false;
      if (selectedType && c.company_type !== selectedType) return false;
      return true;
    });
  }, [companies, selectedCountry, selectedType]);

  // Group filtered by country
  const groupedCompanies = filteredCompanies.reduce((acc, company) => {
    const country = company.country.toLowerCase();
    if (!acc[country]) acc[country] = [];
    acc[country].push(company);
    return acc;
  }, {} as Record<string, TargetCompany[]>);

  const filteredGrouped = Object.entries(groupedCompanies)
    .map(([country, comps]) => [
      country,
      selectedType ? comps.filter(c => c.company_type === selectedType) : comps
    ] as [string, TargetCompany[]])
    .filter(([_, comps]) => comps.length > 0);

  if (companies.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">No target companies yet</h3>
        <p className="text-muted-foreground text-sm">Go to Explore to add companies to your list.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters - matching Explore design */}
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

        {/* Type filter */}
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
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Companies by Country - matching Explore design */}
      {filteredGrouped.map(([country, comps]) => {
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
                  ({comps.length} companies)
                </span>
              </h3>
            </div>
            <div className="divide-y divide-border">
              {comps.map(company => {
                const oppCount = getOpportunityCountByCompany(company.company_name);
                return (
                  <div key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{company.company_name}</h4>
                        {company.company_type && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(company.company_type)}`}>
                            {getTypeLabel(company.company_type)}
                          </span>
                        )}
                        {oppCount > 0 && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {oppCount} opp{oppCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {company.sector && (
                        <p className="text-sm text-muted-foreground mt-1">{company.sector}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {company.careers_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(company.careers_url!, '_blank')}
                        >
                          View Jobs
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onCreateOpportunity(company)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setCompanyToDelete(company)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete confirmation */}
      <AlertDialog open={!!companyToDelete} onOpenChange={() => setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove company?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {companyToDelete?.company_name} from your target list? This won't delete any opportunities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (companyToDelete) onDeleteCompany(companyToDelete.id);
                setCompanyToDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
