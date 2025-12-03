import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  LogIn, 
  LogOut, 
  Key, 
  Shield, 
  ShieldOff,
  Monitor,
  User
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface AuditLogViewerProps {
  logs: AuditLog[] | null;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'login_success':
    case 'login_failed':
      return <LogIn className="h-4 w-4" />;
    case 'logout':
      return <LogOut className="h-4 w-4" />;
    case 'password_changed':
    case 'password_reset_requested':
      return <Key className="h-4 w-4" />;
    case '2fa_enabled':
      return <Shield className="h-4 w-4" />;
    case '2fa_disabled':
      return <ShieldOff className="h-4 w-4" />;
    case 'session_revoked':
    case 'session_revoked_all':
      return <Monitor className="h-4 w-4" />;
    case 'profile_updated':
      return <User className="h-4 w-4" />;
    case 'admin_role_granted':
    case 'admin_role_revoked':
      return <User className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    'login_success': 'Login Success',
    'login_failed': 'Login Failed',
    'logout': 'Logout',
    'password_changed': 'Password Changed',
    'password_reset_requested': 'Password Reset Requested',
    '2fa_enabled': '2FA Enabled',
    '2fa_disabled': '2FA Disabled',
    'session_revoked': 'Session Revoked',
    'session_revoked_all': 'All Sessions Revoked',
    'profile_updated': 'Profile Updated',
    'admin_role_granted': 'Admin Role Granted',
    'admin_role_revoked': 'Admin Role Revoked',
  };
  return labels[action] || action;
};

const getActionColor = (action: string): string => {
  if (action.includes('failed') || action.includes('revoked') || action.includes('disabled')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  if (action.includes('success') || action.includes('enabled') || action.includes('granted')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
};

const AuditLogViewer = ({ logs }: AuditLogViewerProps) => {
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Recent security-related events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No audit logs available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Logs
        </CardTitle>
        <CardDescription>
          Recent security-related events (last 20)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-full bg-muted">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getActionColor(log.action)}>
                      {getActionLabel(log.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {log.email || 'Unknown user'}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.created_at), 'PPpp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;
