import * as React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  FileText, 
  Users, 
  Settings,
  LogOut,
  Menu,
  X,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "staff", "user"] },
    { name: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "staff", "user"] },
    { name: "Categories", href: "/categories", icon: Tags, roles: ["admin"] },
    { name: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin"] },
    { name: "Purchases", href: "/purchases", icon: ShoppingCart, roles: ["admin", "staff"] },
    { name: "Sales", href: "/sales", icon: TrendingUp, roles: ["admin", "staff"] },
    { name: "Analytics", href: "/analytics", icon: TrendingUp, roles: ["admin", "staff"] },
    { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "staff"] },
    { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-wide text-white">Dhasvin</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="px-4 mb-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Menu
          </div>
          {visibleNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active" 
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 mr-3 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-white")} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="glass-dark rounded-2xl p-4 flex flex-col">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/30">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center justify-center w-full py-2 rounded-lg bg-white/5 text-sidebar-foreground/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-30">
          <div className="flex items-center">
            <button 
              className="lg:hidden p-2 mr-4 rounded-lg bg-white border shadow-sm text-muted-foreground hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-display font-bold text-foreground hidden sm:block">
              {navItems.find(i => location === i.href || (i.href !== "/" && location.startsWith(i.href)))?.name || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2.5 rounded-full bg-white border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 sm:p-10">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
