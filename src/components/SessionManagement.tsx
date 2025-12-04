import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Trash2, Loader2, RefreshCw, MapPin, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { createAuditLog } from "@/lib/auditLog";
import { sendSecurityNotification } from "@/lib/securityNotifications";
import { fetchGeoLocation, parseUserAgent } from "@/lib/deviceFingerprint";

interface Session {
  id: string;
  session_id: string;
  device_info: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

const SessionManagement = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, session } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSessions();
      trackCurrentSession();
      // Fetch current location
      fetchGeoLocation().then((geo) => {
        if (geo.city && geo.country) {
          setCurrentLocation(`${geo.city}, ${geo.country}`);
        }
      });
    }
  }, [user]);

  const getDeviceInfo = () => {
    return parseUserAgent(navigator.userAgent);
  };

  const trackCurrentSession = async () => {
    if (!user || !session) return;

    try {
      const sessionId = session.access_token.substring(0, 32);
      const deviceInfo = getDeviceInfo();
      const geo = await fetchGeoLocation();

      // Upsert current session
      await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_id: sessionId,
          device_info: deviceInfo,
          ip_address: geo.ip || null,
          last_active_at: new Date().toISOString(),
          is_current: true
        }, {
          onConflict: 'user_id,session_id'
        });

      // Mark other sessions as not current
      await supabase
        .from('user_sessions')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .neq('session_id', sessionId);

    } catch (error) {
      console.error("Error tracking session:", error);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionToRevoke: Session) => {
    setRevokingId(sessionToRevoke.id);
    try {
      // Delete from our tracking table
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionToRevoke.id);

      if (error) throw error;

      // Log the action
      await createAuditLog('session_revoked', { 
        session_id: sessionToRevoke.session_id,
        device: sessionToRevoke.device_info 
      });

      // Send security notification
      if (user?.email) {
        sendSecurityNotification({
          event_type: 'session_revoked',
          user_email: user.email,
          details: { device: sessionToRevoke.device_info }
        });
      }

      // If it's the current session, sign out
      if (sessionToRevoke.is_current) {
        await supabase.auth.signOut();
        return;
      }

      setSessions(prev => prev.filter(s => s.id !== sessionToRevoke.id));
      
      toast({
        title: "Session revoked",
        description: "The session has been successfully terminated.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error revoking session",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!user || !session) return;

    try {
      const currentSessionId = session.access_token.substring(0, 32);

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('session_id', currentSessionId);

      if (error) throw error;

      // Log the action
      await createAuditLog('session_revoked_all', {});

      setSessions(prev => prev.filter(s => s.is_current));

      toast({
        title: "Sessions revoked",
        description: "All other sessions have been terminated.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error revoking sessions",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage devices where you're signed in
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active sessions found
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {sessions.map((sessionItem) => (
                <div
                  key={sessionItem.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    sessionItem.is_current ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {sessionItem.device_info?.toLowerCase().includes('mobile') ? (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium text-sm flex items-center gap-2">
                        {sessionItem.device_info || "Unknown Device"}
                        {sessionItem.is_current && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Active {formatDistanceToNow(new Date(sessionItem.last_active_at), { addSuffix: true })}
                        </span>
                        {sessionItem.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {sessionItem.ip_address}
                          </span>
                        )}
                        {sessionItem.is_current && currentLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {currentLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeSession(sessionItem)}
                    disabled={revokingId === sessionItem.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {revokingId === sessionItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={revokeAllOtherSessions}
              >
                Sign out all other sessions
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionManagement;
