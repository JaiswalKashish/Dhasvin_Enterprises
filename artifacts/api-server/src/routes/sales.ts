import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, productsTable } from "@workspace/db/schema";
import { eq, desc, sql, gte, lte, and } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { page = "1", limit = "20", startDate, endDate } = req.query as Record<string, string>;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (startDate) conditions.push(gte(salesTable.date, new Date(startDate)));
    if (endDate) conditions.push(lte(salesTable.date, new Date(endDate)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [sales, countResult] = await Promise.all([
      db
        .select({
          id: salesTable.id,
          productId: salesTable.productId,
          productName: productsTable.name,
          quantitySold: salesTable.quantitySold,
          sellingPrice: salesTable.sellingPrice,
          totalAmount: salesTable.totalAmount,
          date: salesTable.date,
          paymentMethod: salesTable.paymentMethod,
          invoiceNumber: salesTable.invoiceNumber,
          createdAt: salesTable.createdAt,
        })
        .from(salesTable)
        .leftJoin(productsTable, eq(salesTable.productId, productsTable.id))
        .where(whereClause)
        .orderBy(desc(salesTable.createdAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(salesTable)
        .where(whereClause),
    ]);

    res.json({
      sales: sales.map((s) => ({
        ...s,
        quantitySold: parseFloat(String(s.quantitySold)),
        sellingPrice: parseFloat(String(s.sellingPrice)),
        totalAmount: s.totalAmount ? parseFloat(String(s.totalAmount)) : null,
      })),
      total: Number(countResult[0]?.count || 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Get sales error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const { productId, quantitySold, sellingPrice, paymentMethod, date } = req.body;

    if (!productId || !quantitySold || !sellingPrice) {
      res.status(400).json({ error: "productId, quantitySold, and sellingPrice are required" });
      return;
    }

    // Check stock
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const currentQty = parseFloat(String(product.quantity || "0"));
    if (currentQty < parseFloat(String(quantitySold))) {
      res.status(400).json({ error: "Insufficient stock", available: currentQty });
      return;
    }

    const totalAmount = parseFloat(String(quantitySold)) * parseFloat(String(sellingPrice));
    const invoiceNumber = `INV-${Date.now()}`;

    const [sale] = await db
      .insert(salesTable)
      .values({
        productId,
        quantitySold: String(quantitySold),
        sellingPrice: String(sellingPrice),
        totalAmount: String(totalAmount),
        date: date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || "cash",
        invoiceNumber,
      })
      .returning();

    // Reduce stock
    await db
      .update(productsTable)
      .set({
        quantity: sql`${productsTable.quantity} - ${quantitySold}`,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, productId));

    res.status(201).json({
      ...sale,
      quantitySold: parseFloat(String(sale.quantitySold)),
      sellingPrice: parseFloat(String(sale.sellingPrice)),
      totalAmount: parseFloat(String(sale.totalAmount)),
    });
  } catch (err) {
    req.log.error({ err }, "Create sale error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
