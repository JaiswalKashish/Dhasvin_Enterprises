import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  salesTable,
  purchasesTable,
  categoriesTable,
} from "@workspace/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", authenticate, async (req: AuthRequest, res) => {
  try {
    const [
      productStats,
      salesStats,
      lowStock,
      outOfStock,
      deadStock,
      catCount,
      supCount,
      topSale,
      topCat,
    ] = await Promise.all([
      db.select({
        total: sql<number>`count(*)`,
        inventoryValue: sql<number>`sum(CAST(${productsTable.quantity} AS numeric) * CAST(${productsTable.unitPrice} AS numeric))`,
        availableStock: sql<number>`sum(CAST(${productsTable.quantity} AS numeric))`,
      }).from(productsTable),

      db.select({
        totalSales: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(CAST(${salesTable.totalAmount} AS numeric))`,
      }).from(salesTable),

      db.select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(sql`CAST(${productsTable.quantity} AS numeric) > 0 AND CAST(${productsTable.quantity} AS numeric) <= CAST(${productsTable.reorderLevel} AS numeric)`),

      db.select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(sql`CAST(${productsTable.quantity} AS numeric) <= 0`),

      db.select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(sql`CAST(${productsTable.quantity} AS numeric) > CAST(${productsTable.reorderLevel} AS numeric) * 5`),

      db.select({ count: sql<number>`count(*)` }).from(categoriesTable),

      db.select({ count: sql<number>`count(*)` }).from(
        db.selectDistinct({ id: productsTable.supplierId }).from(productsTable).where(sql`${productsTable.supplierId} IS NOT NULL`).as("sups")
      ),

      db.select({
        productId: salesTable.productId,
        productName: productsTable.name,
        total: sql<number>`sum(CAST(${salesTable.quantitySold} AS numeric))`,
      })
        .from(salesTable)
        .leftJoin(productsTable, eq(salesTable.productId, productsTable.id))
        .groupBy(salesTable.productId, productsTable.name)
        .orderBy(desc(sql`sum(CAST(${salesTable.quantitySold} AS numeric))`))
        .limit(1),

      db.select({
        name: categoriesTable.name,
        count: sql<number>`count(${productsTable.id})`,
      })
        .from(categoriesTable)
        .leftJoin(productsTable, eq(categoriesTable.id, productsTable.categoryId))
        .groupBy(categoriesTable.id, categoriesTable.name)
        .orderBy(desc(sql`count(${productsTable.id})`))
        .limit(1),
    ]);

    res.json({
      totalProducts: Number(productStats[0]?.total || 0),
      totalSales: Number(salesStats[0]?.totalSales || 0),
      totalRevenue: parseFloat(String(salesStats[0]?.totalRevenue || "0")),
      lowStockCount: Number(lowStock[0]?.count || 0),
      outOfStockCount: Number(outOfStock[0]?.count || 0),
      inventoryValue: parseFloat(String(productStats[0]?.inventoryValue || "0")),
      totalCategories: Number(catCount[0]?.count || 0),
      totalSuppliers: Number(supCount[0]?.count || 0),
      availableStock: parseFloat(String(productStats[0]?.availableStock || "0")),
      deadStockCount: Number(deadStock[0]?.count || 0),
      fastMovingProduct: topSale[0]?.productName || null,
      topCategory: topCat[0]?.name || null,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/sales-trend", authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = "monthly" } = req.query as { period?: string };

    let dateFormat = "YYYY-MM";
    let interval = "30 days";
    if (period === "daily") {
      dateFormat = "YYYY-MM-DD";
      interval = "30 days";
    } else if (period === "weekly") {
      dateFormat = "YYYY-IW";
      interval = "12 weeks";
    }

    const salesTrend = await db.execute(sql`
      SELECT 
        TO_CHAR(date, ${period === "daily" ? "YYYY-MM-DD" : period === "weekly" ? "IYYY-IW" : "YYYY-MM"}) as date,
        SUM(CAST(quantity_sold AS numeric)) as sales,
        SUM(CAST(total_amount AS numeric)) as revenue
      FROM sales
      WHERE date >= NOW() - INTERVAL ${interval}
      GROUP BY 1
      ORDER BY 1
    `);

    const purchaseTrend = await db.execute(sql`
      SELECT 
        TO_CHAR(date, ${period === "daily" ? "YYYY-MM-DD" : period === "weekly" ? "IYYY-IW" : "YYYY-MM"}) as date,
        SUM(CAST(total_cost AS numeric)) as purchases
      FROM purchases
      WHERE date >= NOW() - INTERVAL ${interval}
      GROUP BY 1
      ORDER BY 1
    `);

    const purchaseMap = new Map(
      (purchaseTrend.rows as any[]).map((r: any) => [r.date, parseFloat(String(r.purchases || "0"))])
    );

    const result = (salesTrend.rows as any[]).map((r: any) => ({
      date: String(r.date),
      sales: parseFloat(String(r.sales || "0")),
      revenue: parseFloat(String(r.revenue || "0")),
      purchases: purchaseMap.get(String(r.date)) || 0,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Sales trend error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/top-products", authenticate, async (req: AuthRequest, res) => {
  try {
    const topProducts = await db
      .select({
        productId: salesTable.productId,
        productName: productsTable.name,
        totalSold: sql<number>`sum(CAST(${salesTable.quantitySold} AS numeric))`,
        totalRevenue: sql<number>`sum(CAST(${salesTable.totalAmount} AS numeric))`,
      })
      .from(salesTable)
      .leftJoin(productsTable, eq(salesTable.productId, productsTable.id))
      .groupBy(salesTable.productId, productsTable.name)
      .orderBy(desc(sql`sum(CAST(${salesTable.quantitySold} AS numeric))`))
      .limit(10);

    res.json(
      topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName || "Unknown",
        totalSold: parseFloat(String(p.totalSold || "0")),
        totalRevenue: parseFloat(String(p.totalRevenue || "0")),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Top products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/category-distribution", authenticate, async (req: AuthRequest, res) => {
  try {
    const distribution = await db
      .select({
        categoryId: categoriesTable.id,
        categoryName: categoriesTable.name,
        productCount: sql<number>`count(${productsTable.id})`,
        value: sql<number>`sum(CAST(${productsTable.quantity} AS numeric) * CAST(${productsTable.unitPrice} AS numeric))`,
      })
      .from(categoriesTable)
      .leftJoin(productsTable, eq(categoriesTable.id, productsTable.categoryId))
      .groupBy(categoriesTable.id, categoriesTable.name)
      .orderBy(desc(sql`count(${productsTable.id})`))
      .limit(10);

    res.json(
      distribution.map((d) => ({
        categoryId: d.categoryId,
        categoryName: d.categoryName,
        productCount: Number(d.productCount || 0),
        value: parseFloat(String(d.value || "0")),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Category distribution error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/low-stock", authenticate, async (req: AuthRequest, res) => {
  try {
    const lowStockProducts = await db
      .select()
      .from(productsTable)
      .where(sql`CAST(${productsTable.quantity} AS numeric) <= CAST(${productsTable.reorderLevel} AS numeric) AND CAST(${productsTable.quantity} AS numeric) >= 0`)
      .orderBy(productsTable.quantity)
      .limit(20);

    res.json(
      lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: parseFloat(String(p.quantity || "0")),
        reorderLevel: parseFloat(String(p.reorderLevel || "10")),
        units: p.units,
        unitPrice: parseFloat(String(p.unitPrice || "0")),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Low stock error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
