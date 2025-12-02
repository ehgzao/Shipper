import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, ArrowLeft, Briefcase, MapPin, TrendingUp, Target, CheckCircle, Clock, Calendar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { subDays, subMonths, isAfter, parseISO, format, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

interface Opportunity {
  id: string;
  company_name: string;
  role_title: string;
  status: string;
  location: string | null;
  created_at: string | null;
  tags: string[] | null;
}

const FLAG_MAP: Record<string, { flag: string; name: string }> = {
  brazil: { flag: flagBR, name: "Brasil" },
  brasil: { flag: flagBR, name: "Brasil" },
  portugal: { flag: flagPT, name: "Portugal" },
  germany: { flag: flagDE, name: "Alemanha" },
  alemanha: { flag: flagDE, name: "Alemanha" },
  spain: { flag: flagES, name: "Espanha" },
  espanha: { flag: flagES, name: "Espanha" },
  ireland: { flag: flagIE, name: "Irlanda" },
  irlanda: { flag: flagIE, name: "Irlanda" },
  netherlands: { flag: flagNL, name: "Holanda" },
  holanda: { flag: flagNL, name: "Holanda" },
};

const STATUS_COLORS: Record<string, string> = {
  researching: "#6b7280",
  applied: "#3b82f6",
  interviewing: "#8b5cf6",
  offer: "#22c55e",
  rejected: "#ef4444",
  ghosted: "#f97316",
  withdrawn: "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
  researching: "Pesquisando",
  applied: "Aplicado",
  interviewing: "Entrevistando",
  offer: "Oferta",
  rejected: "Rejeitado",
  ghosted: "Ghosted",
  withdrawn: "Desistiu",
};

type TimePeriod = "all" | "week" | "month" | "3months" | "6months";

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "all", label: "Todo período" },
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
];

const normalizeCountry = (location: string | null): string => {
  if (!location) return "Outros";
  const lower = location.toLowerCase();
  for (const [key, value] of Object.entries(FLAG_MAP)) {
    if (lower.includes(key)) return value.name;
  }
  return "Outros";
};

const getDateThreshold = (period: TimePeriod): Date | null => {
  const now = new Date();
  switch (period) {
    case "week": return subDays(now, 7);
    case "month": return subMonths(now, 1);
    case "3months": return subMonths(now, 3);
    case "6months": return subMonths(now, 6);
    default: return null;
  }
};

const Stats = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("opportunities")
        .select("id, company_name, role_title, status, location, created_at, tags")
        .eq("user_id", user.id);

      if (data) setOpportunities(data);
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  // Filter opportunities by time period
  const filteredOpportunities = useMemo(() => {
    const threshold = getDateThreshold(timePeriod);
    if (!threshold) return opportunities;
    
    return opportunities.filter(o => {
      if (!o.created_at) return false;
      return isAfter(parseISO(o.created_at), threshold);
    });
  }, [opportunities, timePeriod]);

  // Stats by role
  const roleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOpportunities.forEach(o => {
      counts[o.role_title] = (counts[o.role_title] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredOpportunities]);

  // Stats by country
  const countryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOpportunities.forEach(o => {
      const country = normalizeCountry(o.location);
      counts[country] = (counts[country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOpportunities]);

  // Stats by status
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOpportunities.forEach(o => {
      const status = o.status || "researching";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ 
        name: STATUS_LABELS[name] || name, 
        value,
        fill: STATUS_COLORS[name] || "#6b7280"
      }));
  }, [filteredOpportunities]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredOpportunities.length;
    const applied = filteredOpportunities.filter(o => o.status !== "researching").length;
    const interviewing = filteredOpportunities.filter(o => o.status === "interviewing").length;
    const offers = filteredOpportunities.filter(o => o.status === "offer").length;
    return { total, applied, interviewing, offers };
  }, [filteredOpportunities]);

  // Tag statistics
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOpportunities.forEach(o => {
      if (o.tags && o.tags.length > 0) {
        o.tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredOpportunities]);

  // Temporal evolution (by week or month depending on date range)
  const temporalStats = useMemo(() => {
    if (opportunities.length === 0) return [];
    
    const oppsWithDates = opportunities.filter(o => o.created_at);
    if (oppsWithDates.length === 0) return [];
    
    const dates = oppsWithDates.map(o => parseISO(o.created_at!));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const daysDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const useMonths = daysDiff > 60;
    
    if (useMonths) {
      const months = eachMonthOfInterval({ start: minDate, end: maxDate });
      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const count = oppsWithDates.filter(o => {
          const d = parseISO(o.created_at!);
          return d >= monthStart && d <= monthEnd;
        }).length;
        return {
          period: format(month, "MMM/yy", { locale: ptBR }),
          total: count,
        };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
      return weeks.map(week => {
        const weekStart = startOfWeek(week, { weekStartsOn: 1 });
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        const count = oppsWithDates.filter(o => {
          const d = parseISO(o.created_at!);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return {
          period: format(weekStart, "dd/MM", { locale: ptBR }),
          total: count,
        };
      });
    }
  }, [opportunities]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Ship className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="container-wide">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <Ship className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Shipper</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estatísticas
              </h1>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-wide py-8">
        {opportunities.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sem dados ainda</h2>
            <p className="text-muted-foreground mb-4">
              Adicione oportunidades ao seu pipeline para ver estatísticas.
            </p>
            <Button onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.applied}</p>
                      <p className="text-xs text-muted-foreground">Aplicados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.interviewing}</p>
                      <p className="text-xs text-muted-foreground">Entrevistando</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.offers}</p>
                      <p className="text-xs text-muted-foreground">Ofertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* By Role */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4" />
                    Por Cargo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roleStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={roleStats} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={120}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} oportunidades`, '']}
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* By Country */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Por País
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {countryStats.length > 0 ? (
                    <div className="space-y-3">
                      {countryStats.map((item) => {
                        const flagInfo = Object.values(FLAG_MAP).find(f => f.name === item.name);
                        const percentage = Math.round((item.value / filteredOpportunities.length) * 100);
                        return (
                          <div key={item.name} className="flex items-center gap-3">
                            {flagInfo ? (
                              <img 
                                src={flagInfo.flag} 
                                alt={item.name} 
                                className="w-6 h-4 object-cover rounded-sm"
                              />
                            ) : (
                              <div className="w-6 h-4 bg-muted rounded-sm" />
                            )}
                            <span className="text-sm font-medium w-24">{item.name}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right">
                              {item.value} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* By Status */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusStats.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={statusStats}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {statusStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} oportunidades`, '']}
                            contentStyle={{ 
                              background: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-4">
                        {statusStats.map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-sm">{item.name}</span>
                            <span className="text-sm font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Temporal Evolution */}
              {temporalStats.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      Evolução Temporal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={temporalStats} margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} oportunidades`, 'Total']}
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tags Statistics */}
              {tagStats.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4" />
                      Tags Mais Usadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {tagStats.map((tag, index) => (
                        <div 
                          key={tag.name}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                        >
                          <span className="text-xs font-semibold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium">{tag.name}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {tag.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Stats;
