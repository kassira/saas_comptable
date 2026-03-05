import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import {
  Users,
  Building2,
  Shield,
  Moon,
  Sun,
  ChevronRight
} from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const settingsCards = [
    {
      title: "Utilisateurs",
      description: "Gérer les utilisateurs et leurs rôles",
      icon: Users,
      href: "/settings/users",
      badge: user?.role === 'admin' || user?.role === 'manager' ? null : "Restreint"
    },
    {
      title: "Entreprise",
      description: "Informations et logo de l'entreprise",
      icon: Building2,
      href: "/settings/company"
    },
    {
      title: "Sécurité 2FA",
      description: "Authentification à deux facteurs",
      icon: Shield,
      href: "/settings/2fa",
      badge: user?.two_factor_enabled ? "Activé" : "Désactivé"
    }
  ];

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Configurez votre application</p>
      </div>

      {/* Theme Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Thème
          </CardTitle>
          <CardDescription>Choisissez le thème de l'interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Mode clair</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              data-testid="theme-switch"
            />
            <div className="flex items-center gap-3">
              <span className="text-sm">Mode sombre</span>
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Card 
            key={card.title} 
            className="card-hover cursor-pointer"
            onClick={() => navigate(card.href)}
            data-testid={`settings-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                {card.badge && (
                  <Badge variant={card.badge === "Activé" ? "default" : "secondary"}>
                    {card.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="font-heading mt-4">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                Configurer
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium">{user?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Rôle</span>
              <Badge variant="secondary">{user?.role}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">2FA</span>
              <Badge variant={user?.two_factor_enabled ? "default" : "secondary"}>
                {user?.two_factor_enabled ? "Activé" : "Désactivé"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
