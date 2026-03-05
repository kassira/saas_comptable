import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import { Plus, Trash2, RefreshCw, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JournalEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: "",
    description: "",
    lines: [
      { account_code: "", account_name: "", debit: 0, credit: 0, description: "" },
      { account_code: "", account_name: "", debit: 0, credit: 0, description: "" }
    ]
  });

  const fetchData = async () => {
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        axios.get(`${API}/journal-entries`),
        axios.get(`${API}/accounts`)
      ]);
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    setNewEntry({
      ...newEntry,
      lines: [...newEntry.lines, { account_code: "", account_name: "", debit: 0, credit: 0, description: "" }]
    });
  };

  const handleRemoveLine = (index) => {
    if (newEntry.lines.length <= 2) return;
    const lines = [...newEntry.lines];
    lines.splice(index, 1);
    setNewEntry({ ...newEntry, lines });
  };

  const handleLineChange = (index, field, value) => {
    const lines = [...newEntry.lines];
    lines[index][field] = value;
    
    if (field === "account_code") {
      const account = accounts.find(a => a.code === value);
      if (account) {
        lines[index].account_name = account.name;
      }
    }
    
    setNewEntry({ ...newEntry, lines });
  };

  const calculateTotals = () => {
    const totalDebit = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = newEntry.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    const { balanced } = calculateTotals();
    
    if (!balanced) {
      toast.error("L'écriture doit être équilibrée (débit = crédit)");
      return;
    }

    try {
      await axios.post(`${API}/journal-entries`, {
        ...newEntry,
        lines: newEntry.lines.map(line => ({
          ...line,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0
        }))
      });
      toast.success("Écriture créée avec succès");
      setDialogOpen(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        reference: "",
        description: "",
        lines: [
          { account_code: "", account_name: "", debit: 0, credit: 0, description: "" },
          { account_code: "", account_name: "", debit: 0, credit: 0, description: "" }
        ]
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleValidateEntry = async (entryId) => {
    try {
      await axios.put(`${API}/journal-entries/${entryId}/validate`);
      toast.success("Écriture validée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la validation");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette écriture ?")) return;
    try {
      await axios.delete(`${API}/journal-entries/${entryId}`);
      toast.success("Écriture supprimée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const { totalDebit, totalCredit, balanced } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="journal-entries-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Écritures Comptables</h1>
          <p className="text-muted-foreground">Journal des écritures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-entry-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle écriture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une écriture comptable</DialogTitle>
              <DialogDescription>
                Saisissez les informations de l'écriture
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEntry}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="form-label">Date</Label>
                    <Input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      required
                      data-testid="entry-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">Référence</Label>
                    <Input
                      placeholder="ex: FA-2024-001"
                      value={newEntry.reference}
                      onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })}
                      required
                      data-testid="entry-reference-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="form-label">Libellé</Label>
                    <Input
                      placeholder="Description de l'écriture"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      required
                      data-testid="entry-description-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="form-label">Lignes</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>COMPTE</TableHead>
                          <TableHead>LIBELLÉ</TableHead>
                          <TableHead className="text-right">DÉBIT</TableHead>
                          <TableHead className="text-right">CRÉDIT</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newEntry.lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={line.account_code}
                                onValueChange={(value) => handleLineChange(index, "account_code", value)}
                              >
                                <SelectTrigger className="w-[200px]" data-testid={`line-account-${index}`}>
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map((acc) => (
                                    <SelectItem key={acc.code} value={acc.code}>
                                      {acc.code} - {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Description"
                                value={line.description}
                                onChange={(e) => handleLineChange(index, "description", e.target.value)}
                                data-testid={`line-desc-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="text-right font-mono"
                                value={line.debit || ""}
                                onChange={(e) => handleLineChange(index, "debit", e.target.value)}
                                data-testid={`line-debit-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="text-right font-mono"
                                value={line.credit || ""}
                                onChange={(e) => handleLineChange(index, "credit", e.target.value)}
                                data-testid={`line-credit-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLine(index)}
                                disabled={newEntry.lines.length <= 2}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="text-right font-medium">
                            TOTAUX
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(totalDebit)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(totalCredit)}
                          </TableCell>
                          <TableCell>
                            {balanced ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <X className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  {!balanced && (
                    <p className="text-sm text-destructive">
                      Écart: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!balanced} data-testid="save-entry-btn">
                  Créer l'écriture
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Écritures ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="card-hover" data-testid={`entry-card-${entry.reference}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{entry.date}</span>
                        <span className="font-medium">{entry.reference}</span>
                        <Badge variant={entry.status === "validated" ? "default" : "secondary"}>
                          {entry.status === "validated" ? "Validée" : "Brouillon"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {entry.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidateEntry(entry.id)}
                            data-testid={`validate-entry-${entry.reference}`}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Valider
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                            data-testid={`delete-entry-${entry.reference}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>COMPTE</TableHead>
                        <TableHead>LIBELLÉ</TableHead>
                        <TableHead className="text-right">DÉBIT</TableHead>
                        <TableHead className="text-right">CRÉDIT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{line.account_code} - {line.account_name}</TableCell>
                          <TableCell className="text-muted-foreground">{line.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            {line.debit > 0 && formatCurrency(line.debit)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.credit > 0 && formatCurrency(line.credit)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={2} className="font-medium text-right">TOTAUX</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(entry.total_debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(entry.total_credit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
            {entries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucune écriture comptable
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntriesPage;
