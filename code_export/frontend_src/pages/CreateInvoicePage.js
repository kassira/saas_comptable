import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreateInvoicePage = ({ isQuote = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_address: "",
    client_email: "",
    client_siret: "",
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
    payment_terms: "Paiement à 30 jours",
    lines: [
      { description: "", quantity: 1, unit_price: 0, vat_rate: 20, discount: 0 }
    ]
  });

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { description: "", quantity: 1, unit_price: 0, vat_rate: 20, discount: 0 }]
    });
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 1) return;
    const lines = [...formData.lines];
    lines.splice(index, 1);
    setFormData({ ...formData, lines });
  };

  const handleLineChange = (index, field, value) => {
    const lines = [...formData.lines];
    lines[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, lines });
  };

  const calculateLineTotals = (line) => {
    const subtotal = line.quantity * line.unit_price * (1 - (line.discount || 0) / 100);
    const vat = subtotal * line.vat_rate / 100;
    return { subtotal, vat, total: subtotal + vat };
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;
    
    formData.lines.forEach(line => {
      const lineSubtotal = line.quantity * line.unit_price * (1 - (line.discount || 0) / 100);
      subtotal += lineSubtotal;
      totalVat += lineSubtotal * line.vat_rate / 100;
    });
    
    return {
      subtotal,
      totalVat,
      total: subtotal + totalVat
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_name || formData.lines.some(l => !l.description || l.unit_price <= 0)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/invoices`, {
        ...formData,
        invoice_type: isQuote ? "quote" : "invoice"
      });
      toast.success(`${isQuote ? 'Devis' : 'Facture'} créé(e) avec succès`);
      navigate(isQuote ? "/quotes" : "/invoices");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6" data-testid="create-invoice-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {isQuote ? "Nouveau devis" : "Nouvelle facture"}
          </h1>
          <p className="text-muted-foreground">
            {isQuote ? "Créez un devis pour votre client" : "Créez une facture pour votre client"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Client Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="form-label">Nom du client *</Label>
                  <Input
                    placeholder="Nom de l'entreprise"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    required
                    data-testid="client-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@client.com"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    data-testid="client-email-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="form-label">Adresse</Label>
                <Textarea
                  placeholder="Adresse complète"
                  value={formData.client_address}
                  onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                  rows={2}
                  data-testid="client-address-input"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="form-label">SIRET</Label>
                  <Input
                    placeholder="123 456 789 00012"
                    value={formData.client_siret}
                    onChange={(e) => setFormData({ ...formData, client_siret: e.target.value })}
                    data-testid="client-siret-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Date d'échéance *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    data-testid="due-date-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="font-mono">{formatCurrency(totals.totalVat)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total TTC</span>
                  <span className="font-mono text-lg">{formatCurrency(totals.total)}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="save-invoice-btn">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Enregistrement..." : `Créer ${isQuote ? 'le devis' : 'la facture'}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lines */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Lignes</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine} data-testid="add-line-btn">
                <Plus className="mr-1 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">DESCRIPTION</TableHead>
                    <TableHead className="w-[100px]">QTÉ</TableHead>
                    <TableHead className="w-[120px]">PRIX UNIT.</TableHead>
                    <TableHead className="w-[100px]">TVA %</TableHead>
                    <TableHead className="w-[100px]">REMISE %</TableHead>
                    <TableHead className="w-[120px] text-right">TOTAL HT</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.lines.map((line, index) => {
                    const lineTotals = calculateLineTotals(line);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            placeholder="Description du produit/service"
                            value={line.description}
                            onChange={(e) => handleLineChange(index, "description", e.target.value)}
                            required
                            data-testid={`line-description-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                            className="font-mono"
                            data-testid={`line-quantity-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(index, "unit_price", e.target.value)}
                            className="font-mono"
                            data-testid={`line-price-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.vat_rate}
                            onChange={(e) => handleLineChange(index, "vat_rate", e.target.value)}
                            className="font-mono"
                            data-testid={`line-vat-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.discount}
                            onChange={(e) => handleLineChange(index, "discount", e.target.value)}
                            className="font-mono"
                            data-testid={`line-discount-${index}`}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(lineTotals.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLine(index)}
                            disabled={formData.lines.length <= 1}
                            data-testid={`remove-line-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-heading">Notes et conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="form-label">Conditions de paiement</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  data-testid="payment-terms-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="form-label">Notes</Label>
              <Textarea
                placeholder="Notes additionnelles..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                data-testid="notes-input"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CreateInvoicePage;
