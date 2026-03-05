import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ReportsPage = () => {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const [balanceRes, incomeRes] = await Promise.all([
        axios.get(`${API}/reports/balance-sheet`),
        axios.get(`${API}/reports/income-statement`)
      ]);
      setBalanceSheet(balanceRes.data);
      setIncomeStatement(incomeRes.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = async (reportType) => {
    try {
      const response = await axios.get(`${API}/reports/export/excel?report_type=${reportType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export téléchargé");
    } catch (error) {
      toast.error("Erreur lors de l'export");
    }
  };

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

  const assetData = balanceSheet?.assets?.accounts?.filter(a => a.balance !== 0).map(a => ({
    name: a.name.substring(0, 20),
    value: Math.abs(a.balance)
  })) || [];

  const expenseData = incomeStatement?.expenses?.accounts?.filter(a => a.balance !== 0).map(a => ({
    name: a.name.substring(0, 15),
    value: Math.abs(a.balance)
  })) || [];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Rapports</h1>
          <p className="text-muted-foreground">États financiers et analyses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReports} data-testid="refresh-reports-btn">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="balance-sheet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Bilan</TabsTrigger>
          <TabsTrigger value="income-statement" data-testid="tab-income-statement">Compte de résultat</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analyses</TabsTrigger>
        </TabsList>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleExport('balance-sheet')} data-testid="export-balance-sheet-btn">
              <Download className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Actif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>COMPTE</TableHead>
                      <TableHead className="text-right">SOLDE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceSheet?.assets?.accounts?.map((account) => (
                      <TableRow key={account.code} data-testid={`asset-${account.code}`}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground mr-2">{account.code}</span>
                          {account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>TOTAL ACTIF</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(balanceSheet?.assets?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Liabilities & Equity */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                  Passif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>COMPTE</TableHead>
                      <TableHead className="text-right">SOLDE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceSheet?.liabilities?.accounts?.map((account) => (
                      <TableRow key={account.code} data-testid={`liability-${account.code}`}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground mr-2">{account.code}</span>
                          {account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {balanceSheet?.equity?.accounts?.map((account) => (
                      <TableRow key={account.code} data-testid={`equity-${account.code}`}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground mr-2">{account.code}</span>
                          {account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>TOTAL PASSIF</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency((balanceSheet?.liabilities?.total || 0) + (balanceSheet?.equity?.total || 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Balance Check */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vérification de l'équilibre</span>
                <Badge variant={Math.abs(balanceSheet?.balance_check || 0) < 0.01 ? "default" : "destructive"}>
                  {Math.abs(balanceSheet?.balance_check || 0) < 0.01 ? "Équilibré" : `Écart: ${formatCurrency(balanceSheet?.balance_check)}`}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleExport('invoices')} data-testid="export-income-btn">
              <Download className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Produits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>COMPTE</TableHead>
                      <TableHead className="text-right">MONTANT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeStatement?.revenue?.accounts?.map((account) => (
                      <TableRow key={account.code} data-testid={`revenue-${account.code}`}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground mr-2">{account.code}</span>
                          {account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono amount-positive">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-50 dark:bg-green-950/20 font-medium">
                      <TableCell>TOTAL PRODUITS</TableCell>
                      <TableCell className="text-right font-mono amount-positive">
                        {formatCurrency(incomeStatement?.revenue?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>COMPTE</TableHead>
                      <TableHead className="text-right">MONTANT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeStatement?.expenses?.accounts?.map((account) => (
                      <TableRow key={account.code} data-testid={`expense-${account.code}`}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground mr-2">{account.code}</span>
                          {account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono amount-negative">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-red-50 dark:bg-red-950/20 font-medium">
                      <TableCell>TOTAL CHARGES</TableCell>
                      <TableCell className="text-right font-mono amount-negative">
                        {formatCurrency(incomeStatement?.expenses?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Net Income */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Résultat Net</p>
                  <p className="text-xs text-muted-foreground">
                    Période: {incomeStatement?.period?.start} - {incomeStatement?.period?.end}
                  </p>
                </div>
                <p className={`text-3xl font-bold font-mono ${(incomeStatement?.net_income || 0) >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                  {formatCurrency(incomeStatement?.net_income)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Asset Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Répartition de l'actif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="asset-pie-chart">
                  {assetData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={assetData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {assetData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Répartition des charges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="expense-bar-chart">
                  {expenseData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          type="number"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [formatCurrency(value), 'Montant']}
                        />
                        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Exports disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button variant="outline" onClick={() => handleExport('balance-sheet')} data-testid="export-balance-btn">
                  <Download className="mr-2 h-4 w-4" />
                  Bilan Excel
                </Button>
                <Button variant="outline" onClick={() => handleExport('invoices')} data-testid="export-invoices-btn">
                  <Download className="mr-2 h-4 w-4" />
                  Factures Excel
                </Button>
                <Button variant="outline" onClick={() => handleExport('transactions')} data-testid="export-transactions-btn">
                  <Download className="mr-2 h-4 w-4" />
                  Transactions Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
