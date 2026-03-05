import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save, RefreshCw, Database, Plus } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CompanyPage = () => {
  const { user, updateUser } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    siret: "",
    address: "",
    city: "",
    postal_code: "",
    country: "France",
    phone: "",
    email: "",
    vat_number: "",
    capital: ""
  });

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${API}/companies`);
      setCompanies(response.data);
      
      // If user has a company, load its data
      if (response.data.length > 0) {
        const company = response.data[0];
        setFormData({
          name: company.name || "",
          siret: company.siret || "",
          address: company.address || "",
          city: company.city || "",
          postal_code: company.postal_code || "",
          country: company.country || "France",
          phone: company.phone || "",
          email: company.email || "",
          vat_number: company.vat_number || "",
          capital: company.capital || ""
        });
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        capital: formData.capital ? parseFloat(formData.capital) : null
      };

      if (companies.length > 0) {
        // Update existing company
        await axios.put(`${API}/companies/${companies[0].id}`, payload);
        toast.success("Entreprise mise à jour");
      } else {
        // Create new company
        const response = await axios.post(`${API}/companies`, payload);
        updateUser({ company_id: response.data.id });
        toast.success("Entreprise créée avec succès");
      }
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      await axios.post(`${API}/demo/seed`);
      toast.success("Données de démonstration ajoutées");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'ajout des données");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCompany = companies.length > 0;

  return (
    <div className="space-y-6" data-testid="company-page">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {hasCompany ? "Informations de l'entreprise" : "Créer votre entreprise"}
        </h1>
        <p className="text-muted-foreground">
          {hasCompany ? "Mettez à jour les informations de votre entreprise" : "Configurez votre entreprise pour commencer"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="form-label">Raison sociale *</Label>
                <Input
                  name="name"
                  placeholder="Nom de l'entreprise"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-testid="company-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label">SIRET</Label>
                <Input
                  name="siret"
                  placeholder="123 456 789 00012"
                  value={formData.siret}
                  onChange={handleChange}
                  data-testid="company-siret-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label">N° TVA</Label>
                <Input
                  name="vat_number"
                  placeholder="FR12345678901"
                  value={formData.vat_number}
                  onChange={handleChange}
                  data-testid="company-vat-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="form-label">Adresse</Label>
              <Textarea
                name="address"
                placeholder="Adresse complète"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                data-testid="company-address-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="form-label">Code postal</Label>
                <Input
                  name="postal_code"
                  placeholder="75001"
                  value={formData.postal_code}
                  onChange={handleChange}
                  data-testid="company-postal-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label">Ville</Label>
                <Input
                  name="city"
                  placeholder="Paris"
                  value={formData.city}
                  onChange={handleChange}
                  data-testid="company-city-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label">Pays</Label>
                <Input
                  name="country"
                  placeholder="France"
                  value={formData.country}
                  onChange={handleChange}
                  data-testid="company-country-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="form-label">Téléphone</Label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="+33 1 23 45 67 89"
                  value={formData.phone}
                  onChange={handleChange}
                  data-testid="company-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label">Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="contact@entreprise.fr"
                  value={formData.email}
                  onChange={handleChange}
                  data-testid="company-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="form-label">Capital social (€)</Label>
              <Input
                name="capital"
                type="number"
                placeholder="10000"
                value={formData.capital}
                onChange={handleChange}
                data-testid="company-capital-input"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving} data-testid="save-company-btn">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : hasCompany ? "Mettre à jour" : "Créer l'entreprise"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Demo Data */}
      {hasCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Database className="h-5 w-5" />
              Données de démonstration
            </CardTitle>
            <CardDescription>
              Ajoutez des données fictives pour tester l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSeedDemo} data-testid="seed-demo-btn">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter des données de test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyPage;
