import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Calculator, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, requires2FA, verify2FA } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Connexion réussie");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await verify2FA(totpCode);
      if (result.success) {
        toast.success("Connexion réussie");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.message);
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md animate-slide-in">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Calculator className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-heading text-2xl">Vérification 2FA</CardTitle>
            <CardDescription>Entrez le code de votre application d'authentification</CardDescription>
          </CardHeader>
          <form onSubmit={handle2FAVerify}>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                  data-testid="2fa-input"
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
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || totpCode.length !== 6}
                data-testid="verify-2fa-btn"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-slide-in">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Calculator className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">FinanceManager Pro</CardTitle>
          <CardDescription>Connectez-vous à votre compte</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="form-label">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="form-label">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                Créer un compte
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
