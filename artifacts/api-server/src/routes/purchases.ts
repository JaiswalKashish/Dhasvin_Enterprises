import { Router } from "express";
import { db } from "@workspace/db";
import { purchasesTable, productsTable, suppliersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const [purchases, countResult] = await Promise.all([
      db
        .select({
          id: purchasesTable.id,
          supplierId: purchasesTable.supplierId,
          supplierName: suppliersTable.name,
          productId: purchasesTable.productId,
          productName: productsTable.name,
          quantityPurchased: purchasesTable.quantityPurchased,
          purchaseCost: purchasesTable.purchaseCost,
          totalCost: purchasesTable.totalCost,
          date: purchasesTable.date,
          billNumber: purchasesTable.billNumber,
          importSource: purchasesTable.importSource,
          status: purchasesTable.status,
          createdAt: purchasesTable.createdAt,
        })
        .from(purchasesTable)
        .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
        .leftJoin(productsTable, eq(purchasesTable.productId, productsTable.id))
        .orderBy(desc(purchasesTable.createdAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(purchasesTable),
    ]);

    res.json({
      purchases: purchases.map((p) => ({
        ...p,
        quantityPurchased: parseFloat(String(p.quantityPurchased)),
        purchaseCost: parseFloat(String(p.purchaseCost)),
        totalCost: p.totalCost ? parseFloat(String(p.totalCost)) : null,
      })),
      total: Number(countResult[0]?.count || 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Get purchases error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const { supplierId, productId, quantityPurchased, purchaseCost, date, billNumber, status } = req.body;

    if (!productId || !quantityPurchased || !purchaseCost) {
      res.status(400).json({ error: "productId, quantityPurchased, and purchaseCost are required" });
      return;
    }

    const totalCost = parseFloat(quantityPurchased) * parseFloat(purchaseCost);

    const [purchase] = await db
      .insert(purchasesTable)
      .values({
        supplierId: supplierId || null,
        productId,
        quantityPurchased: String(quantityPurchased),
        purchaseCost: String(purchaseCost),
        totalCost: String(totalCost),
        date: date ? new Date(date) : new Date(),
        billNumber: billNumber || null,
        status: status || "received",
      })
      .returning();

    // Update product stock
    if (status !== "cancelled") {
      await db
        .update(productsTable)
        .set({
          quantity: sql`${productsTable.quantity} + ${quantityPurchased}`,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, productId));
    }

    res.status(201).json({
      ...purchase,
      quantityPurchased: parseFloat(String(purchase.quantityPurchased)),
      purchaseCost: parseFloat(String(purchase.purchaseCost)),
      totalCost: purchase.totalCost ? parseFloat(String(purchase.totalCost)) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Create purchase error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
