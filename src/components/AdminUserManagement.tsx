import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Shield, 
  ShieldOff, 
  Loader2, 
  RefreshCw,
  Search,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
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
import AdminUserImpersonation from "./AdminUserImpersonation";

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingUser, setViewingUser] = useState<{ id: string; email: string } | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(u => 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_users');
      
      if (error) throw error;
      setUsers((data as UserData[]) || []);
      setFilteredUsers((data as UserData[]) || []);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleAction = async () => {
    if (!actionUserId || !actionType) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_manage_role', {
        p_target_user_id: actionUserId,
        p_role: 'admin',
        p_action: actionType
      });

      if (error) throw error;

      toast({
        title: actionType === 'add' ? "Admin role granted" : "Admin role revoked",
        description: (data as { message: string }).message,
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error managing role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setActionUserId(null);
      setActionType(null);
    }
  };

  const confirmAction = (userId: string, type: 'add' | 'remove') => {
    setActionUserId(userId);
    setActionType(type);
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

  // Show impersonation view if a user is selected
  if (viewingUser) {
    return (
      <AdminUserImpersonation
        userId={viewingUser.id}
        userEmail={viewingUser.email}
        onClose={() => setViewingUser(null)}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage admin roles and view user data ({users.length} total)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((userData) => (
              <div
                key={userData.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  userData.user_id === currentUser?.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {userData.full_name || 'No name'}
                    </p>
                    {userData.is_admin && (
                      <Badge variant="secondary" className="shrink-0">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {userData.user_id === currentUser?.id && (
                      <Badge variant="outline" className="shrink-0">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {userData.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(userData.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="shrink-0 ml-4 flex items-center gap-2">
                  {/* View User Data Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingUser({ id: userData.user_id, email: userData.email })}
                    title="View user data"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {userData.user_id === currentUser?.id ? (
                    <span className="text-xs text-muted-foreground">Cannot modify</span>
                  ) : userData.is_admin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmAction(userData.user_id, 'remove')}
                      className="text-destructive hover:text-destructive"
                    >
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Remove Admin
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmAction(userData.user_id, 'add')}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Make Admin
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!actionUserId && !!actionType} onOpenChange={() => { setActionUserId(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'add' ? 'Grant Admin Role?' : 'Revoke Admin Role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'add' 
                ? 'This user will have full administrative access including viewing all users, managing roles, and viewing audit logs.'
                : 'This user will lose administrative access. They will only be able to access their own data.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRoleAction}
              disabled={isProcessing}
              className={actionType === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'add' ? 'Grant Admin' : 'Revoke Admin'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminUserManagement;