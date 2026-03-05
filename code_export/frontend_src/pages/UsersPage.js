import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { RefreshCw, Trash2, Shield, User } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleConfig = {
  admin: { label: "Administrateur", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  manager: { label: "Gérant", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  accountant: { label: "Comptable", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  collaborator: { label: "Collaborateur", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }
};

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API}/users/${userId}/role?role=${newRole}`);
      toast.success("Rôle mis à jour");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success("Utilisateur supprimé");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      <div>
        <h1 className="font-heading text-2xl font-bold">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground">Gérez les accès et les rôles</p>
      </div>

      {!canManageUsers && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="h-5 w-5" />
              <p>Vous n'avez pas les droits pour gérer les utilisateurs.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Utilisateurs ({users.length})</CardTitle>
          <CardDescription>Liste des utilisateurs de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UTILISATEUR</TableHead>
                <TableHead>RÔLE</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>CRÉÉ LE</TableHead>
                {canManageUsers && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const role = roleConfig[user.role] || roleConfig.collaborator;
                const isCurrentUser = user.id === currentUser?.id;
                
                return (
                  <TableRow key={user.id} data-testid={`user-row-${user.email}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.full_name}
                            {isCurrentUser && <span className="text-muted-foreground ml-2">(vous)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageUsers && !isCurrentUser ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-[150px]" data-testid={`role-select-${user.email}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={role.color}>{role.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.two_factor_enabled ? "default" : "secondary"}>
                        {user.two_factor_enabled ? "Activé" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    {canManageUsers && (
                      <TableCell>
                        {!isCurrentUser && currentUser?.role === 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`delete-user-${user.email}`}>
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. L'utilisateur {user.full_name} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
