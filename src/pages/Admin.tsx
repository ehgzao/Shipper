import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Target, 
  Briefcase, 
  Bot, 
  ArrowLeft,
  Loader2,
  RefreshCw,
  Calendar,
  TrendingUp,
  ShieldAlert,
  Lock,
  Unlock,
  Activity,
  CheckCircle,
  XCircle,
  UserPlus,
  Download,
  Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import AdminUserManagement from "@/components/AdminUserManagement";
import AuditLogViewer from "@/components/AuditLogViewer";
import SecurityTrendsChart from "@/components/SecurityTrendsChart";
import AdminRateLimitOverride from "@/components/AdminRateLimitOverride";
import SecurityEventTimeline from "@/components/SecurityEventTimeline";
import { 
  exportToCSV, 
  formatAuditLogsForExport, 
  formatLoginAttemptsForExport,
  formatLockedAccountsForExport,
  generateSecurityReport 
} from "@/lib/csvExport";

interface AuditLog {
  id: string;
  user_id: string;
  email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface LockedAccount {
  email: string;
  locked_until: string;
  failed_attempts: number;
  created_at: string;
}

interface RecentLogin {
  email: string;
  success: boolean;
  ip_address: string | null;
  created_at: string;
}

interface UserEngagement {
  users_active_today: number;
  users_active_week: number;
  new_users_today: number;
  new_users_week: number;
  opportunities_created_today: number;
  opportunities_created_week: number;
}

interface AdminStats {
  total_users: number;
  total_opportunities: number;
  total_target_companies: number;
  ai_coach_usage_today: number;
  ai_coach_unique_users_today: number;
  failed_logins_today: number;
  successful_logins_today: number;
  locked_accounts: number;
  locked_account_details: LockedAccount[] | null;
  active_sessions: number;
  recent_logins: RecentLogin[] | null;
  user_engagement: UserEngagement | null;
  rate_limit_details: Array<{
    user_id: string;
    email: string;
    request_count: number;
    reset_date: string;
  }> | null;
  recent_audit_logs: AuditLog[] | null;
}

const Admin = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unlockingEmail, setUnlockingEmail] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{
    type: 'login' | 'audit' | 'lockout';
    data: RecentLogin | AuditLog | LockedAccount;
    timestamp: Date;
  }>>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-security-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'login_attempts' },
        (payload) => {
          const newLogin = payload.new as RecentLogin;
          setLiveEvents(prev => [{
            type: 'login' as const,
            data: newLogin,
            timestamp: new Date()
          }, ...prev.slice(0, 49)]);
          
          // Update stats optimistically
          setStats(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              [newLogin.success ? 'successful_logins_today' : 'failed_logins_today']: 
                prev[newLogin.success ? 'successful_logins_today' : 'failed_logins_today'] + 1,
              recent_logins: [newLogin, ...(prev.recent_logins || []).slice(0, 19)]
            };
          });

          if (!newLogin.success) {
            toast({
              title: "Failed Login Detected",
              description: `Failed login attempt for ${newLogin.email}`,
              variant: "destructive",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const newLog = payload.new as AuditLog;
          setLiveEvents(prev => [{
            type: 'audit' as const,
            data: newLog,
            timestamp: new Date()
          }, ...prev.slice(0, 49)]);
          
          setStats(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              recent_audit_logs: [newLog, ...(prev.recent_audit_logs || []).slice(0, 19)]
            };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_lockouts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const lockedAccount = payload.new as LockedAccount;
            setLiveEvents(prev => [{
              type: 'lockout' as const,
              data: lockedAccount,
              timestamp: new Date()
            }, ...prev.slice(0, 49)]);
            
            toast({
              title: "Account Locked",
              description: `Account ${lockedAccount.email} has been locked`,
              variant: "destructive",
            });
            
            // Refresh stats to get updated locked accounts
            fetchStats();
          } else if (payload.eventType === 'DELETE') {
            fetchStats();
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Export functions
  const handleExportAuditLogs = useCallback(() => {
    if (!stats?.recent_audit_logs) return;
    const formatted = formatAuditLogsForExport(stats.recent_audit_logs);
    exportToCSV(formatted, 'audit_logs');
    toast({ title: "Exported", description: "Audit logs exported to CSV" });
  }, [stats?.recent_audit_logs, toast]);

  const handleExportLoginAttempts = useCallback(() => {
    if (!stats?.recent_logins) return;
    const formatted = formatLoginAttemptsForExport(stats.recent_logins);
    exportToCSV(formatted, 'login_attempts');
    toast({ title: "Exported", description: "Login attempts exported to CSV" });
  }, [stats?.recent_logins, toast]);

  const handleExportSecurityReport = useCallback(() => {
    if (!stats) return;
    const report = generateSecurityReport(stats);
    exportToCSV(report, 'security_report');
    toast({ title: "Exported", description: "Security report exported to CSV" });
  }, [stats, toast]);

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

  const handleUnlockAccount = async (email: string) => {
    setUnlockingEmail(email);
    try {
      const { data, error } = await supabase.rpc('admin_unlock_account', { p_email: email });
      
      if (error) throw error;
      
      toast({
        title: "Account Unlocked",
        description: `Successfully unlocked ${email}`,
      });
      
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error unlocking account",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnlockingEmail(null);
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
              <h1 className="text-xl font-bold flex items-center gap-2">
                Admin Dashboard
                {realtimeConnected && (
                  <Badge variant="outline" className="text-xs font-normal gap-1">
                    <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                    Live
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">System statistics and monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSecurityReport} disabled={!stats}>
              <Download className="h-4 w-4 mr-2" />
              Security Report
            </Button>
            <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
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

              {/* User Engagement */}
              {stats.user_engagement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      User Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Active Today</p>
                        <p className="text-2xl font-bold">{stats.user_engagement.users_active_today}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Active This Week</p>
                        <p className="text-2xl font-bold">{stats.user_engagement.users_active_week}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">New Users Today</p>
                        <p className="text-2xl font-bold text-green-600">{stats.user_engagement.new_users_today}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">New Users This Week</p>
                        <p className="text-2xl font-bold text-green-600">{stats.user_engagement.new_users_week}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Opportunities Today</p>
                        <p className="text-2xl font-bold">{stats.user_engagement.opportunities_created_today}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Opportunities This Week</p>
                        <p className="text-2xl font-bold">{stats.user_engagement.opportunities_created_week}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Coach Rate Limiting with Override */}
              <AdminRateLimitOverride 
                rateLimitDetails={stats.rate_limit_details} 
                onRefresh={fetchStats}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Activity Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Successful Logins Today</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.successful_logins_today}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed Logins Today</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.failed_logins_today}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Sessions (24h)</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.active_sessions}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Logins */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Recent Login Attempts
                    </CardTitle>
                    <CardDescription>Last 20 login attempts</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportLoginAttempts}
                    disabled={!stats.recent_logins?.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats.recent_logins && stats.recent_logins.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">Email</th>
                            <th className="text-left py-3 px-2 font-medium">Status</th>
                            <th className="text-left py-3 px-2 font-medium">IP Address</th>
                            <th className="text-right py-3 px-2 font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_logins.map((login, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="py-3 px-2">
                                <span className="text-muted-foreground">{login.email}</span>
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant={login.success ? "default" : "destructive"}>
                                  {login.success ? "Success" : "Failed"}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 font-mono text-xs">
                                {login.ip_address || "N/A"}
                              </td>
                              <td className="py-3 px-2 text-right text-muted-foreground">
                                {formatDistanceToNow(new Date(login.created_at), { addSuffix: true })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No recent login attempts
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {/* Security Trends Charts */}
              <SecurityTrendsChart
                recentLogins={stats.recent_logins}
                failedLoginsToday={stats.failed_logins_today}
                successfulLoginsToday={stats.successful_logins_today}
                lockedAccounts={stats.locked_accounts}
              />

              {/* Live Security Events */}
              {liveEvents.length > 0 && (
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                      Live Security Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {liveEvents.slice(0, 5).map((event, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              event.type === 'lockout' ? 'destructive' : 
                              event.type === 'login' && 'success' in event.data && !event.data.success ? 'destructive' : 
                              'default'
                            }>
                              {event.type === 'login' ? ('success' in event.data && event.data.success ? 'Login' : 'Failed Login') : 
                               event.type === 'lockout' ? 'Account Locked' : 
                               'action' in event.data ? String(event.data.action) : 'Audit'}
                            </Badge>
                            <span className="text-muted-foreground">
                              {'email' in event.data ? String(event.data.email) : 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed Logins Today</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.failed_logins_today}</div>
                    <p className="text-xs text-muted-foreground">
                      Unsuccessful login attempts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.locked_accounts}</div>
                    <p className="text-xs text-muted-foreground">
                      Currently locked due to failed attempts
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Locked Accounts Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Locked Accounts
                  </CardTitle>
                  <CardDescription>
                    Accounts locked due to too many failed login attempts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.locked_account_details && stats.locked_account_details.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">Email</th>
                            <th className="text-left py-3 px-2 font-medium">Failed Attempts</th>
                            <th className="text-left py-3 px-2 font-medium">Locked Until</th>
                            <th className="text-right py-3 px-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.locked_account_details.map((account, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="py-3 px-2">
                                <span className="text-muted-foreground">{account.email}</span>
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant="destructive">{account.failed_attempts} attempts</Badge>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {format(new Date(account.locked_until), 'MMM d, yyyy HH:mm')}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnlockAccount(account.email)}
                                  disabled={unlockingEmail === account.email}
                                >
                                  {unlockingEmail === account.email ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-1" />
                                      Unlock
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No locked accounts
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <AdminUserManagement />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportAuditLogs}
                  disabled={!stats.recent_audit_logs?.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Logs
                </Button>
              </div>
              <AuditLogViewer logs={stats.recent_audit_logs} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <SecurityEventTimeline isAdmin={true} />
            </TabsContent>
          </Tabs>
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