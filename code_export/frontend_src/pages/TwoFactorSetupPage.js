import { useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TwoFactorSetupPage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/2fa/setup`);
      setSetupData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/verify`, { code: verifyCode });
      updateUser({ two_factor_enabled: true });
      setSetupData(null);
      setVerifyCode("");
      toast.success("Authentification 2FA activée avec succès");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Code invalide");
      setVerifyCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/disable`, { code: disableCode });
      updateUser({ two_factor_enabled: false });
      setDisableDialogOpen(false);
      setDisableCode("");
      toast.success("Authentification 2FA désactivée");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Code invalide");
      setDisableCode("");
    } finally {
      setLoading(false);
    }
  };

  const is2FAEnabled = user?.two_factor_enabled;

  return (
    <div className="space-y-6" data-testid="2fa-page">
      <div>
        <h1 className="font-heading text-2xl font-bold">Authentification 2FA</h1>
        <p className="text-muted-foreground">Renforcez la sécurité de votre compte</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Statut de la 2FA
            </CardTitle>
            <Badge variant={is2FAEnabled ? "default" : "secondary"} className="text-sm">
              {is2FAEnabled ? (
                <>
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Activée
                </>
              ) : (
                <>
                  <ShieldOff className="mr-1 h-4 w-4" />
                  Désactivée
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            {is2FAEnabled 
              ? "Votre compte est protégé par l'authentification à deux facteurs"
              : "Activez l'authentification à deux facteurs pour sécuriser votre compte"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {is2FAEnabled ? (
            <Button 
              variant="destructive" 
              onClick={() => setDisableDialogOpen(true)}
              data-testid="disable-2fa-btn"
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              Désactiver la 2FA
            </Button>
          ) : (
            <Button onClick={handleSetup2FA} disabled={loading} data-testid="setup-2fa-btn">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Configurer la 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup Card */}
      {setupData && (
        <Card className="animate-slide-in">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Scannez le QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-6">
              {/* QR Code */}
              <div className="p-4 bg-white rounded-xl" data-testid="2fa-qr-code">
                <img src={setupData.qr_code} alt="QR Code 2FA" className="w-48 h-48" />
              </div>

              {/* Manual Entry */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Ou entrez ce code manuellement :</p>
                <code className="px-4 py-2 bg-muted rounded-lg font-mono text-sm select-all" data-testid="2fa-secret">
                  {setupData.secret}
                </code>
              </div>

              {/* Verification */}
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Entrez le code à 6 chiffres de votre application :
                </p>
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={setVerifyCode}
                  data-testid="2fa-verify-input"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <Button 
                  onClick={handleVerify2FA} 
                  disabled={loading || verifyCode.length !== 6}
                  data-testid="verify-2fa-btn"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vérifier et activer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">À propos de la 2FA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            L'authentification à deux facteurs (2FA) ajoute une couche de sécurité supplémentaire à votre compte.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Utilisez une application comme Google Authenticator ou Authy</li>
            <li>Sauvegardez votre code secret en lieu sûr</li>
            <li>Un code unique sera demandé à chaque connexion</li>
          </ul>
        </CardContent>
      </Card>

      {/* Disable Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la 2FA ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela réduira la sécurité de votre compte. Entrez votre code 2FA actuel pour confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={6}
              value={disableCode}
              onChange={setDisableCode}
              data-testid="2fa-disable-input"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode("")}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={loading || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-disable-2fa-btn"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TwoFactorSetupPage;
