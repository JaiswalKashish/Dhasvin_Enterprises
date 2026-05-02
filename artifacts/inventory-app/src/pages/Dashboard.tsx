import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  useGetDashboardStats, 
  useGetSalesTrend, 
  useGetTopProducts, 
  useGetCategoryBreakdown,
  useGetLowStockProducts 
} from "@workspace/api-client-react";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  PackageX, 
  Wallet 
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: trendData, isLoading: trendLoading } = useGetSalesTrend({ period: 'daily' });
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts({ limit: 5 });
  const { data: categoryData, isLoading: categoryLoading } = useGetCategoryBreakdown();
  const { data: lowStockProducts, isLoading: lowStockLoading } = useGetLowStockProducts();

  const COLORS = ['#667eea', '#43cea2', '#a18cd1', '#fbc2eb', '#ff9a9e'];
  const isLightMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light");

  const monthlyRevenueData = useMemo(() => {
    const monthMap = new Map<string, number>();
    (trendData ?? []).forEach((entry: any) => {
      const rawDate = entry?.date;
      const sales = Number(entry?.sales ?? 0);
      const parsed = rawDate ? new Date(rawDate) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;
      const monthLabel = parsed.toLocaleDateString("en-US", { month: "short" });
      monthMap.set(monthLabel, (monthMap.get(monthLabel) ?? 0) + sales);
    });
    return Array.from(monthMap.entries()).map(([month, revenue]) => ({ month, revenue }));
  }, [trendData]);

  const kpis = [
    { title: "Total Products", value: stats?.totalProducts ?? 0, icon: Package, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Today's Sales", value: `₹${stats?.totalSalesToday?.toLocaleString() ?? 0}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Monthly Revenue", value: `₹${stats?.totalRevenue?.toLocaleString() ?? 0}`, icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { title: "Low Stock", value: stats?.lowStockCount ?? 0, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "Out of Stock", value: stats?.outOfStockCount ?? 0, icon: PackageX, color: "text-red-400", bg: "bg-red-400/10" },
    { title: "Inventory Value", value: `₹${stats?.totalInventoryValue?.toLocaleString() ?? 0}`, icon: Wallet, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (statsLoading || trendLoading || topLoading || categoryLoading || lowStockLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 glass-panel rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 glass-panel rounded-xl" />
          <Skeleton className="h-96 glass-panel rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 glass-panel rounded-xl" />
          <Skeleton className="h-80 glass-panel rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div key={idx} variants={itemVariants} className="glass p-5 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform" />
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
            </div>
            <h3 className="text-muted-foreground text-sm font-medium mb-1">{kpi.title}</h3>
            <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-white/5 lg:col-span-2 transition-all duration-200">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Monthly Revenue
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isLightMode ? "#e5e7eb" : "rgba(255,255,255,0.14)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.7)"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.7)"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isLightMode ? "#ffffff" : "rgba(15, 23, 42, 0.95)",
                    border: isLightMode ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: isLightMode ? "#111827" : "#f3f4f6" }}
                  itemStyle={{ color: isLightMode ? "#1f2937" : "#ffffff" }}
                  formatter={(value: number) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#667eea" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={18} className="text-emerald-400" />
            Top Selling Products
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts || []} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#e5e7eb" : "rgba(255,255,255,0.1)"} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={isLightMode ? "#374151" : "rgba(255,255,255,0.65)"}
                  tick={{ fill: isLightMode ? "#374151" : "#cbd5e1", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="productName"
                  type="category"
                  stroke={isLightMode ? "#111827" : "rgba(255,255,255,0.85)"}
                  tick={{ fill: isLightMode ? "#111827" : "#e5e7eb", fontSize: 12 }}
                  fontSize={12}
                  width={150}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: isLightMode ? "rgba(79,70,229,0.08)" : "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: isLightMode ? "#ffffff" : "rgba(15, 23, 42, 0.9)",
                    border: isLightMode ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px"
                  }}
                  labelStyle={{ color: isLightMode ? "#111827" : "#f8fafc" }}
                  itemStyle={{ color: isLightMode ? "#1f2937" : "#ffffff" }}
                  formatter={(v: number) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="totalRevenue" fill="#43cea2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-white/5 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-6 text-white flex items-center gap-2">
            <PieChart size={18} className="text-purple-400" />
            Inventory Value by Category
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="totalValue"
                  nameKey="categoryName"
                  stroke="none"
                >
                  {(categoryData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {(categoryData || []).slice(0, 5).map((cat, idx) => (
              <div key={idx} className="flex items-center text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                {cat.categoryName}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-white/5 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              Low Stock Alerts
            </h3>
            {(lowStockProducts?.length ?? 0) > 0 && (
              <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10">
                {lowStockProducts?.length} items need attention
              </Badge>
            )}
          </div>
          
          <div className="overflow-x-auto">
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{item.productName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.categoryName || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={item.quantity === 0 ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                          {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Package size={32} className="mb-2 opacity-50" />
                <p>All stock levels are optimal</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
