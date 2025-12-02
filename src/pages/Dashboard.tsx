import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Settings, Plus, Kanban, Building2, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [showAlert, setShowAlert] = useState(true);
  
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
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">JD</span>
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
              <span className="text-sm">You have <strong>3 target companies</strong> you haven't checked in over a week</span>
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
                Target Companies
              </TabsTrigger>
            </TabsList>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Opportunity
            </Button>
          </div>

          <TabsContent value="pipeline" className="mt-0">
            <PipelineView />
          </TabsContent>
          
          <TabsContent value="companies" className="mt-0">
            <CompaniesView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const PipelineView = () => {
  const columns = [
    { id: "researching", title: "Researching", color: "bg-muted-foreground", count: 3 },
    { id: "applied", title: "Applied", color: "bg-status-applied", count: 2 },
    { id: "interviewing", title: "Interviewing", color: "bg-status-interviewing", count: 1 },
    { id: "offer", title: "Offer", color: "bg-status-offer", count: 0 },
  ];

  const sampleOpportunities = [
    { id: 1, company: "OutSystems", role: "Senior PM, Platform", location: "Lisbon", workModel: "Hybrid", score: 85, status: "researching", updated: "3 days ago", nextAction: "Research company culture" },
    { id: 2, company: "Feedzai", role: "Product Manager", location: "Porto", workModel: "Remote", score: 72, status: "researching", updated: "1 week ago", nextAction: "Update CV" },
    { id: 3, company: "Remote.com", role: "Growth PM", location: "Remote", workModel: "Remote", score: 91, status: "researching", updated: "2 days ago", nextAction: "Apply this week" },
    { id: 4, company: "N26", role: "PM, Payments", location: "Berlin", workModel: "Hybrid", score: 68, status: "applied", updated: "5 days ago", nextAction: "Follow up email" },
    { id: 5, company: "Stripe", role: "Product Manager", location: "Dublin", workModel: "Hybrid", score: 78, status: "applied", updated: "1 day ago", nextAction: "Prepare for screen" },
    { id: 6, company: "Booking.com", role: "Senior PM", location: "Amsterdam", workModel: "Hybrid", score: 82, status: "interviewing", updated: "Today", nextAction: "Technical interview prep" },
  ];

  const getOpportunitiesForColumn = (columnId: string) => 
    sampleOpportunities.filter(opp => opp.status === columnId);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-match-high text-success-foreground";
    if (score >= 50) return "bg-match-medium text-warning-foreground";
    return "bg-match-low text-destructive-foreground";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.id} className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="font-medium">{column.title}</h3>
            <span className="text-muted-foreground text-sm ml-auto">
              {getOpportunitiesForColumn(column.id).length}
            </span>
          </div>
          <div className="space-y-3">
            {getOpportunitiesForColumn(column.id).map((opp) => (
              <div key={opp.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <h4 className="font-medium text-sm">{opp.company}</h4>
                <p className="text-muted-foreground text-sm">{opp.role}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-muted-foreground">📍 {opp.location}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(opp.score)}`}>
                    {opp.score}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">📅 Updated {opp.updated}</p>
                  <p className="text-xs mt-1">→ {opp.nextAction}</p>
                </div>
              </div>
            ))}
            {getOpportunitiesForColumn(column.id).length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No opportunities yet
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const CompaniesView = () => {
  const countries = [
    { code: "PT", name: "Portugal", flag: "🇵🇹", count: 8 },
    { code: "BR", name: "Brazil", flag: "🇧🇷", count: 10 },
    { code: "DE", name: "Germany", flag: "🇩🇪", count: 10 },
  ];

  const sampleCompanies = [
    { name: "OutSystems", type: "Tech Giant", sector: "Low-code Platform", country: "PT", lastChecked: "3 days ago", opportunities: 2 },
    { name: "Feedzai", type: "Tech Giant", sector: "AI/Fintech", country: "PT", lastChecked: "1 week ago", opportunities: 1 },
    { name: "Remote.com", type: "Tech Giant", sector: "HR Tech", country: "PT", lastChecked: "2 days ago", opportunities: 0 },
    { name: "Talkdesk", type: "Tech Giant", sector: "Contact Center SaaS", country: "PT", lastChecked: "5 days ago", opportunities: 1 },
  ];

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Tech Giant": return "bg-badge-tech-giant/10 text-badge-tech-giant";
      case "Scaleup": return "bg-badge-scaleup/10 text-badge-scaleup";
      case "Startup": return "bg-badge-startup/10 text-badge-startup";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {countries.map((country) => (
        <div key={country.code} className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-xl">{country.flag}</span>
              {country.name}
              <span className="text-muted-foreground font-normal">({country.count} companies)</span>
            </h3>
          </div>
          <div className="divide-y divide-border">
            {sampleCompanies.filter(c => c.country === country.code).map((company, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{company.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(company.type)}`}>
                      {company.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{company.sector}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last checked: {company.lastChecked}</p>
                </div>
                <div className="flex items-center gap-3">
                  {company.opportunities > 0 && (
                    <span className="text-sm text-muted-foreground">
                      📋 {company.opportunities} opportunities
                    </span>
                  )}
                  <Button variant="outline" size="sm">Check Careers</Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
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
