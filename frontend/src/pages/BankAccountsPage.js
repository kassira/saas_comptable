import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, CreditCard, Upload, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BankAccountsPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  const [newAccount, setNewAccount] = useState({
    name: "",
    bank_name: "",
    iban: "",
    bic: "",
    initial_balance: 0
  });

  const [newTransaction, setNewTransaction] = useState({
    bank_account_id: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: 0,
    transaction_type: "credit",
    category: "",
    reference: ""
  });

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/bank-transactions`)
      ]);
      setBankAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/bank-accounts`, newAccount);
      toast.success("Compte créé avec succès");
      setDialogOpen(false);
      setNewAccount({ name: "", bank_name: "", iban: "", bic: "", initial_balance: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) return;
    try {
      await axios.delete(`${API}/bank-accounts/${accountId}`);
      toast.success("Compte supprimé");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/bank-transactions`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      toast.success("Transaction ajoutée");
      setTransactionDialogOpen(false);
      setNewTransaction({
        bank_account_id: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: 0,
        transaction_type: "credit",
        category: "",
        reference: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleReconcile = async (transactionId) => {
    try {
      await axios.put(`${API}/bank-transactions/${transactionId}/reconcile`);
      toast.success("Transaction rapprochée");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors du rapprochement");
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

  return (
    <div className="space-y-6" data-testid="bank-accounts-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Comptes Bancaires</h1>
          <p className="text-muted-foreground">Gérez vos comptes et transactions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-transaction-btn">
                <Plus className="mr-2 h-4 w-4" />
                Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle transaction</DialogTitle>
                <DialogDescription>
                  Ajoutez une transaction manuellement
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="form-label">Compte</Label>
                    <Select
                      value={newTransaction.bank_account_id}
                      onValueChange={(value) => setNewTransaction({ ...newTransaction, bank_account_id: value })}
                    >
                      <SelectTrigger data-testid="transaction-account-select">
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} - {acc.bank_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="form-label">Date</Label>
                      <Input
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                        required
                        data-testid="transaction-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="form-label">Type</Label>
                      <Select
                        value={newTransaction.transaction_type}
                        onValueChange={(value) => setNewTransaction({ ...newTransaction, transaction_type: value })}
                      >
                        <SelectTrigger data-testid="transaction-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Encaissement</SelectItem>
                          <SelectItem value="debit">Décaissement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">Description</Label>
                    <Input
                      placeholder="Description de la transaction"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      required
                      data-testid="transaction-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="form-label">Montant</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                        required
                        data-testid="transaction-amount-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="form-label">Catégorie</Label>
                      <Input
                        placeholder="ex: Loyer, Ventes..."
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                        data-testid="transaction-category-input"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTransactionDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" data-testid="save-transaction-btn">Ajouter</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-account-btn">
                <CreditCard className="mr-2 h-4 w-4" />
                Nouveau compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un compte bancaire</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau compte bancaire
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAccount}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="form-label">Nom du compte</Label>
                    <Input
                      placeholder="ex: Compte Principal"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      required
                      data-testid="account-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">Banque</Label>
                    <Input
                      placeholder="ex: BNP Paribas"
                      value={newAccount.bank_name}
                      onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                      required
                      data-testid="account-bank-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">IBAN</Label>
                    <Input
                      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                      value={newAccount.iban}
                      onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })}
                      required
                      data-testid="account-iban-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="form-label">BIC</Label>
                      <Input
                        placeholder="BNPAFRPP"
                        value={newAccount.bic}
                        onChange={(e) => setNewAccount({ ...newAccount, bic: e.target.value })}
                        data-testid="account-bic-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="form-label">Solde initial</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newAccount.initial_balance}
                        onChange={(e) => setNewAccount({ ...newAccount, initial_balance: parseFloat(e.target.value) || 0 })}
                        data-testid="account-balance-input"
                      />
                    </div>
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
      </div>

      {/* Bank Accounts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="card-hover" data-testid={`bank-account-card-${account.name}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAccount(account.id)}
                  data-testid={`delete-account-${account.name}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
              <h3 className="font-heading font-semibold">{account.name}</h3>
              <p className="text-sm text-muted-foreground">{account.bank_name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{account.iban}</p>
              <p className={`text-2xl font-bold font-mono mt-4 ${account.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                {formatCurrency(account.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
        {bankAccounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold mb-2">Aucun compte bancaire</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez votre premier compte pour commencer
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un compte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>COMPTE</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead>CATÉGORIE</TableHead>
                  <TableHead>STATUT</TableHead>
                  <TableHead className="text-right">MONTANT</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((transaction) => {
                  const account = bankAccounts.find(a => a.id === transaction.bank_account_id);
                  return (
                    <TableRow key={transaction.id} data-testid={`transaction-${transaction.id}`}>
                      <TableCell className="font-mono text-sm">{transaction.date}</TableCell>
                      <TableCell>{account?.name || '-'}</TableCell>
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
                      <TableCell>
                        {!transaction.reconciled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReconcile(transaction.id)}
                            title="Rapprocher"
                            data-testid={`reconcile-${transaction.id}`}
                          >
                            <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-green-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountsPage;
