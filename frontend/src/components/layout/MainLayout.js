import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Wallet,
  BarChart3,
  Settings,
  Users,
  Building2,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Receipt,
  FileSpreadsheet,
  BookOpen,
  CreditCard,
  Shield,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";

const sidebarItems = [
  {
    title: "Tableau de bord",
    icon: LayoutDashboard,
    href: "/dashboard"
  },
  {
    title: "Comptabilité",
    icon: Calculator,
    children: [
      { title: "Vue d'ensemble", href: "/accounting", icon: BookOpen },
      { title: "Plan comptable", href: "/accounting/chart", icon: FileSpreadsheet },
      { title: "Écritures", href: "/accounting/journal", icon: FileText },
    ]
  },
  {
    title: "Facturation",
    icon: Receipt,
    children: [
      { title: "Factures", href: "/invoices", icon: FileText },
      { title: "Devis", href: "/quotes", icon: FileSpreadsheet },
    ]
  },
  {
    title: "Trésorerie",
    icon: Wallet,
    children: [
      { title: "Vue d'ensemble", href: "/treasury", icon: BarChart3 },
      { title: "Comptes bancaires", href: "/treasury/accounts", icon: CreditCard },
    ]
  },
  {
    title: "Rapports",
    icon: BarChart3,
    href: "/reports"
  },
  {
    title: "Paramètres",
    icon: Settings,
    children: [
      { title: "Général", href: "/settings", icon: Settings },
      { title: "Utilisateurs", href: "/settings/users", icon: Users },
      { title: "Entreprise", href: "/settings/company", icon: Building2 },
      { title: "Sécurité 2FA", href: "/settings/2fa", icon: Shield },
    ]
  },
];

const SidebarItem = ({ item, collapsed }) => {
  const [expanded, setExpanded] = useState(false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`sidebar-item w-full justify-between ${collapsed ? 'justify-center px-2' : ''}`}
          data-testid={`sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>{item.title}</span>}
          </span>
          {!collapsed && (
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </button>
        {expanded && !collapsed && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                data-testid={`sidebar-${child.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <child.icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-sm">{child.title}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
      data-testid={`sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
      {!collapsed && <span>{item.title}</span>}
    </NavLink>
  );
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${sidebarOpen ? 'w-64' : 'w-16'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-card border-r border-border
        transition-all duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-border ${sidebarOpen ? 'px-6' : 'justify-center px-2'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">FinanceManager</span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className={`space-y-1 ${sidebarOpen ? 'px-3' : 'px-1'}`}>
            {sidebarItems.map((item) => (
              <SidebarItem key={item.title} item={item} collapsed={!sidebarOpen} />
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse button */}
        <div className="p-3 border-t border-border hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-center"
            data-testid="sidebar-collapse-btn"
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-semibold text-lg hidden sm:block">
              Bienvenue, {user?.full_name?.split(' ')[0]}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle-btn"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="user-menu-btn">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block">{user?.full_name}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings/2fa')} data-testid="menu-2fa">
                  <Shield className="mr-2 h-4 w-4" />
                  Sécurité 2FA
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
