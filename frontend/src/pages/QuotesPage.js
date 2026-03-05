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
import { Plus, Search, MoreVertical, Download, FileText, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  draft: { label: "Brouillon", class: "status-draft" },
  sent: { label: "Envoyé", class: "status-sent" },
  accepted: { label: "Accepté", class: "status-paid" },
  rejected: { label: "Refusé", class: "status-overdue" },
  cancelled: { label: "Annulé", class: "status-cancelled" }
};

const QuotesPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchQuotes = async () => {
    try {
      const response = await axios.get(`${API}/invoices`, {
        params: { invoice_type: "quote" }
      });
      setQuotes(response.data);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleConvertToInvoice = async (quoteId) => {
    try {
      await axios.post(`${API}/invoices/${quoteId}/convert`);
      toast.success("Devis converti en facture");
      navigate("/invoices");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la conversion");
    }
  };

  const handleDownloadPdf = async (quoteId, quoteNumber) => {
    try {
      const response = await axios.get(`${API}/invoices/${quoteId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quoteNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="space-y-6" data-testid="quotes-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Devis</h1>
          <p className="text-muted-foreground">Gérez vos devis clients</p>
        </div>
        <Button onClick={() => navigate("/quotes/new")} data-testid="new-quote-btn">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
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
                data-testid="search-quotes-input"
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

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devis ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NUMÉRO</TableHead>
                <TableHead>CLIENT</TableHead>
                <TableHead>DATE</TableHead>
                <TableHead>VALIDITÉ</TableHead>
                <TableHead>STATUT</TableHead>
                <TableHead className="text-right">MONTANT TTC</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => {
                const status = statusConfig[quote.status] || statusConfig.draft;
                
                return (
                  <TableRow key={quote.id} data-testid={`quote-row-${quote.invoice_number}`}>
                    <TableCell className="font-mono font-medium">{quote.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quote.client_name}</p>
                        {quote.client_email && (
                          <p className="text-xs text-muted-foreground">{quote.client_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{quote.date}</TableCell>
                    <TableCell className="font-mono text-sm">{quote.due_date}</TableCell>
                    <TableCell>
                      <Badge className={`status-badge ${status.class}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`quote-menu-${quote.invoice_number}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadPdf(quote.id, quote.invoice_number)}>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToInvoice(quote.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Convertir en facture
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredQuotes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun devis trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesPage;
