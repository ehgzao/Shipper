import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X, LogOut, Compass, TrendingUp, MoreVertical, CheckSquare, Trash2, Download, Filter, GripVertical } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { KanbanBoard } from "@/components/KanbanBoard";
import { StaleNotifications } from "@/components/StaleNotifications";
import { TargetCompanyNotification } from "@/components/TargetCompanyNotification";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import type { Database as SupabaseDB } from "@/integrations/supabase/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import { TrashBinDialog } from "@/components/TrashBinDialog";

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
  verification_frequency_days: number | null;
  kanban_sort_preference: string | null;
}

interface TargetCompany {
  id: string;
  company_name: string;
  company_type: string | null;
  country: string;
  sector: string | null;
  careers_url: string | null;
  last_checked_at: string | null;
  display_order: number | null;
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
  const [showClearCompaniesConfirm, setShowClearCompaniesConfirm] = useState(false);
  const [showCompanyNotification, setShowCompanyNotification] = useState(true);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [deletedOpportunities, setDeletedOpportunities] = useState<Opportunity[]>([]);
  const [currentTab, setCurrentTab] = useState("pipeline");
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
      .order("display_order", { ascending: true })
      .order("country", { ascending: true });

    if (companiesData) {
      setTargetCompanies(companiesData as TargetCompany[]);
    }

    const { data: opportunitiesData } = await supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .order("created_at", { ascending: false });

    if (opportunitiesData) {
      setOpportunities(opportunitiesData as Opportunity[]);
    }

    // Fetch deleted opportunities
    const { data: deletedData } = await supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false });

    if (deletedData) {
      setDeletedOpportunities(deletedData as Opportunity[]);
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

  const handleSortPreferenceChange = async (sortOption: string) => {
    if (!user) return;
    
    // Optimistically update local state
    setProfile(prev => prev ? { ...prev, kanban_sort_preference: sortOption } : null);
    
    // Save to database
    await supabase
      .from("profiles")
      .update({ kanban_sort_preference: sortOption })
      .eq("id", user.id);
  };

  const handleDeleteOpportunity = async (id: string) => {
    // Get the opportunity before deleting for undo functionality
    const deletedOpp = opportunities.find(o => o.id === id);
    
    // Soft delete - move to trash
    const { error } = await supabase
      .from("opportunities")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Moved to trash",
        description: deletedOpp ? `${deletedOpp.company_name} - ${deletedOpp.role_title}` : "The opportunity was moved to trash.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRestoreOpportunity(id)}
          >
            Undo
          </Button>
        ),
      });
      fetchData();
    }
  };

  const handleRestoreOpportunity = async (id: string) => {
    const { error } = await supabase
      .from("opportunities")
      .update({
        is_deleted: false,
        deleted_at: null
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error restoring",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunity restored",
        description: "The opportunity was restored to your pipeline.",
      });
      fetchData();
    }
  };

  const handleBulkRestoreOpportunities = async (ids: string[]) => {
    const { error } = await supabase
      .from("opportunities")
      .update({
        is_deleted: false,
        deleted_at: null
      })
      .in("id", ids);

    if (error) {
      toast({
        title: "Error restoring",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opportunities restored",
        description: `${ids.length} opportunities were restored to your pipeline.`,
      });
      fetchData();
    }
  };

  const handlePermanentDelete = async (id: string) => {
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
        title: "Permanently deleted",
        description: "The opportunity was permanently deleted.",
      });
      fetchData();
    }
  };

  const handleEmptyTrash = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("user_id", user.id)
      .eq("is_deleted", true);

    if (error) {
      toast({
        title: "Error emptying trash",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Trash emptied",
        description: `${deletedOpportunities.length} opportunities permanently deleted.`,
      });
      setShowTrashBin(false);
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

  const handleExportTargetCompanies = () => {
    const exportData = {
      targetCompanies,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipper-companies-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Companies exported",
      description: "Your target companies have been downloaded.",
    });
  };

  const handleClearTargetCompanies = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("target_companies")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error clearing companies",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Companies cleared",
        description: "All target companies were removed.",
      });
      fetchData();
    }
    setShowClearCompaniesConfirm(false);
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

  const handleCheckCareers = async (companyId: string, careersUrl: string) => {
    window.open(careersUrl, '_blank');
    
    await supabase
      .from("target_companies")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", companyId);
    
    fetchData();
  };

  const handleCheckAllCareers = async () => {
    const companiesWithUrls = targetCompanies.filter(c => c.careers_url);
    
    for (const company of companiesWithUrls) {
      window.open(company.careers_url!, '_blank');
    }
    
    const ids = companiesWithUrls.map(c => c.id);
    if (ids.length > 0) {
      await supabase
        .from("target_companies")
        .update({ last_checked_at: new Date().toISOString() })
        .in("id", ids);
      
      toast({
        title: "Careers checked",
        description: `Opened ${companiesWithUrls.length} career pages.`,
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

        <Tabs defaultValue="pipeline" className="w-full" onValueChange={setCurrentTab}>
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
            
            {/* Header Buttons - Contextual */}
            <div className="flex items-center gap-2">
              {currentTab === "pipeline" && (
                <>
                  <Button className="gap-2" onClick={handleNewOpportunity}>
                    <Plus className="h-4 w-4" />
                    New
                  </Button>

                  {/* Trash Bin Button - Only on Pipeline */}
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="relative"
                    onClick={() => setShowTrashBin(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletedOpportunities.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                        {deletedOpportunities.length}
                      </span>
                    )}
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
                </>
              )}

              {currentTab === "companies" && targetCompanies.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowClearCompaniesConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Target Companies
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportTargetCompanies}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Companies
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            {showCompanyNotification && targetCompanies.length > 0 && (
              <TargetCompanyNotification
                companies={targetCompanies}
                verificationDays={profile?.verification_frequency_days || 7}
                onCheckCareers={handleCheckCareers}
                onDismiss={() => setShowCompanyNotification(false)}
              />
            )}
            <StaleNotifications 
              opportunities={opportunities.filter(o => !["rejected", "ghosted", "withdrawn"].includes(o.status || ""))}
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
              sortPreference={profile?.kanban_sort_preference}
              onSortChange={handleSortPreferenceChange}
            />
          </TabsContent>
          
          <TabsContent value="companies" className="mt-0">
            <CompaniesView 
              companies={filteredTargetCompanies} 
              opportunities={opportunities}
              onCreateOpportunity={handleCreateOpportunityFromCompany}
              onDeleteCompany={handleDeleteTargetCompany}
              onCheckCareers={handleCheckCareers}
              onCheckAllCareers={handleCheckAllCareers}
              onReorder={async (reorderedCompanies) => {
                setTargetCompanies(reorderedCompanies);
                // Update display_order in database
                for (let i = 0; i < reorderedCompanies.length; i++) {
                  await supabase
                    .from("target_companies")
                    .update({ display_order: i })
                    .eq("id", reorderedCompanies[i].id);
                }
              }}
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

      {/* Clear Target Companies Confirmation Dialog */}
      <AlertDialog open={showClearCompaniesConfirm} onOpenChange={setShowClearCompaniesConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all target companies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>all {targetCompanies.length} target companies</strong> from your list.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearTargetCompanies}
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

      {/* Trash Bin Dialog */}
      <TrashBinDialog
        open={showTrashBin}
        onOpenChange={setShowTrashBin}
        deletedOpportunities={deletedOpportunities}
        onRestore={handleRestoreOpportunity}
        onBulkRestore={handleBulkRestoreOpportunities}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
      />
    </div>
  );
};

interface CompaniesViewProps {
  companies: TargetCompany[];
  opportunities: Opportunity[];
  onCreateOpportunity: (company: TargetCompany, role?: string) => void;
  onDeleteCompany: (companyId: string) => void;
  onCheckCareers: (companyId: string, careersUrl: string) => void;
  onCheckAllCareers: () => void;
  onReorder: (companies: TargetCompany[]) => void;
}

// Sortable company row component
const SortableCompanyRow = ({ 
  company, 
  oppCount, 
  getTypeBadgeColor, 
  getTypeLabel, 
  getLastCheckedText,
  getLastCheckedColor,
  onCheckCareers,
  onCreateOpportunity,
  onDelete,
}: {
  company: TargetCompany;
  oppCount: number;
  getTypeBadgeColor: (type: string | null) => string;
  getTypeLabel: (type: string | null) => string;
  getLastCheckedText: (lastCheckedAt: string | null) => string;
  getLastCheckedColor: (lastCheckedAt: string | null) => string;
  onCheckCareers: (companyId: string, careersUrl: string) => void;
  onCreateOpportunity: (company: TargetCompany) => void;
  onDelete: (company: TargetCompany) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: company.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${isDragging ? 'opacity-50 bg-muted' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
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
          <div className="flex items-center gap-3 mt-1">
            {company.sector && (
              <p className="text-sm text-muted-foreground">{company.sector}</p>
            )}
            <span className={`text-xs ${getLastCheckedColor(company.last_checked_at)}`}>
              {getLastCheckedText(company.last_checked_at)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {company.careers_url && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onCheckCareers(company.id, company.careers_url!)}
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
          onClick={() => onDelete(company)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

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

const CompaniesView = ({ companies, opportunities, onCreateOpportunity, onDeleteCompany, onCheckCareers, onCheckAllCareers, onReorder }: CompaniesViewProps) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<TargetCompany | null>(null);
  const [localCompanies, setLocalCompanies] = useState(companies);

  // Sync local state with props
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localCompanies.findIndex((c) => c.id === active.id);
      const newIndex = localCompanies.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(localCompanies, oldIndex, newIndex);
      setLocalCompanies(reordered);
      onReorder(reordered);
    }
  };

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

  const getLastCheckedText = (lastCheckedAt: string | null) => {
    if (!lastCheckedAt) return "Never checked";
    try {
      const date = new Date(lastCheckedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Checked today";
      if (diffDays === 1) return "Checked yesterday";
      if (diffDays < 7) return `Checked ${diffDays} days ago`;
      return `Checked ${Math.floor(diffDays / 7)} weeks ago`;
    } catch { return "Never checked"; }
  };

  const getLastCheckedColor = (lastCheckedAt: string | null) => {
    if (!lastCheckedAt) return "text-red-600 dark:text-red-400";
    try {
      const date = new Date(lastCheckedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) return "text-green-600 dark:text-green-400";
      if (diffDays <= 15) return "text-amber-600 dark:text-amber-400";
      return "text-red-600 dark:text-red-400";
    } catch { return "text-red-600 dark:text-red-400"; }
  };

  const companiesWithUrls = companies.filter(c => c.careers_url);

  // Get unique countries and types for filters
  const countries = useMemo(() => {
    return [...new Set(companies.map(c => c.country.toLowerCase()))];
  }, [companies]);

  const companyTypes = useMemo(() => {
    return [...new Set(companies.map(c => c.company_type).filter(Boolean))];
  }, [companies]);

  // Filter companies from local state
  const filteredCompanies = useMemo(() => {
    return localCompanies.filter(c => {
      const country = c.country.toLowerCase();
      if (selectedCountry && country !== selectedCountry) return false;
      if (selectedType && c.company_type !== selectedType) return false;
      return true;
    });
  }, [localCompanies, selectedCountry, selectedType]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* Bulk check button */}
        {companiesWithUrls.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCheckAllCareers}
            className="gap-1.5"
          >
            Check All Careers ({companiesWithUrls.length})
          </Button>
        )}
      </div>

      {/* Companies by Country with drag-drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localCompanies.map(c => c.id)} strategy={verticalListSortingStrategy}>
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
                      <SortableCompanyRow
                        key={company.id}
                        company={company}
                        oppCount={oppCount}
                        getTypeBadgeColor={getTypeBadgeColor}
                        getTypeLabel={getTypeLabel}
                        getLastCheckedText={getLastCheckedText}
                        getLastCheckedColor={getLastCheckedColor}
                        onCheckCareers={onCheckCareers}
                        onCreateOpportunity={onCreateOpportunity}
                        onDelete={setCompanyToDelete}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

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
