import { useLayoutEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@/api-client";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Lock,
  Mail,
  Moon,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  Sun,
  Truck,
  Wallet,
  Boxes,
  BadgeIndianRupee,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  ScanLine,
  Warehouse,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function useTheme() {
  const getInitialTheme = () => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = localStorage.getItem("dhasvin_theme") as "dark" | "light" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return storedTheme ?? systemTheme;
  };

  const applyTheme = (theme: "dark" | "light") => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("dhasvin_theme", theme);
  };

  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(getInitialTheme);

  useLayoutEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const toggle = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
  };
  return { isLight: currentTheme === "light", toggle };
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { isLight, toggle } = useTheme();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin();

  const onSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          toast.success("Login successful");
          login(res.token, res.user);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast.error(err.data?.message || err.data?.error || "Invalid credentials");
        },
      }
    );
  };

  const autofill = (role: 'admin' | 'staff' | 'user') => {
    const email = `${role}@inventory.com`;
    const password = `${role.charAt(0).toUpperCase() + role.slice(1)}@123`;
    form.setValue('email', email);
    form.setValue('password', password);
    // Auto-submit after filling so user doesn't need to click Sign In separately
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          toast.success(`Logged in as ${role}`);
          login(res.token, res.user);
          setLocation('/dashboard');
        },
        onError: (err: any) => {
          toast.error(err.data?.message || err.data?.error || 'Invalid credentials');
        },
      }
    );
  };

  const floatingIcons = [
    { Icon: Package, top: "18%", left: "7%", color: "text-primary" },
    { Icon: ShoppingCart, top: "32%", left: "14%", color: "text-teal-400" },
    { Icon: Boxes, top: "11%", left: "23%", color: "text-indigo-400" },
    { Icon: ReceiptText, top: "16%", right: "8%", color: "text-purple-400" },
    { Icon: Truck, top: "34%", right: "14%", color: "text-emerald-400" },
    { Icon: Wallet, top: "10%", right: "24%", color: "text-cyan-400" },
    { Icon: BadgeIndianRupee, bottom: "15%", left: "38%", color: "text-primary" },
    { Icon: Store, bottom: "18%", right: "33%", color: "text-fuchsia-400" },
    { Icon: BarChart3, bottom: "28%", left: "10%", color: "text-sky-400" },
    { Icon: ShieldCheck, bottom: "23%", right: "9%", color: "text-amber-400" },
    { Icon: ClipboardList, top: "46%", left: "8%", color: "text-rose-400" },
    { Icon: ScanLine, top: "26%", right: "22%", color: "text-lime-400" },
    { Icon: Warehouse, bottom: "11%", right: "20%", color: "text-orange-400" },
    { Icon: CircleDollarSign, bottom: "13%", left: "22%", color: "text-green-400" },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 bg-background">
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white border-white/10 glass">
            <ArrowLeft className="mr-2" size={16} /> Back to Home
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="glass border border-white/10 text-muted-foreground hover:text-white"
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </Button>
      </div>

      {/* Decorative background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[50%] w-[50%] h-[50%] translate-x-[-50%] rounded-full bg-primary/20 blur-[150px]" />
        {floatingIcons.map(({ Icon, color, ...position }, index) => (
          <motion.div
            key={`${color}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              delay: 0.15 + index * 0.06,
              duration: 2.6 + (index % 3) * 0.5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
            }}
            className={`absolute rounded-xl border border-white/20 bg-white/15 p-2.5 shadow-lg backdrop-blur-sm ${color}`}
            style={position}
          >
            <Icon size={22} />
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 text-center"
        >
          <div className="mx-auto mb-3 max-w-[360px] rounded-2xl bg-white/70 p-2 shadow-xl ring-1 ring-primary/20 backdrop-blur-sm">
            <img src="/dhasvin-logo.png" alt="Dhasvin Enterprises logo" className="w-full rounded-xl object-contain" />
          </div>
          <p className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-2xl font-extrabold tracking-[0.16em] text-transparent drop-shadow-sm">
            DHASVIN ENTERPRISES
          </p>
          <p className="mt-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Inventory and Billing Suite</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary"></div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-muted-foreground text-sm">Sign in to continue</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="admin@inventory.com" 
                          className="pl-10 bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-10 bg-black/20 border-white/10 text-white focus-visible:ring-primary" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary text-white border-0 mt-6 h-11"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick Login</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="text-xs bg-white/5 border-white/10 hover:bg-white/10 h-auto py-2 flex flex-col gap-0.5"
                onClick={() => autofill('admin')}
                disabled={loginMutation.isPending}
              >
                <span className="font-semibold text-primary">Admin</span>
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="text-xs bg-white/5 border-white/10 hover:bg-white/10 h-auto py-2 flex flex-col gap-0.5"
                onClick={() => autofill('staff')}
                disabled={loginMutation.isPending}
              >
                <span className="font-semibold text-teal-400">Staff</span>
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="text-xs bg-white/5 border-white/10 hover:bg-white/10 h-auto py-2 flex flex-col gap-0.5"
                onClick={() => autofill('user')}
                disabled={loginMutation.isPending}
              >
                <span className="font-semibold text-purple-400">User</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
