import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, ArrowLeft, Save, KeyRound, Mail, User, Settings as SettingsIcon, Briefcase, X, Plus, RotateCcw, Sun, Moon, Monitor, Shield } from "lucide-react";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import SessionManagement from "@/components/SessionManagement";
import RateLimitVisualization from "@/components/RateLimitVisualization";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import AccountRecoveryOptions from "@/components/AccountRecoveryOptions";
import SecurityEventTimeline from "@/components/SecurityEventTimeline";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import type { Database } from "@/integrations/supabase/types";
import { profileSettingsSchema, passwordChangeSchema, getValidationError } from "@/lib/validations";
import { createAuditLog, sendUserSecurityAlert } from "@/lib/auditLog";
import { sendSecurityNotification } from "@/lib/securityNotifications";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

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
  target_roles: string[] | null;
}

const FLAG_IMAGES: Record<string, string> = {
  BR: flagBR,
  PT: flagPT,
  DE: flagDE,
  ES: flagES,
  IE: flagIE,
  NL: flagNL,
};

const COUNTRIES = [
  { id: "portugal", name: "Portugal", code: "PT" },
  { id: "brazil", name: "Brazil", code: "BR" },
  { id: "germany", name: "Germany", code: "DE" },
  { id: "spain", name: "Spain", code: "ES" },
  { id: "ireland", name: "Ireland", code: "IE" },
  { id: "netherlands", name: "Netherlands", code: "NL" },
];

const COMMON_ROLES = [
  "Product Manager",
  "Senior Product Manager",
  "Lead Product Manager",
  "Principal Product Manager",
  "Associate Product Manager",
  "Technical Product Manager",
  "Growth Product Manager",
  "Head of Product",
  "Product Design Manager",
  "Platform Product Manager",
];

const WORK_MODELS = ["remote", "hybrid", "onsite"];
const COMPANY_STAGES = ["tech_giant", "scaleup", "startup"];

const BACKGROUND_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const STRENGTH_OPTIONS: { value: StrengthOrientation; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "business", label: "Business" },
  { value: "balanced", label: "Balanced" },
];

const Settings = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [yearsTotal, setYearsTotal] = useState(0);
  const [yearsProduct, setYearsProduct] = useState(0);
  const [background, setBackground] = useState<AppRole | "">("");
  const [strength, setStrength] = useState<StrengthOrientation | "">("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryWorkPrefs, setCountryWorkPrefs] = useState<Record<string, string[]>>({});
  const [companyStages, setCompanyStages] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRestartingOnboarding, setIsRestartingOnboarding] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRestartOnboarding = async () => {
    if (!user) return;
    setIsRestartingOnboarding(true);

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: false })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Onboarding restarted!",
        description: "You will be redirected to redo the onboarding.",
      });
      navigate("/dashboard");
    }
    setIsRestartingOnboarding(false);
  };

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
        setTargetRoles(data.target_roles || []);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate profile data with zod
    const formData = {
      fullName: fullName.trim(),
      yearsTotal,
      yearsProduct,
      targetRoles,
    };

    const validationError = getValidationError(profileSettingsSchema, formData);
    if (validationError) {
      toast({
        title: "Validation error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.fullName || null,
        years_experience_total: formData.yearsTotal,
        years_experience_product: formData.yearsProduct,
        previous_background: background || null,
        strength_orientation: strength || null,
        preferred_countries: selectedCountries,
        country_work_preferences: countryWorkPrefs,
        preferred_company_stage: companyStages,
        target_roles: formData.targetRoles,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Log the profile update
      await createAuditLog('profile_updated', {
        updated_fields: ['full_name', 'experience', 'background', 'strength', 'countries', 'company_stages', 'target_roles']
      });
      
      // Send email notification
      if (user?.email) {
        sendSecurityNotification({
          event_type: 'profile_updated',
          user_email: user.email,
          user_name: fullName || undefined,
          details: { updated_fields: ['full_name', 'experience', 'background', 'strength', 'countries', 'company_stages', 'target_roles'] }
        });
      }
      
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    // Validate password with zod
    const validationError = getValidationError(passwordChangeSchema, {
      newPassword,
      confirmPassword,
    });

    if (validationError) {
      toast({
        title: "Validation error",
        description: validationError,
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
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Log the password change
      await createAuditLog('password_changed', {});
      
      // Send email notification to user about password change
      if (user?.email) {
        sendSecurityNotification({
          event_type: 'password_changed',
          user_email: user.email,
          user_name: fullName || undefined,
        });
        
        // Also send user security alert
        sendUserSecurityAlert('password_changed', user.email, fullName || undefined, {
          timestamp: new Date().toISOString(),
        });
      }
      
      toast({
        title: "Password changed!",
        description: "Your password has been updated successfully.",
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
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-wide py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Theme Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how Shipper looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Moon className="h-6 w-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Monitor className="h-6 w-6" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
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
                  <Label htmlFor="yearsTotal">Total Years of Experience</Label>
                  <Input
                    id="yearsTotal"
                    type="number"
                    min={0}
                    value={yearsTotal}
                    onChange={(e) => setYearsTotal(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsProduct">Years in Product</Label>
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
                  <Label>Previous Background</Label>
                  <Select value={background} onValueChange={(v) => setBackground(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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
                  <Label>Strength Orientation</Label>
                  <Select value={strength} onValueChange={(v) => setStrength(v as StrengthOrientation)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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
              <CardTitle>Countries of Interest</CardTitle>
              <CardDescription>
                Select your preferred countries and work models
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
                      <img 
                        src={FLAG_IMAGES[country.code]} 
                        alt={country.name}
                        width={20}
                        height={14}
                        loading="lazy"
                        className="w-5 h-3.5 object-cover rounded-sm"
                      />
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
                            {model === "remote" ? "Remote" : model === "hybrid" ? "Hybrid" : "On-site"}
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
              <CardTitle>Company Types</CardTitle>
              <CardDescription>
                Which company stages do you prefer?
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

          {/* Target Roles Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Target Roles
              </CardTitle>
              <CardDescription>
                Roles you are looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current roles */}
              {targetRoles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {role}
                      <button
                        onClick={() => setTargetRoles(targetRoles.filter(r => r !== role))}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add new role */}
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Add role..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newRole.trim()) {
                      if (!targetRoles.includes(newRole.trim())) {
                        setTargetRoles([...targetRoles, newRole.trim()]);
                      }
                      setNewRole("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newRole.trim() && !targetRoles.includes(newRole.trim())) {
                      setTargetRoles([...targetRoles, newRole.trim()]);
                      setNewRole("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_ROLES.filter(r => !targetRoles.includes(r)).slice(0, 6).map((role) => (
                    <button
                      key={role}
                      onClick={() => setTargetRoles([...targetRoles, role])}
                      className="px-2 py-1 text-xs border border-border rounded-full hover:bg-muted transition-colors"
                    >
                      + {role}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your access password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords don't match</p>
                )}
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                variant="outline"
                className="w-full"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
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
                Your access email: {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {user?.email_confirmed_at 
                  ? "✓ Email confirmed" 
                  : "Email not confirmed. Check your inbox."}
              </p>
            </CardContent>
          </Card>

          {/* AI Coach Usage */}
          <RateLimitVisualization />

          {/* Security Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Security</h2>
            </div>
            
            {/* Two-Factor Authentication */}
            <TwoFactorSetup />
            
            {/* Account Recovery Options */}
            <AccountRecoveryOptions />
            
            {/* Session Management */}
            <SessionManagement />
            
            {/* Security Event Timeline */}
            <SecurityEventTimeline />
          </div>

          {/* Restart Onboarding Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Redo Onboarding
              </CardTitle>
              <CardDescription>
                Reconfigure your preferences and profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                By redoing the onboarding, you can update your country preferences, company types, target roles, and more.
              </p>
              <Button 
                onClick={handleRestartOnboarding} 
                disabled={isRestartingOnboarding}
                variant="outline"
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {isRestartingOnboarding ? "Restarting..." : "Redo Onboarding"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
