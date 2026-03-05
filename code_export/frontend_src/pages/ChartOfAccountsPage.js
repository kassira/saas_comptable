import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Trash2, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const accountTypes = [
  { value: "asset", label: "Actif", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "liability", label: "Passif", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "equity", label: "Capitaux propres", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "revenue", label: "Produit", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "expense", label: "Charge", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
];

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    account_type: "asset",
    parent_code: "",
    description: ""
  });

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Erreur lors du chargement des comptes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/accounts`, newAccount);
      toast.success("Compte créé avec succès");
      setDialogOpen(false);
      setNewAccount({ code: "", name: "", account_type: "asset", parent_code: "", description: "" });
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) return;
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      toast.success("Compte supprimé");
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || account.account_type === filterType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getTypeConfig = (type) => accountTypes.find(t => t.value === type) || accountTypes[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="chart-of-accounts-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Plan Comptable</h1>
          <p className="text-muted-foreground">Gestion des comptes selon le PCG français</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-account-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un compte</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau compte au plan comptable
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAccount}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="form-label">Code</Label>
                    <Input
                      placeholder="ex: 512"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                      required
                      data-testid="account-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">Compte parent</Label>
                    <Input
                      placeholder="ex: 51"
                      value={newAccount.parent_code}
                      onChange={(e) => setNewAccount({ ...newAccount, parent_code: e.target.value })}
                      data-testid="account-parent-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Nom</Label>
                  <Input
                    placeholder="Nom du compte"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    required
                    data-testid="account-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Type</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}
                  >
                    <SelectTrigger data-testid="account-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Description</Label>
                  <Input
                    placeholder="Description optionnelle"
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                    data-testid="account-description-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" data-testid="save-account-btn">Créer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-accounts-input"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" data-testid="filter-type-select">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comptes ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">CODE</TableHead>
                <TableHead>NOM</TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead className="text-right">SOLDE</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => {
                const typeConfig = getTypeConfig(account.account_type);
                return (
                  <TableRow key={account.id} data-testid={`account-row-${account.code}`}>
                    <TableCell className="font-mono font-medium">{account.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        {account.description && (
                          <p className="text-xs text-muted-foreground">{account.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={account.balance >= 0 ? 'amount-positive' : 'amount-negative'}>
                        {formatCurrency(account.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccount(account.id)}
                        data-testid={`delete-account-${account.code}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredAccounts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun compte trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartOfAccountsPage;
