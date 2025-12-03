import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { format, subDays, parseISO, startOfDay, isWithinInterval } from "date-fns";

interface RecentLogin {
  email: string;
  success: boolean;
  ip_address: string | null;
  created_at: string;
}

interface SecurityTrendsChartProps {
  recentLogins: RecentLogin[] | null;
  failedLoginsToday: number;
  successfulLoginsToday: number;
  lockedAccounts: number;
}

const COLORS = {
  success: 'hsl(142, 76%, 36%)',
  failed: 'hsl(0, 84%, 60%)',
  locked: 'hsl(45, 93%, 47%)',
};

export const SecurityTrendsChart = ({
  recentLogins,
  failedLoginsToday,
  successfulLoginsToday,
  lockedAccounts,
}: SecurityTrendsChartProps) => {
  // Process login data for the last 7 days
  const loginTrends = useMemo(() => {
    if (!recentLogins || recentLogins.length === 0) {
      return [];
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: startOfDay(date),
        successful: 0,
        failed: 0,
      };
    });

    recentLogins.forEach((login) => {
      const loginDate = startOfDay(parseISO(login.created_at));
      const dayData = last7Days.find((day) =>
        day.fullDate.getTime() === loginDate.getTime()
      );

      if (dayData) {
        if (login.success) {
          dayData.successful += 1;
        } else {
          dayData.failed += 1;
        }
      }
    });

    return last7Days.map(({ date, successful, failed }) => ({
      date,
      successful,
      failed,
    }));
  }, [recentLogins]);

  // Process hourly distribution for today
  const hourlyDistribution = useMemo(() => {
    if (!recentLogins) return [];

    const today = startOfDay(new Date());
    const tomorrow = subDays(today, -1);

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      logins: 0,
    }));

    recentLogins.forEach((login) => {
      const loginDate = parseISO(login.created_at);
      if (isWithinInterval(loginDate, { start: today, end: tomorrow })) {
        const hour = loginDate.getHours();
        hours[hour].logins += 1;
      }
    });

    return hours;
  }, [recentLogins]);

  // Pie chart data for success/failure ratio
  const pieData = useMemo(() => {
    const total = successfulLoginsToday + failedLoginsToday;
    if (total === 0) return [];

    return [
      { name: 'Successful', value: successfulLoginsToday, color: COLORS.success },
      { name: 'Failed', value: failedLoginsToday, color: COLORS.failed },
    ];
  }, [successfulLoginsToday, failedLoginsToday]);

  // Calculate threat level
  const threatLevel = useMemo(() => {
    const failureRate = failedLoginsToday / (successfulLoginsToday + failedLoginsToday || 1);
    
    if (lockedAccounts > 0 || failureRate > 0.3) {
      return { level: 'High', color: 'text-red-500', bg: 'bg-red-500/10' };
    } else if (failureRate > 0.1) {
      return { level: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    }
    return { level: 'Low', color: 'text-green-500', bg: 'bg-green-500/10' };
  }, [failedLoginsToday, successfulLoginsToday, lockedAccounts]);

  return (
    <div className="space-y-6">
      {/* Threat Level Indicator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            Current Threat Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${threatLevel.bg}`}>
            <AlertTriangle className={`h-4 w-4 ${threatLevel.color}`} />
            <span className={`font-semibold ${threatLevel.color}`}>
              {threatLevel.level}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {failedLoginsToday} failed logins and {lockedAccounts} locked accounts today
          </p>
        </CardContent>
      </Card>

      {/* Login Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Login Trends (Last 7 Days)
          </CardTitle>
          <CardDescription>
            Successful vs failed login attempts over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginTrends.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loginTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success, strokeWidth: 2 }}
                    name="Successful"
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke={COLORS.failed}
                    strokeWidth={2}
                    dot={{ fill: COLORS.failed, strokeWidth: 2 }}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No login data available for the last 7 days
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Login Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Login Activity</CardTitle>
            <CardDescription>Hourly distribution of login attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyDistribution.some(h => h.logins > 0) ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      interval={3}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="logins" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No login activity today yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Success/Failure Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Login Success Rate</CardTitle>
            <CardDescription>Today's authentication outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No login data available today
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityTrendsChart;
