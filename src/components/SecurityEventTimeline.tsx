import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  Shield, 
  LogIn, 
  LogOut, 
  Key, 
  User, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | '2fa_enabled' | '2fa_disabled' | 'session_revoked' | 'lockout' | 'unlock';
  description: string;
  details: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
}

interface SecurityEventTimelineProps {
  isAdmin?: boolean;
  userId?: string;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'login': return LogIn;
    case 'logout': return LogOut;
    case 'password_change':
    case 'password_changed': return Key;
    case 'profile_update':
    case 'profile_updated': return User;
    case '2fa_enabled': return Shield;
    case '2fa_disabled': return AlertTriangle;
    case 'session_revoked': return LogOut;
    case 'admin_account_unlocked':
    case 'unlock': return Unlock;
    case 'account_locked':
    case 'lockout': return Lock;
    default: return Clock;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'login':
    case '2fa_enabled':
    case 'admin_account_unlocked':
    case 'unlock': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'logout':
    case 'session_revoked': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'password_change':
    case 'password_changed':
    case 'profile_update':
    case 'profile_updated': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case '2fa_disabled':
    case 'account_locked':
    case 'lockout': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getEventLabel = (action: string) => {
  const labels: Record<string, string> = {
    'login': 'Login',
    'logout': 'Logout',
    'password_changed': 'Password Changed',
    'profile_updated': 'Profile Updated',
    '2fa_enabled': '2FA Enabled',
    '2fa_disabled': '2FA Disabled',
    'session_revoked': 'Session Revoked',
    'account_locked': 'Account Locked',
    'admin_account_unlocked': 'Account Unlocked',
    'admin_role_granted': 'Admin Role Granted',
    'admin_role_revoked': 'Admin Role Revoked',
    'admin_viewed_user_data': 'User Data Viewed',
    'admin_rate_limit_reset': 'Rate Limit Reset',
    'admin_rate_limit_set': 'Rate Limit Adjusted',
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const SecurityEventTimeline = ({ isAdmin = false, userId }: SecurityEventTimelineProps) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, [user, userId]);

  const fetchEvents = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch audit logs
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isAdmin && !userId) {
        query = query.eq('user_id', user.id);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: auditLogs, error } = await query;

      if (error) throw error;

      const formattedEvents: SecurityEvent[] = (auditLogs || []).map(log => ({
        id: log.id,
        type: log.action as SecurityEvent['type'],
        description: getEventLabel(log.action),
        details: (log.details as Record<string, unknown>) || {},
        timestamp: log.created_at,
        ip_address: log.ip_address || undefined,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === "" || 
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(event.details).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || event.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const eventTypes = [
    { value: "all", label: "All Events" },
    { value: "login", label: "Logins" },
    { value: "password_changed", label: "Password Changes" },
    { value: "profile_updated", label: "Profile Updates" },
    { value: "2fa_enabled", label: "2FA Enabled" },
    { value: "2fa_disabled", label: "2FA Disabled" },
    { value: "session_revoked", label: "Session Revoked" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Security Event Timeline
        </CardTitle>
        <CardDescription>
          Chronological view of all account activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchEvents} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security events found
            </div>
          ) : (
            <div className="relative space-y-1">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
              
              {filteredEvents.map((event, index) => {
                const Icon = getEventIcon(event.type);
                const colorClass = getEventColor(event.type);
                
                return (
                  <div key={event.id} className="relative flex gap-4 pb-4">
                    {/* Icon */}
                    <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'PPpp')}
                      </p>
                      {event.ip_address && (
                        <p className="text-xs text-muted-foreground font-mono">
                          IP: {event.ip_address}
                        </p>
                      )}
                      {Object.keys(event.details).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SecurityEventTimeline;
