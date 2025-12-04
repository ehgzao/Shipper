import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, RefreshCw, AlertTriangle, Loader2, RotateCcw, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RateLimitDetail {
  user_id: string;
  email: string;
  request_count: number;
  reset_date: string;
}

interface AdminRateLimitOverrideProps {
  rateLimitDetails: RateLimitDetail[] | null;
  onRefresh: () => void;
}

const DAILY_LIMIT = 10;

export const AdminRateLimitOverride = ({ rateLimitDetails, onRefresh }: AdminRateLimitOverrideProps) => {
  const [selectedUser, setSelectedUser] = useState<RateLimitDetail | null>(null);
  const [newCount, setNewCount] = useState("");
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [isSettingLimit, setIsSettingLimit] = useState(false);
  const { toast } = useToast();

  const handleResetLimit = async (userId: string, email: string) => {
    setIsResetting(userId);
    try {
      const { error } = await supabase.rpc('admin_reset_rate_limit', {
        p_target_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "Rate Limit Reset",
        description: `Successfully reset rate limit for ${email}`,
      });
      onRefresh();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(null);
    }
  };

  const handleSetLimit = async () => {
    if (!selectedUser || !newCount) return;

    setIsSettingLimit(true);
    try {
      const { error } = await supabase.rpc('admin_set_rate_limit', {
        p_target_user_id: selectedUser.user_id,
        p_new_count: parseInt(newCount)
      });

      if (error) throw error;

      toast({
        title: "Rate Limit Updated",
        description: `Set usage to ${newCount} for ${selectedUser.email}`,
      });
      setSelectedUser(null);
      setNewCount("");
      onRefresh();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSettingLimit(false);
    }
  };

  const getUsageStatus = (count: number) => {
    if (count >= DAILY_LIMIT) return { label: 'Limit Reached', variant: 'destructive' as const, color: 'text-destructive' };
    if (count >= 7) return { label: 'High Usage', variant: 'secondary' as const, color: 'text-warning' };
    return { label: 'Normal', variant: 'default' as const, color: 'text-muted-foreground' };
  };

  // Filter to show only users approaching limits (7+ requests)
  const usersApproachingLimit = rateLimitDetails?.filter(d => d.request_count >= 7) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Coach Rate Limit Management
          </CardTitle>
          <CardDescription>
            Override rate limits for users approaching or at their daily limit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Users Section */}
          {usersApproachingLimit.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                Users Approaching Limits ({usersApproachingLimit.length})
              </div>
              
              <div className="space-y-2">
                {usersApproachingLimit.map((detail) => {
                  const status = getUsageStatus(detail.request_count);
                  const usagePercent = (detail.request_count / DAILY_LIMIT) * 100;
                  
                  return (
                    <div 
                      key={`${detail.user_id}-${detail.reset_date}`}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{detail.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(detail.reset_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Usage</span>
                          <span className="font-mono">{detail.request_count}/{DAILY_LIMIT}</span>
                        </div>
                        <Progress value={usagePercent} className="h-1.5" />
                      </div>
                      
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetLimit(detail.user_id, detail.email)}
                          disabled={isResetting === detail.user_id}
                          className="flex-1"
                        >
                          {isResetting === detail.user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reset
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(detail);
                            setNewCount(String(detail.request_count));
                          }}
                          className="flex-1"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Adjust
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Users Table */}
          {rateLimitDetails && rateLimitDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">User</th>
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-right py-3 px-2 font-medium">Usage</th>
                    <th className="text-right py-3 px-2 font-medium">Status</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimitDetails.map((detail) => {
                    const status = getUsageStatus(detail.request_count);
                    return (
                      <tr key={`${detail.user_id}-${detail.reset_date}`} className="border-b last:border-0">
                        <td className="py-3 px-2 text-muted-foreground">{detail.email}</td>
                        <td className="py-3 px-2">{format(new Date(detail.reset_date), 'MMM d')}</td>
                        <td className="py-3 px-2 text-right font-mono">{detail.request_count}/{DAILY_LIMIT}</td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetLimit(detail.user_id, detail.email)}
                              disabled={isResetting === detail.user_id}
                            >
                              {isResetting === detail.user_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(detail);
                                setNewCount(String(detail.request_count));
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Adjust Limit Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Rate Limit</DialogTitle>
            <DialogDescription>
              Set a custom usage count for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Usage</label>
              <p className="text-2xl font-bold">{selectedUser?.request_count}/{DAILY_LIMIT}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Usage Count</label>
              <Input
                type="number"
                min="0"
                max="20"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
                placeholder="Enter new count"
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to fully reset. Set above 10 to temporarily block user.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSetLimit} disabled={isSettingLimit || !newCount}>
              {isSettingLimit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRateLimitOverride;
