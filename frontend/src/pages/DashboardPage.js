import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, change, changeType, icon: Icon, onClick }) => (
  <Card className="card-hover cursor-pointer" onClick={onClick} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold font-mono mt-2">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {changeType === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AlertCard = ({ alert }) => {
  const severityStyles = {
    critical: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
    warning: "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    info: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
  };

  return (
    <div className={`p-4 rounded-lg ${severityStyles[alert.severity]}`} data-testid={`alert-${alert.type}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
        <div>
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(alert.created_at).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/reports/dashboard-stats`),
        axios.get(`${API}/treasury/alerts`)
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes("company")) {
        toast.info("Veuillez d'abord créer votre entreprise");
        navigate("/settings/company");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6" data-testid="dashboard-no-company">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="font-heading text-xl font-semibold mb-2">Bienvenue sur FinanceManager Pro</h2>
            <p className="text-muted-foreground mb-6">
              Pour commencer, créez votre entreprise et configurez vos paramètres.
            </p>
            <Button onClick={() => navigate("/settings/company")} data-testid="create-company-btn">
              <Plus className="mr-2 h-4 w-4" />
              Créer mon entreprise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => navigate("/invoices/new")} data-testid="new-invoice-btn">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Solde bancaire"
          value={formatCurrency(stats.total_balance)}
          icon={Wallet}
          onClick={() => navigate("/treasury")}
        />
        <StatCard
          title="CA du mois"
          value={formatCurrency(stats.monthly_revenue)}
          change="+12.5%"
          changeType="up"
          icon={TrendingUp}
          onClick={() => navigate("/reports")}
        />
        <StatCard
          title="Factures en attente"
          value={formatCurrency(stats.pending_invoices)}
          icon={FileText}
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          title="Dépenses du mois"
          value={formatCurrency(stats.monthly_expenses)}
          icon={TrendingDown}
          onClick={() => navigate("/treasury")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Évolution du CA</CardTitle>
            <CardDescription>Chiffre d'affaires sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" data-testid="revenue-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenue_by_month}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Revenu']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Status */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">État des factures</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" data-testid="invoices-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Payées', value: stats.paid_invoices, fill: 'hsl(var(--chart-2))' },
                  { name: 'En attente', value: stats.pending_invoices, fill: 'hsl(var(--chart-1))' },
                  { name: 'En retard', value: stats.overdue_invoices, fill: 'hsl(var(--destructive))' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Montant']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertes
            </CardTitle>
            <CardDescription>Points d'attention nécessitant votre action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="alerts-list">
              {alerts.slice(0, 5).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/invoices")} data-testid="quick-stat-invoices">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total facturé</p>
                <p className="text-xl font-bold font-mono mt-1">{formatCurrency(stats.total_invoiced)}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/treasury/accounts")} data-testid="quick-stat-accounts">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Comptes bancaires</p>
                <p className="text-xl font-bold font-mono mt-1">{stats.bank_accounts_count}</p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => navigate("/invoices")} data-testid="quick-stat-invoice-count">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Nombre de factures</p>
                <p className="text-xl font-bold font-mono mt-1">{stats.invoices_count}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
