import { useLayoutEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Package, BarChart3, FileText, ArrowRight, TrendingUp, Database, Sun, Moon } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function useTheme() {
  const getInitialTheme = () => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = localStorage.getItem("dhasvin_theme") as "dark" | "light" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return storedTheme ?? systemTheme;
  };

  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

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

  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  return { isLight: theme === "light", toggle };
}

export default function Home() {
  const { isLight, toggle } = useTheme();
  const scrollToFeatures = () => {
    document.getElementById("home-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-purple-500/30 bg-background text-foreground transition-colors duration-300">

      {/* Decorative background glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[140px]" style={{ background: "rgba(102,126,234,0.12)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[140px]" style={{ background: "rgba(67,206,162,0.08)" }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full blur-[120px]" style={{ background: "rgba(118,75,162,0.10)" }} />
      </div>

      {/* ─── Navbar ─── */}
      <header className="relative z-10 w-full px-6 md:px-12 pt-5 pb-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-3xl flex items-center justify-center shadow-2xl bg-white border border-slate-200 dark:bg-white/95 dark:border-white/10 p-2 hover:shadow-3xl transition-all duration-300"
          >
            <img src="/dhasvin-logo.png" alt="Dhasvin Enterprises logo" className="w-full h-full object-contain rounded-2xl" />
          </motion.div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-[0.18em] text-sm md:text-base text-slate-900 dark:text-white uppercase block">
              DHASVIN ENTERPRISES
            </span>
            <span className="text-[11px] md:text-sm text-slate-600 dark:text-white/70 tracking-[0.16em] uppercase">Inventory Management Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
            className="bg-white/90 dark:bg-white/90 text-gray-900 font-semibold text-sm px-3 py-2.5 rounded-xl shadow-md hover:bg-white dark:hover:bg-white transition-all duration-200 active:scale-95"
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link href="/login">
            <button className="bg-white text-gray-900 dark:bg-white dark:text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md hover:bg-gray-100 dark:hover:bg-gray-100 transition-all duration-200 active:scale-95">
              Sign In
            </button>
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <main className="relative z-10 flex-1 flex flex-col">
        <section className="w-full px-6 md:px-12 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="flex flex-col items-start text-left"
              >
                {/* Main Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-wide leading-tight mb-4"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  DHASVIN ENTERPRISES
                </motion.h1>

                {/* Subtitle */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white/90 mb-6 tracking-wide"
                >
                  Inventory & Billing Management Platform
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="text-base md:text-lg text-slate-700 dark:text-gray-300 mb-8 max-w-xl leading-relaxed"
                >
                  Manage inventory, billing, and analytics in one powerful system. Streamline operations, track stock in real-time, and grow your business with intelligent insights.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/login">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-lg px-8 py-4 rounded-2xl shadow-xl transition-all duration-200"
                    >
                      Get Started
                      <ArrowRight size={18} />
                    </motion.button>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={scrollToFeatures}
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white font-semibold text-lg px-8 py-4 rounded-2xl shadow-xl border border-white/20 transition-all duration-200 backdrop-blur-sm"
                  >
                    Explore Platform
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Right Side - Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                className="flex justify-center lg:justify-end"
              >
                {/* ─── Dashboard Mockup ─── */}
                <div className="w-full max-w-lg">
                  <div className="rounded-3xl overflow-hidden shadow-2xl border border-border bg-card/95">
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                      <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
                      <div className="mx-auto flex items-center gap-2 px-4 py-1 rounded-lg text-xs text-gray-400 bg-white/10">
                        <Package size={11} className="text-purple-400" />
                        inventory.dhasvin.com
                      </div>
                    </div>

                    <div className="p-4 md:p-5 bg-card/80">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: "Total Products", value: "2,098", icon: Package, color: "#667eea" },
                          { label: "Inventory Value", value: "₹46.3L", icon: Database, color: "#43cea2" },
                          { label: "Low Stock", value: "698", icon: TrendingUp, color: "#f59e0b" },
                          { label: "Revenue", value: "₹1.2M", icon: BarChart3, color: "#a78bfa" },
                        ].map((kpi) => (
                          <div key={kpi.label} className="rounded-xl p-3 bg-white/5 border border-white/10">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
                              <kpi.icon size={12} style={{ color: kpi.color }} />
                            </div>
                            <span className="text-lg md:text-xl font-bold text-white">{kpi.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl p-4 mb-4 bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 mb-3 font-medium">Revenue Trend</p>
                        <div className="flex items-end gap-1 h-20">
                          {[38, 52, 44, 68, 55, 78, 64, 90, 72, 85, 70, 95].map((h, i) => (
                            <div key={i} className="flex-1 rounded-sm" style={{
                              height: `${h}%`,
                              background: `linear-gradient(180deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.6) 100%)`,
                              minWidth: 0,
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Stats Bar ─── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full bg-white/5 border-t border-b border-white/10"
        >
          <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {[
              { value: "2,098+", label: "PRODUCTS" },
              { value: "₹46.3L", label: "INVENTORY VALUE" },
              { value: "12", label: "CATEGORIES" },
              { value: "3", label: "USER ROLES" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center py-2 px-4">
                <span className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</span>
                <span className="text-xs font-semibold tracking-widest text-gray-500 mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── Feature Cards ─── */}
        <section id="home-features" className="w-full px-6 md:px-12 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Everything your business needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete suite of tools designed to help you manage inventory efficiently and grow your business.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto"
          >
            {[
              {
                icon: BarChart3,
                iconBg: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                title: "Real-time Analytics",
                desc: "Get instant insights into your business performance with live dashboards and reporting.",
              },
              {
                icon: Package,
                iconBg: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                title: "Smart Stock Tracking",
                desc: "Never run out of stock. Set low stock alerts and monitor inventory movement in real-time.",
              },
              {
                icon: FileText,
                iconBg: "linear-gradient(135deg, #10b981, #34d399)",
                title: "Invoice Upload",
                desc: "Smart invoice parsing to automatically extract and record your purchases from CSV/Excel files.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                variants={itemVariants}
                className="rounded-2xl p-7 flex flex-col hover:-translate-y-1.5 transition-transform duration-300 bg-white/5 border border-white/10"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: f.iconBg }}
                >
                  <f.icon size={26} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer
        className="relative z-10 py-8 text-center text-sm text-gray-600 dark:text-gray-400"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/dhasvin-logo.png" alt="Dhasvin Enterprises logo" className="w-6 h-6 object-contain" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">DHASVIN ENTERPRISES</span>
        </div>
        <p>© {new Date().getFullYear()} Dhasvin Enterprises. All rights reserved.</p>
      </footer>
    </div>
  );
}
