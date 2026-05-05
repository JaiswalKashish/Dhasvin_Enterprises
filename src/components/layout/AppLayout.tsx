import { ReactNode, useState, useEffect, useLayoutEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  ShoppingBag, 
  UploadCloud,
  FileText, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGetLowStockProducts, useGetCompanySettings } from "@/api-client";
import { Badge } from "@/components/ui/badge";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useLayoutEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("dhasvin_theme") as "dark" | "light" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = storedTheme ?? systemTheme;

    setTheme(initialTheme);
    if (initialTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("dhasvin_theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const { data: lowStockData } = useGetLowStockProducts({
    query: {
      queryKey: ["lowStockProducts"],
      enabled: !!user,
      refetchInterval: 60000,
    }
  });

  const { data: companySettings } = useGetCompanySettings({
    query: {
      queryKey: ["companySettings"],
      enabled: !!user,
    }
  });

  const lowStockCount = lowStockData?.length || 0;
  const isPdfLogo = Boolean(companySettings?.logoPath?.toLowerCase().includes(".pdf"));

  // Role-based navigation:
  // Admin  : Dashboard, Products, Suppliers, Sales, Purchases, Invoices, Bills (view), Analytics, Users
  // Staff  : Dashboard, Products, Purchases, Invoices, Bills (generate)
  // User   : Dashboard, Products
  const navItems = [
    { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard, roles: ["admin", "staff", "user"] },
    { label: "Products",   href: "/products",   icon: Package,          roles: ["admin", "staff", "user"] },
    { label: "Suppliers",  href: "/suppliers",  icon: Users,            roles: ["admin"] },
    { label: "Sales",      href: "/sales",      icon: ShoppingCart,     roles: ["admin"] },
    { label: "Purchases",  href: "/purchases",  icon: ShoppingBag,      roles: ["admin", "staff"] },
    { label: "Data Upload", href: "/data-upload",    icon: UploadCloud,      roles: ["admin", "staff"] },
    { label: "Invoices",   href: "/invoices",   icon: FileText,         roles: ["admin", "staff"] },
    { label: "Bills",      href: "/bills",      icon: Receipt,          roles: ["admin", "staff"] },
    { label: "Analytics",  href: "/analytics",  icon: BarChart3,        roles: ["admin"] },
    { label: "Settings",   href: "/company-settings", icon: Settings,         roles: ["admin"] },
    { label: "Users",      href: "/users",      icon: Users,         roles: ["admin"] },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const isLight = theme === "light";

  return (
    <div className={`flex h-screen overflow-hidden bg-background transition-colors duration-300`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden no-print"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 glass-panel border-r border-border flex flex-col transform transition-all duration-300 lg:translate-x-0 lg:static lg:shrink-0 no-print ${
          sidebarExpanded ? "w-80" : "w-64"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <Link href={user?.role === "staff" ? "/bills" : "/dashboard"} className="flex items-center gap-2 min-w-0">
            {companySettings?.logoPath ? (
              <div className="flex items-center justify-center p-0.5 bg-white/10 rounded-md">
                {isPdfLogo ? (
                  <span className="px-2 py-1 text-[10px] font-semibold text-primary">PDF</span>
                ) : (
                  <img src={companySettings.logoPath.startsWith('http') ? companySettings.logoPath : `${(import.meta as any).env.VITE_API_URL}${companySettings.logoPath}`} alt="Logo" className="max-h-8 max-w-[80px] object-contain" />
                )}
              </div>
            ) : (
              <div className="w-8 h-8 rounded bg-gradient-primary flex items-center justify-center">
                <span className="font-bold text-white">
                   {companySettings?.name ? companySettings.name.charAt(0).toUpperCase() : "D"}
                </span>
              </div>
            )}
            <span className={`font-bold tracking-tight text-foreground uppercase ${sidebarExpanded ? "whitespace-normal break-words max-w-[180px] leading-tight text-sm" : "truncate max-w-[120px]"}`}>
              {companySettings?.name || "YOUR COMPANY"}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="hidden lg:inline-flex text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/10 transition-all duration-200"
              onClick={() => setSidebarExpanded((prev) => !prev)}
              title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <Badge variant="outline" className="text-[10px] mt-1 bg-white/5 border-border text-muted-foreground uppercase">
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <item.icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 w-full transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 glass z-30 flex items-center justify-between px-4 lg:px-8 no-print border-b border-border">
          <div className="flex items-center">
            <button
              className="lg:hidden mr-4 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold capitalize hidden sm:block">
              {location.split('/')[1] || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Low stock alert bell */}
            <div className="relative">
              <Bell size={20} className="text-muted-foreground" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {lowStockCount}
                </span>
              )}
            </div>

            {/* Dark / Light mode toggle */}
            <button
              onClick={toggle}
              title={isLight ? "Switch to dark mode" : "Switch to light mode"}
              className="relative inline-flex items-center rounded-full border border-border bg-card/80 px-2 py-1 text-muted-foreground transition-all duration-200 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/80"
            >
              <span className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-primary shadow-lg transition-transform duration-200 ${isLight ? "translate-x-0" : "translate-x-10"}`} />
              <span className="relative z-10 inline-flex items-center gap-2 px-2 text-xs font-semibold text-white">
                {isLight ? <Moon size={14} /> : <Sun size={14} />}
                <span className="hidden sm:inline">{isLight ? "Light" : "Dark"}</span>
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
