import { Router, type IRouter } from "express";
import { db, purchasesTable, productsTable, suppliersTable } from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const { supplierId, startDate, endDate } = req.query;
    const conditions: any[] = [];
    if (supplierId) conditions.push(eq(purchasesTable.supplierId, parseInt(supplierId as string)));
    if (startDate) conditions.push(gte(purchasesTable.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(purchasesTable.createdAt, new Date(endDate as string)));

    const query = db
      .select({
        id: purchasesTable.id,
        productId: purchasesTable.productId,
        productName: productsTable.name,
        supplierId: purchasesTable.supplierId,
        supplierName: suppliersTable.name,
        quantity: purchasesTable.quantity,
        unitPrice: purchasesTable.unitPrice,
        totalAmount: purchasesTable.totalAmount,
        notes: purchasesTable.notes,
        createdAt: purchasesTable.createdAt,
      })
      .from(purchasesTable)
      .leftJoin(productsTable, eq(purchasesTable.productId, productsTable.id))
      .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id));

    const purchases = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    res.json(purchases);
  } catch (err) {
    req.log.error({ err }, "Get purchases error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { productId, supplierId, quantity, unitPrice, notes } = req.body;
    if (!productId || !quantity || unitPrice === undefined) {
      res.status(400).json({ error: "Bad Request", message: "productId, quantity, unitPrice required" });
      return;
    }

    const totalAmount = parseFloat(unitPrice) * parseInt(quantity);

    const [purchase] = await db.insert(purchasesTable).values({
      productId,
      supplierId: supplierId || null,
      quantity: parseInt(quantity),
      unitPrice: unitPrice.toString(),
      totalAmount: totalAmount.toFixed(2),
      notes: notes || null,
    }).returning();

    // Update product stock
    await db.execute(sql`UPDATE products SET quantity = quantity + ${parseInt(quantity)}, updated_at = NOW() WHERE id = ${productId}`);

    const products = await db.select({ name: productsTable.name }).from(productsTable).where(eq(productsTable.id, productId));
    const suppliers = supplierId ? await db.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, supplierId)) : [];

    res.status(201).json({ ...purchase, productName: products[0]?.name, supplierName: suppliers[0]?.name });
  } catch (err) {
    req.log.error({ err }, "Create purchase error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
