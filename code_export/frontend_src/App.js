import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AccountingPage from "./pages/AccountingPage";
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage";
import JournalEntriesPage from "./pages/JournalEntriesPage";
import InvoicesPage from "./pages/InvoicesPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import QuotesPage from "./pages/QuotesPage";
import TreasuryPage from "./pages/TreasuryPage";
import BankAccountsPage from "./pages/BankAccountsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import CompanyPage from "./pages/CompanyPage";
import TwoFactorSetupPage from "./pages/TwoFactorSetupPage";

// Layout
import MainLayout from "./components/layout/MainLayout";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="relative">
            <div className="noise-bg"></div>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Accounting */}
                <Route path="accounting" element={<AccountingPage />} />
                <Route path="accounting/chart" element={<ChartOfAccountsPage />} />
                <Route path="accounting/journal" element={<JournalEntriesPage />} />
                
                {/* Invoicing */}
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/new" element={<CreateInvoicePage />} />
                <Route path="invoices/:id/edit" element={<CreateInvoicePage />} />
                <Route path="quotes" element={<QuotesPage />} />
                <Route path="quotes/new" element={<CreateInvoicePage isQuote />} />
                
                {/* Treasury */}
                <Route path="treasury" element={<TreasuryPage />} />
                <Route path="treasury/accounts" element={<BankAccountsPage />} />
                
                {/* Reports */}
                <Route path="reports" element={<ReportsPage />} />
                
                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/users" element={<UsersPage />} />
                <Route path="settings/company" element={<CompanyPage />} />
                <Route path="settings/2fa" element={<TwoFactorSetupPage />} />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
