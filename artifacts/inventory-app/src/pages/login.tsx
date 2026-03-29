import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Package, Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState("");

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate: login, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/dashboard");
      },
      onError: () => {
        setErrorMsg("Invalid credentials. Please try again.");
      }
    }
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0A0F1E] font-sans">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Top Nav */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 h-10 px-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10 p-4"
      >
        <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-2xl shadow-indigo-500/10 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-3xl" />
          
          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-center">Sign in to DHASVIN ENTERPRISES</p>
          </div>

          <form onSubmit={handleSubmit((d) => login({ data: d }))} className="space-y-6 relative z-10">
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-center font-medium backdrop-blur-sm">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="Email address"
                    className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs pl-2 pt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="Password"
                    className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                  />
                </div>
                {errors.password && <p className="text-red-400 text-xs pl-2 pt-1">{errors.password.message}</p>}
              </div>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-none shadow-lg shadow-indigo-500/25 rounded-xl"
              isLoading={isPending}
            >
              Sign In
            </Button>
            
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">Demo Accounts</p>
              <div className="space-y-2">
                {[
                  { email: "admin@inventory.com", pass: "Admin@123", role: "Admin" },
                  { email: "staff@inventory.com", pass: "Staff@123", role: "Staff" },
                  { email: "user@inventory.com", pass: "User@123", role: "User" }
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setValue("email", demo.email);
                      setValue("password", demo.pass);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">{demo.email}</div>
                      <div className="text-xs text-slate-500">Password: {demo.pass}</div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-500/20 text-indigo-300">
                      {demo.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
