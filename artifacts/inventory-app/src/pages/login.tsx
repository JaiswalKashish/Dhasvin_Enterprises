import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Package, Mail, Lock } from "lucide-react";
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

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate: login, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
      onError: () => {
        setErrorMsg("Invalid credentials. Please try again.");
      }
    }
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Abstract Background" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10 p-4"
      >
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-3xl" />
          
          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-indigo-200 text-center">Sign in to DHASVIN ENTERPRISES Inventory</p>
          </div>

          <form onSubmit={handleSubmit((d) => login({ data: d }))} className="space-y-6 relative z-10">
            {errorMsg && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-1">
              <Input
                {...register("email")}
                type="email"
                placeholder="Email address"
                icon={<Mail className="w-5 h-5" />}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-400"
              />
              {errors.email && <p className="text-red-400 text-xs pl-2 pt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Input
                {...register("password")}
                type="password"
                placeholder="Password"
                icon={<Lock className="w-5 h-5" />}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-400"
              />
              {errors.password && <p className="text-red-400 text-xs pl-2 pt-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              variant="gradient"
              size="lg" 
              className="w-full text-base font-bold shadow-indigo-500/25"
              isLoading={isPending}
            >
              Sign In
            </Button>
            
            <div className="pt-4 text-center">
              <p className="text-xs text-white/50">
                Demo accounts: admin@inventory.com / staff@ / user@ <br/> Password: Role@123
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
