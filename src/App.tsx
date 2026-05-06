import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Suppliers from "@/pages/Suppliers";
import Sales from "@/pages/Sales";
import Purchases from "@/pages/Purchases";
import Invoices from "@/pages/Invoices";
import Bills from "@/pages/Bills";
import FileUpload from "@/pages/FileUpload";
import Analytics from "@/pages/Analytics";
import Users from "@/pages/Users";
import CompanySettings from "@/pages/CompanySettings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function DefaultRedirect() {
  // All roles now land on dashboard
  return <Redirect to="/dashboard" />;
}

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Switch>
        {/* All roles */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/suppliers">
          <ProtectedRoute allowedRoles={['admin']}>
            <Suppliers />
          </ProtectedRoute>
        </Route>
        <Route path="/sales">
          <ProtectedRoute allowedRoles={['admin']}>
            <Sales />
          </ProtectedRoute>
        </Route>
        <Route path="/analytics">
          <ProtectedRoute allowedRoles={['admin']}>
            <Analytics />
          </ProtectedRoute>
        </Route>
        <Route path="/users">
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        </Route>
        <Route path="/data-upload">
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <FileUpload />
          </ProtectedRoute>
        </Route>
        <Route path="/uploads">
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Redirect to="/data-upload" />
          </ProtectedRoute>
        </Route>
        <Route path="/company-settings">
          <ProtectedRoute allowedRoles={['admin']}>
            <CompanySettings />
          </ProtectedRoute>
        </Route>

        {/* Admin + Staff */}
        <Route path="/purchases">
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Purchases />
          </ProtectedRoute>
        </Route>
        <Route path="/invoices">
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Invoices />
          </ProtectedRoute>
        </Route>
        <Route path="/bills">
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Bills />
          </ProtectedRoute>
        </Route>

        {/* All roles */}
        <Route path="/products">
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        </Route>

        {/* Default redirect based on role */}
        <Route>
          <ProtectedRoute>
            <DefaultRedirect />
          </ProtectedRoute>
        </Route>
      </Switch>
    </AppLayout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/:rest*">
        <ProtectedRoutes />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
