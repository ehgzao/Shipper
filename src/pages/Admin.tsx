import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Target, 
  Briefcase, 
  Bot, 
  ArrowLeft,
  Loader2,
  RefreshCw,
  Calendar,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminStats {
  total_users: number;
  total_opportunities: number;
  total_target_companies: number;
  ai_coach_usage_today: number;
  ai_coach_unique_users_today: number;
  rate_limit_details: Array<{
    user_id: string;
    email: string;
    request_count: number;
    reset_date: string;
  }> | null;
}

const Admin = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      fetchStats();
    } catch (error) {
      navigate("/dashboard");
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_stats');

      if (error) throw error;
      setStats(data as unknown as AdminStats);
    } catch (error: any) {
      toast({
        title: "Error loading stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">System statistics and monitoring</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_users}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_opportunities}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Target Companies</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_target_companies}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Coach Today</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.ai_coach_usage_today}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.ai_coach_unique_users_today} unique users
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Coach Rate Limiting Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Coach Usage (Last 7 Days)
                </CardTitle>
                <CardDescription>
                  Rate limiting statistics per user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.rate_limit_details && stats.rate_limit_details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">User</th>
                          <th className="text-left py-3 px-2 font-medium">Date</th>
                          <th className="text-right py-3 px-2 font-medium">Requests</th>
                          <th className="text-right py-3 px-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.rate_limit_details.map((detail, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-3 px-2">
                              <span className="text-muted-foreground">{detail.email}</span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(detail.reset_date), 'MMM d, yyyy')}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono">
                              {detail.request_count} / 10
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                detail.request_count >= 10 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : detail.request_count >= 7
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {detail.request_count >= 10 ? 'Limit Reached' : detail.request_count >= 7 ? 'High Usage' : 'Normal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No AI Coach usage in the last 7 days
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Failed to load statistics
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
