import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { BookOpen, FileSpreadsheet, FileText, Calculator } from "lucide-react";

const AccountingPage = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: "Plan Comptable",
      description: "Gérez vos comptes selon le PCG français",
      icon: FileSpreadsheet,
      href: "/accounting/chart",
      color: "bg-blue-500"
    },
    {
      title: "Écritures Comptables",
      description: "Saisissez et validez vos écritures",
      icon: FileText,
      href: "/accounting/journal",
      color: "bg-green-500"
    },
    {
      title: "Bilan",
      description: "Consultez votre bilan comptable",
      icon: BookOpen,
      href: "/reports",
      color: "bg-purple-500"
    },
    {
      title: "Compte de Résultat",
      description: "Analysez vos produits et charges",
      icon: Calculator,
      href: "/reports",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div>
        <h1 className="font-heading text-2xl font-bold">Comptabilité</h1>
        <p className="text-muted-foreground">Gérez votre comptabilité générale</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <Card 
            key={module.title} 
            className="card-hover cursor-pointer"
            onClick={() => navigate(module.href)}
            data-testid={`module-${module.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl ${module.color} flex items-center justify-center`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="font-heading">{module.title}</CardTitle>
                  <CardDescription className="mt-1">{module.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                Accéder →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AccountingPage;
