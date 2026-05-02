import { Router, type IRouter } from "express";
import { db, salesTable, productsTable } from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions: any[] = [];
    if (startDate) conditions.push(gte(salesTable.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(salesTable.createdAt, new Date(endDate as string)));

    const query = db
      .select({
        id: salesTable.id,
        productId: salesTable.productId,
        productName: productsTable.name,
        quantity: salesTable.quantity,
        unitPrice: salesTable.unitPrice,
        totalAmount: salesTable.totalAmount,
        discount: salesTable.discount,
        gst: salesTable.gst,
        customerName: salesTable.customerName,
        notes: salesTable.notes,
        createdAt: salesTable.createdAt,
      })
      .from(salesTable)
      .leftJoin(productsTable, eq(salesTable.productId, productsTable.id));

    const sales = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    res.json(sales);
  } catch (err) {
    req.log.error({ err }, "Get sales error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { productId, quantity, unitPrice, discount, gst, customerName, notes } = req.body;
    if (!productId || !quantity || unitPrice === undefined) {
      res.status(400).json({ error: "Bad Request", message: "productId, quantity, unitPrice required" });
      return;
    }

    const discountPct = parseFloat(discount || 0);
    const gstPct = parseFloat(gst || 0);
    const baseAmount = parseFloat(unitPrice) * parseInt(quantity);
    const discountAmount = baseAmount * discountPct / 100;
    const gstAmount = (baseAmount - discountAmount) * gstPct / 100;
    const totalAmount = baseAmount - discountAmount + gstAmount;

    const [sale] = await db.insert(salesTable).values({
      productId,
      quantity: parseInt(quantity),
      unitPrice: unitPrice.toString(),
      totalAmount: totalAmount.toFixed(2),
      discount: discountPct.toString(),
      gst: gstPct.toString(),
      customerName: customerName || null,
      notes: notes || null,
    }).returning();

    // Update product stock
    await db.execute(sql`UPDATE products SET quantity = quantity - ${parseInt(quantity)}, updated_at = NOW() WHERE id = ${productId}`);

    const products = await db.select({ name: productsTable.name }).from(productsTable).where(eq(productsTable.id, productId));
    res.status(201).json({ ...sale, productName: products[0]?.name });
  } catch (err) {
    req.log.error({ err }, "Create sale error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
