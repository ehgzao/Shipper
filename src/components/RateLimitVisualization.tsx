import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bot, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DAILY_LIMIT = 10;

interface RateLimitVisualizationProps {
  compact?: boolean;
}

export const RateLimitVisualization = ({ compact = false }: RateLimitVisualizationProps) => {
  const [usedRequests, setUsedRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRemainingRequests();
    }
  }, [user]);

  const fetchRemainingRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_ai_coach_remaining_requests', {
        p_user_id: user.id,
        p_daily_limit: DAILY_LIMIT,
      });

      if (error) throw error;
      setUsedRequests(DAILY_LIMIT - (data as number));
    } catch (error) {
      console.error('Error fetching rate limit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const remaining = DAILY_LIMIT - usedRequests;
  const usagePercentage = (usedRequests / DAILY_LIMIT) * 100;

  // Determine status
  const getStatus = () => {
    if (remaining <= 0) {
      return { level: 'exhausted', label: 'Limit Reached', color: 'bg-destructive', textColor: 'text-destructive' };
    }
    if (remaining <= 2) {
      return { level: 'critical', label: 'Low', color: 'bg-destructive', textColor: 'text-destructive' };
    }
    if (remaining <= 4) {
      return { level: 'warning', label: 'Getting Low', color: 'bg-warning', textColor: 'text-warning' };
    }
    return { level: 'good', label: 'Available', color: 'bg-status-offer', textColor: 'text-status-offer' };
  };

  const status = getStatus();

  if (isLoading) {
    return compact ? null : (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse h-4 bg-muted rounded w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <span className={remaining <= 2 ? status.textColor : 'text-muted-foreground'}>
          {remaining}/{DAILY_LIMIT} remaining
        </span>
        {remaining <= 2 && <AlertTriangle className="h-3 w-3 text-warning" />}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Coach Usage
          </div>
          <Badge 
            variant={status.level === 'good' ? 'default' : 'destructive'}
            className={status.level === 'warning' ? 'bg-warning text-warning-foreground' : ''}
          >
            {status.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Daily limit resets at midnight UTC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used today</span>
            <span className="font-medium">
              {usedRequests} / {DAILY_LIMIT} requests
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
        </div>

        {/* Status message */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          status.level === 'exhausted' ? 'bg-destructive/10 text-destructive' :
          status.level === 'critical' ? 'bg-destructive/10 text-destructive' :
          status.level === 'warning' ? 'bg-warning/10 text-warning' :
          'bg-status-offer/10 text-status-offer'
        }`}>
          {status.level === 'good' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {status.level === 'exhausted' 
              ? "You've reached today's limit. Try again tomorrow!"
              : status.level === 'critical'
              ? `Only ${remaining} request${remaining !== 1 ? 's' : ''} left today. Use wisely!`
              : status.level === 'warning'
              ? `${remaining} requests remaining. Consider prioritizing.`
              : `${remaining} AI coaching sessions available today.`
            }
          </span>
        </div>

        {/* Usage breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{remaining}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{usedRequests}</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{DAILY_LIMIT}</p>
            <p className="text-xs text-muted-foreground">Daily Limit</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RateLimitVisualization;
