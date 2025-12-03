import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Briefcase, 
  Building2, 
  Bot,
  User,
  Calendar,
  Target,
  TrendingUp,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface UserData {
  user_id: string;
  email: string;
  profile: {
    full_name: string;
    onboarding_completed: boolean;
    years_experience_total: number;
    years_experience_product: number;
    previous_background: string;
    strength_orientation: string;
    skills: string[];
    target_roles: string[];
    created_at: string;
  } | null;
  opportunities: Array<{
    id: string;
    company_name: string;
    role_title: string;
    status: string;
    created_at: string;
  }>;
  target_companies: Array<{
    id: string;
    company_name: string;
    country: string;
    company_type: string;
  }>;
  stats: {
    total_opportunities: number;
    total_target_companies: number;
    ai_coach_usage_today: number;
    opportunities_by_status: Record<string, number>;
  };
  recent_activity: Array<{
    id: string;
    action: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}

interface AdminUserImpersonationProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

const AdminUserImpersonation = ({ userId, userEmail, onClose }: AdminUserImpersonationProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_user_data', { 
        p_target_user_id: userId 
      });

      if (error) throw error;
      setUserData(data as unknown as UserData);
    } catch (error: any) {
      toast({
        title: "Error loading user data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      researching: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      interviewing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      assessment: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      offer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      ghosted: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      withdrawn: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (!userData && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View User Data
          </CardTitle>
          <CardDescription>
            View {userEmail}'s data for troubleshooting (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will load the user's profile, opportunities, and activity data. 
            This action will be logged in the audit trail.
          </p>
          <div className="flex gap-2">
            <Button onClick={fetchUserData}>
              <Eye className="h-4 w-4 mr-2" />
              Load User Data
            </Button>
            <Button variant="outline" onClick={onClose}>
              <EyeOff className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading user data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userData) return null;

  return (
    <Card className="border-primary/50">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Viewing: {userData.profile?.full_name || userData.email}
            </CardTitle>
            <CardDescription>{userData.email}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <EyeOff className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Opportunities</span>
            </div>
            <p className="text-2xl font-bold">{userData.stats.total_opportunities}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Target Companies</span>
            </div>
            <p className="text-2xl font-bold">{userData.stats.total_target_companies}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="h-4 w-4" />
              <span className="text-xs">AI Coach Today</span>
            </div>
            <p className="text-2xl font-bold">{userData.stats.ai_coach_usage_today}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Joined</span>
            </div>
            <p className="text-sm font-medium">
              {userData.profile?.created_at 
                ? formatDistanceToNow(new Date(userData.profile.created_at), { addSuffix: true })
                : "N/A"
              }
            </p>
          </div>
        </div>

        {/* Profile Info */}
        {userData.profile && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </h4>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="ml-2">{userData.profile.years_experience_total} years total, {userData.profile.years_experience_product} in PM</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Background:</span>
                  <span className="ml-2 capitalize">{userData.profile.previous_background || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Strength:</span>
                  <span className="ml-2 capitalize">{userData.profile.strength_orientation || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Onboarding:</span>
                  <Badge variant={userData.profile.onboarding_completed ? "default" : "secondary"} className="ml-2">
                    {userData.profile.onboarding_completed ? "Completed" : "Incomplete"}
                  </Badge>
                </div>
              </div>
              {userData.profile.skills && userData.profile.skills.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userData.profile.skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Opportunities by Status */}
        {Object.keys(userData.stats.opportunities_by_status || {}).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline Status
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(userData.stats.opportunities_by_status).map(([status, count]) => (
                <Badge key={status} className={getStatusColor(status)}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Opportunities */}
        {userData.opportunities.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Recent Opportunities ({userData.opportunities.length})
            </h4>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {userData.opportunities.slice(0, 10).map((opp) => (
                  <div key={opp.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{opp.company_name}</p>
                      <p className="text-xs text-muted-foreground">{opp.role_title}</p>
                    </div>
                    <Badge className={getStatusColor(opp.status)}>{opp.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recent Activity */}
        {userData.recent_activity && userData.recent_activity.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Activity
            </h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {userData.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                    <span className="capitalize">{activity.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUserImpersonation;