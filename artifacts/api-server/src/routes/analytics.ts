import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, suppliersTable, customersTable, billsTable, salesTable, purchasesTable } from "@workspace/db";
import { lte, sql, gte, and } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
    const [categoryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(categoriesTable);
    const [supplierCount] = await db.select({ count: sql<number>`count(*)::int` }).from(suppliersTable);

    const salesToday = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)` }).from(salesTable).where(gte(salesTable.createdAt, today));
    const salesMonth = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)` }).from(salesTable).where(gte(salesTable.createdAt, monthStart));
    const totalRevenue = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)` }).from(salesTable);
    const totalCustomers = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);
    const monthlyInvoices = await db.select({ count: sql<number>`count(*)::int` }).from(billsTable).where(gte(billsTable.createdAt, monthStart));

    const lowStock = await db.select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(sql`${productsTable.quantity} <= ${productsTable.minQuantity} AND ${productsTable.quantity} > 0`);

    const outOfStock = await db.select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(sql`${productsTable.quantity} = 0`);

    const invValue = await db.select({ total: sql<number>`coalesce(sum(price::numeric * quantity), 0)` }).from(productsTable);
    const recentSales = await db.select({ count: sql<number>`count(*)::int` }).from(salesTable).where(gte(salesTable.createdAt, today));

    res.json({
      totalProducts: productCount.count,
      totalCategories: categoryCount.count,
      totalSuppliers: supplierCount.count,
      totalCustomers: totalCustomers[0]?.count || 0,
      pendingInvoices: monthlyInvoices[0]?.count || 0,
      totalSalesToday: parseFloat(salesToday[0]?.total?.toString() || "0"),
      totalSalesMonth: parseFloat(salesMonth[0]?.total?.toString() || "0"),
      monthlyRevenue: parseFloat(salesMonth[0]?.total?.toString() || "0"),
      totalRevenue: parseFloat(totalRevenue[0]?.total?.toString() || "0"),
      lowStockCount: lowStock[0]?.count || 0,
      outOfStockCount: outOfStock[0]?.count || 0,
      totalInventoryValue: parseFloat(invValue[0]?.total?.toString() || "0"),
      recentSalesCount: recentSales[0]?.count || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/sales-trend", async (req, res) => {
  try {
    const period = (req.query.period as string) || "monthly";
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const groupFormat = period === "daily" ? "YYYY-MM-DD" : "YYYY-MM";

    const dateFilters = [] as any[];
    if (startDate && !Number.isNaN(startDate.getTime())) {
      dateFilters.push(sql`created_at >= ${startDate}`);
    }
    if (endDate && !Number.isNaN(endDate.getTime())) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilters.push(sql`created_at <= ${endOfDay}`);
    }

    const whereClause = dateFilters.length > 0 ? sql`WHERE ${sql.join(dateFilters, sql` AND `)}` : sql``;

    const salesData = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, ${groupFormat}) as date,
        COALESCE(SUM(total_amount::numeric), 0) as sales,
        COUNT(*)::int as count
      FROM sales
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT ${period === "daily" ? 30 : 12}
    `);

    const purchaseData = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, ${groupFormat}) as date,
        COALESCE(SUM(total_amount::numeric), 0) as purchases
      FROM purchases
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT ${period === "daily" ? 30 : 12}
    `);

    const purchaseMap: Record<string, number> = {};
    for (const r of purchaseData.rows as any[]) {
      purchaseMap[r.date] = parseFloat(r.purchases);
    }

    const result = (salesData.rows as any[]).map((r: any) => ({
      date: r.date,
      sales: parseFloat(r.sales),
      purchases: purchaseMap[r.date] || 0,
      count: r.count,
    })).reverse();

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Sales trend error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const results = await db.execute(sql`
      SELECT 
        s.product_id as "productId",
        p.name as "productName",
        c.name as "categoryName",
        SUM(s.quantity)::int as "totalQuantitySold",
        COALESCE(SUM(s.total_amount::numeric), 0) as "totalRevenue"
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY s.product_id, p.name, c.name
      ORDER BY "totalQuantitySold" DESC
      LIMIT ${limit}
    `);

    res.json((results.rows as any[]).map((r: any) => ({
      productId: r.productId,
      productName: r.productName,
      categoryName: r.categoryName,
      totalQuantitySold: r.totalQuantitySold,
      totalRevenue: parseFloat(r.totalRevenue),
    })));
  } catch (err) {
    req.log.error({ err }, "Top products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/low-stock", async (req, res) => {
  try {
    const results = await db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        quantity: productsTable.quantity,
        minQuantity: productsTable.minQuantity,
        categoryName: categoriesTable.name,
        supplierName: suppliersTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
      .where(sql`${productsTable.quantity} <= ${productsTable.minQuantity}`);

    res.json(results.map(r => ({
      ...r,
      status: r.quantity === 0 ? "out_of_stock" : "low",
    })));
  } catch (err) {
    req.log.error({ err }, "Low stock error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/category-breakdown", async (req, res) => {
  try {
    const results = await db.execute(sql`
      SELECT 
        c.id as "categoryId",
        c.name as "categoryName",
        COUNT(p.id)::int as "productCount",
        COALESCE(SUM(p.price::numeric * p.quantity), 0) as "totalValue",
        COALESCE(SUM(p.quantity), 0)::int as "totalQuantity"
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY "totalValue" DESC
    `);

    res.json((results.rows as any[]).map((r: any) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      productCount: r.productCount,
      totalValue: parseFloat(r.totalValue),
      totalQuantity: r.totalQuantity,
    })));
  } catch (err) {
    req.log.error({ err }, "Category breakdown error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
