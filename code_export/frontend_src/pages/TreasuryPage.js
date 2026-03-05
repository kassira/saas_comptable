import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  Plus
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TreasuryPage = () => {
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes, forecastRes, alertsRes] = await Promise.all([
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/bank-transactions`),
        axios.get(`${API}/treasury/cash-flow-forecast`),
        axios.get(`${API}/treasury/alerts`)
      ]);
      setBankAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
      setForecast(forecastRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error("Failed to fetch treasury data:", error);
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

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const monthlyIncome = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="treasury-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Trésorerie</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre trésorerie</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} data-testid="refresh-treasury-btn">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => navigate("/treasury/accounts")} data-testid="manage-accounts-btn">
            <CreditCard className="mr-2 h-4 w-4" />
            Comptes bancaires
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover" data-testid="stat-total-balance">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Solde total</p>
                <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(totalBalance)}</p>
                <p className="text-sm text-muted-foreground mt-1">{bankAccounts.length} compte(s)</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-income">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Encaissements</p>
                <p className="text-2xl font-bold font-mono mt-2 amount-positive">{formatCurrency(monthlyIncome)}</p>
                <div className="flex items-center gap-1 mt-1 text-sm text-green-600 dark:text-green-400">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Ce mois</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-expenses">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Décaissements</p>
                <p className="text-2xl font-bold font-mono mt-2 amount-negative">{formatCurrency(monthlyExpenses)}</p>
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400">
                  <ArrowDownRight className="h-4 w-4" />
                  <span>Ce mois</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Prévisionnel de trésorerie</CardTitle>
            <CardDescription>Projection sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" data-testid="forecast-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value) => [formatCurrency(value), 'Solde']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_balance"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Comptes bancaires</CardTitle>
            <CardDescription>Solde par compte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="bank-accounts-list">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{account.iban}</p>
                    </div>
                  </div>
                  <p className={`font-mono font-bold ${account.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              ))}
              {bankAccounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun compte bancaire</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => navigate("/treasury/accounts")}
                  >
                    Ajouter un compte
                  </Button>
                </div>
              )}
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
              Alertes trésorerie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="treasury-alerts">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' 
                      ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' 
                      : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DATE</TableHead>
                <TableHead>DESCRIPTION</TableHead>
                <TableHead>CATÉGORIE</TableHead>
                <TableHead>STATUT</TableHead>
                <TableHead className="text-right">MONTANT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((transaction) => (
                <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                  <TableCell className="font-mono text-sm">{transaction.date}</TableCell>
                  <TableCell>
                    <p className="font-medium">{transaction.description}</p>
                    {transaction.reference && (
                      <p className="text-xs text-muted-foreground">{transaction.reference}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category || 'Non catégorisé'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.reconciled ? "default" : "secondary"}>
                      {transaction.reconciled ? "Rapproché" : "À rapprocher"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium ${
                    transaction.transaction_type === 'credit' ? 'amount-positive' : 'amount-negative'
                  }`}>
                    {transaction.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transactions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune transaction
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasuryPage;
