import { useState, useMemo } from "react";
import { useGetSalesTrend, useGetTopProducts, useGetCategoryBreakdown, useGetDashboardStats } from "@/api-client";
import { ensureArray } from "@/lib/api-utils";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, PieChart as PieChartIcon, DollarSign, ArrowUpRight, Calendar, Users, FileText } from "lucide-react";
import { motion } from "framer-motion";

type Period = "daily" | "monthly";

const COLORS = ['#667eea', '#43cea2', '#a18cd1', '#fbc2eb', '#ff9a9e', '#84fab0', '#8fd3f4'];

function StatCard({ title, value, icon: Icon, color, bg, trend }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5 rounded-xl border border-white/5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-3 -mt-3 opacity-60 group-hover:scale-110 transition-transform" />
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-muted-foreground text-xs font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <ArrowUpRight size={12} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">{trend}</span>
        </div>
      )}
    </motion.div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const { data: trendResponse, isLoading: trendLoading } = useGetSalesTrend({ period, startDate, endDate });
  const { data: topProductsResponse, isLoading: topLoading } = useGetTopProducts({ limit: 10 });
  const { data: categoryResponse, isLoading: categoryLoading } = useGetCategoryBreakdown();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  const trendData = ensureArray(trendResponse, "trend");
  const topProducts = ensureArray(topProductsResponse, "products");
  const categoryData = ensureArray(categoryResponse, "categories");

  const totalSales = useMemo(() =>
    (trendData || []).reduce((s, r: any) => s + (r.sales || 0), 0), [trendData]);
  const totalPurchases = useMemo(() =>
    (trendData || []).reduce((s, r: any) => s + (r.purchases || 0), 0), [trendData]);
  const isLightMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light");

  const kpis = [
    { title: "Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "text-sky-400", bg: "bg-sky-400/10" },
    { title: "Pending Invoices", value: stats?.pendingInvoices ?? 0, icon: FileText, color: "text-violet-400", bg: "bg-violet-400/10" },
    { title: "Monthly Revenue", value: `₹${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Today's Sales", value: `₹${(stats?.totalSalesToday ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics &amp; Reports</h2>
          <p className="text-muted-foreground text-sm mt-1">Sales performance and inventory insights</p>
        </div>
        {/* Period Switcher */}
        <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
          <Calendar size={14} className="text-muted-foreground ml-2" />
          {(["daily", "monthly"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${
                period === p
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Start</span>
            <input
              type="date"
              value={startDate ?? ""}
              onChange={(event) => setStartDate(event.target.value || undefined)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </label>
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <span>End</span>
            <input
              type="date"
              value={endDate ?? ""}
              onChange={(event) => setEndDate(event.target.value || undefined)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setStartDate(undefined);
            setEndDate(undefined);
          }}
          className="inline-flex items-center justify-center rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Clear filter
        </button>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => <StatCard key={i} {...kpi} />)}
        </div>
      )}

      {/* Sales vs Purchases Combined Chart */}
      <div className="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Sales vs Purchases Trend
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-700 dark:text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#667eea] rounded block" />Sales</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#43cea2] rounded block" />Purchases</span>
          </div>
        </div>
        {trendLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSalesA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchasesA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43cea2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#43cea2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#e5e7eb" : "rgba(255,255,255,0.08)"} vertical={false} />
                <XAxis dataKey="date" stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.55)"} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.55)"} tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLightMode ? "#ffffff" : "rgba(15,23,42,0.95)",
                    border: isLightMode ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px"
                  }}
                  labelStyle={{ color: isLightMode ? "#111827" : "#f8fafc" }}
                  itemStyle={{ color: isLightMode ? "#1f2937" : "#fff" }}
                  formatter={(v: number, name) => [`₹${v.toLocaleString()}`, name === "sales" ? "Sales" : "Purchases"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#667eea" strokeWidth={2.5} fill="url(#colorSalesA)" />
                <Area type="monotone" dataKey="purchases" stroke="#43cea2" strokeWidth={2.5} fill="url(#colorPurchasesA)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Summary row below chart */}
        <div className="flex justify-end gap-8 mt-4 pt-4 border-t border-white/5">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-lg font-bold text-[#667eea]">₹{totalSales.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Purchases</p>
            <p className="text-lg font-bold text-[#43cea2]">₹{totalPurchases.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`text-lg font-bold ${totalSales - totalPurchases >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{(totalSales - totalPurchases).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Package size={18} className="text-emerald-400" />
            Top Selling Products
          </h3>
          {topLoading ? <Skeleton className="h-72 w-full rounded-lg" /> : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts || []} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#e5e7eb" : "rgba(255,255,255,0.08)"} horizontal={false} />
                  <XAxis type="number" stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.55)"} tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => `₹${v}`} />
                  <YAxis dataKey="productName" type="category" stroke={isLightMode ? "#111827" : "rgba(255,255,255,0.85)"} width={140} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: isLightMode ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: isLightMode ? "#ffffff" : "rgba(15,23,42,0.95)",
                      border: isLightMode ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px"
                    }}
                    labelStyle={{ color: isLightMode ? "#111827" : "#f8fafc" }}
                    itemStyle={{ color: isLightMode ? "#1f2937" : "#fff" }}
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#43cea2" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <PieChartIcon size={18} className="text-purple-400" />
            Inventory Value by Category
          </h3>
          {categoryLoading ? <Skeleton className="h-72 w-full rounded-lg" /> : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="totalValue"
                    nameKey="categoryName"
                    stroke="none"
                  >
                    {(categoryData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLightMode ? "#ffffff" : "rgba(15,23,42,0.95)",
                      border: isLightMode ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px"
                    }}
                    labelStyle={{ color: isLightMode ? "#111827" : "#f8fafc" }}
                    itemStyle={{ color: isLightMode ? "#1f2937" : "#fff" }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: isLightMode ? '#334155' : '#94a3b8', fontSize: '11px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
