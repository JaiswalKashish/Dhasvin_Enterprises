import * as React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Package, TrendingUp, BarChart2, Shield, Download, FileText, ArrowRight, LayoutDashboard, Database, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart2,
    title: "Real-time Analytics",
    description: "Get instant insights into your business performance with live dashboards and reporting.",
    color: "from-blue-500 to-cyan-400"
  },
  {
    icon: Package,
    title: "Smart Stock Tracking",
    description: "Never run out of stock. Set low stock alerts and monitor inventory movement in real-time.",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: FileText,
    title: "Invoice Upload",
    description: "Smart invoice processing to automatically extract and record your purchases efficiently.",
    color: "from-emerald-400 to-teal-500"
  },
  {
    icon: TrendingUp,
    title: "Sales Management",
    description: "Track sales across multiple channels, manage orders, and analyze your best-selling items.",
    color: "from-rose-400 to-orange-500"
  },
  {
    icon: Shield,
    title: "Role-based Access",
    description: "Control who sees what. Set up specific permissions for admins, staff, and regular users.",
    color: "from-violet-500 to-fuchsia-500"
  },
  {
    icon: Download,
    title: "Data Export",
    description: "Export your data anytime. Generate custom reports in Excel and PDF formats.",
    color: "from-amber-400 to-yellow-500"
  }
];

export default function Landing() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">DHASVIN ENTERPRISES</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 hidden sm:inline-flex">
              Sign In
            </Button>
          </Link>
          <Link href="/inventory">
            <Button className="bg-white text-[#0A0F1E] hover:bg-white/90 font-semibold shadow-xl shadow-white/10">
              View Products
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-tight mb-6">
            Smarter Inventory. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              Sharper Business.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Real-time analytics, smart stock tracking, and invoice intelligence all in one powerful platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-indigo-500/25 border border-indigo-500/50">
                Sign In <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/inventory">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 bg-transparent text-white border-white/20 hover:bg-white/5 hover:border-white/40 font-semibold text-lg rounded-xl backdrop-blur-sm">
                View Products
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Mockup Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-5xl glass-dark rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl shadow-indigo-900/20 overflow-hidden backdrop-blur-xl"
        >
          {/* Mockup Header */}
          <div className="h-12 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <div className="mx-auto px-4 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-slate-400 font-medium font-mono flex items-center gap-2">
              <LayoutDashboard className="w-3 h-3" />
              inventory.dhasvin.com
            </div>
          </div>
          
          {/* Mockup Content */}
          <div className="p-6 md:p-8 bg-slate-900/50">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Products", value: "2,098", icon: Package, color: "text-blue-400" },
                { label: "Inventory Value", value: "₹46.3L", icon: Database, color: "text-emerald-400" },
                { label: "Low Stock", value: "698", icon: TrendingUp, color: "text-amber-400" },
                { label: "Revenue", value: "₹1.2M", icon: CreditCard, color: "text-purple-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-sm font-medium">{stat.label}</span>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-2xl font-bold font-display text-white">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-5 h-64 flex flex-col">
                <span className="text-slate-300 text-sm font-medium mb-4">Revenue Trend</span>
                <div className="flex-1 flex items-end gap-2 px-2">
                  {[40, 60, 45, 80, 55, 90, 70, 100, 85, 120, 95, 110].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-indigo-500/20 to-indigo-400/80 rounded-t-sm" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-64 flex flex-col">
                <span className="text-slate-300 text-sm font-medium mb-4">Top Categories</span>
                <div className="flex-1 flex flex-col justify-center gap-4">
                  {[
                    { label: "Electronics", val: 80, color: "bg-cyan-400" },
                    { label: "Hardware", val: 65, color: "bg-purple-400" },
                    { label: "Accessories", val: 45, color: "bg-pink-400" },
                  ].map((cat, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{cat.label}</span>
                        <span>{cat.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Banner */}
      <div className="relative z-10 border-y border-white/10 bg-white/[0.02] backdrop-blur-md">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
            {[
              { val: "2,098+", label: "Products" },
              { val: "₹46.3L", label: "Inventory Value" },
              { val: "12", label: "Categories" },
              { val: "3", label: "User Roles" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold font-display text-white mb-1">{stat.val}</span>
                <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Everything your business needs</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">A complete suite of tools designed to help you manage inventory efficiently and grow your business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-dark bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0A0F1E]">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-indigo-400" />
              <span className="font-display font-bold text-lg">DHASVIN ENTERPRISES</span>
            </div>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Dhasvin Enterprises. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
