import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Download, Send, CheckCircle, RefreshCw, Eye } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  draft: { label: "Brouillon", class: "status-draft" },
  sent: { label: "Envoyée", class: "status-sent" },
  paid: { label: "Payée", class: "status-paid" },
  overdue: { label: "En retard", class: "status-overdue" },
  cancelled: { label: "Annulée", class: "status-cancelled" }
};

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`, {
        params: { invoice_type: "invoice" }
      });
      setInvoices(response.data);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/status?status=${newStatus}`);
      toast.success("Statut mis à jour");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
    }
  };

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const totals = {
    total: filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
    paid: filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    pending: filteredInvoices.filter(inv => ['draft', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + inv.total, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Factures</h1>
          <p className="text-muted-foreground">Gérez vos factures clients</p>
        </div>
        <Button onClick={() => navigate("/invoices/new")} data-testid="new-invoice-btn">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total facturé</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Encaissé</p>
            <p className="text-2xl font-bold font-mono mt-1 amount-positive">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">En attente</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-invoices-input"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="filter-status-select">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factures ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NUMÉRO</TableHead>
                <TableHead>CLIENT</TableHead>
                <TableHead>DATE</TableHead>
                <TableHead>ÉCHÉANCE</TableHead>
                <TableHead>STATUT</TableHead>
                <TableHead className="text-right">MONTANT TTC</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft;
                const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
                
                return (
                  <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.invoice_number}`}>
                    <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.client_name}</p>
                        {invoice.client_email && (
                          <p className="text-xs text-muted-foreground">{invoice.client_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{invoice.date}</TableCell>
                    <TableCell className={`font-mono text-sm ${isOverdue ? 'text-destructive' : ''}`}>
                      {invoice.due_date}
                    </TableCell>
                    <TableCell>
                      <Badge className={`status-badge ${status.class}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`invoice-menu-${invoice.invoice_number}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id, invoice.invoice_number)}>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                              <Send className="mr-2 h-4 w-4" />
                              Marquer envoyée
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marquer payée
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune facture trouvée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPage;
