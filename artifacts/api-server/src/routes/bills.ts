import { Router } from "express";
import { db } from "@workspace/db";
import { billsTable, billItemsTable, productsTable, salesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const bills = await db.select().from(billsTable).orderBy(desc(billsTable.createdAt));
    
    // Fetch items for each bill
    const billsWithItems = await Promise.all(bills.map(async (bill) => {
      const items = await db.select().from(billItemsTable).where(eq(billItemsTable.billId, bill.id));
      return { ...bill, items };
    }));

    res.json(billsWithItems);
  } catch (err) {
    req.log.error({ err }, "Get bills error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const { customerName, customerAddress, customerPhone, customerGst, items, notes } = req.body;

    if (!customerName || !items || !items.length) {
      return res.status(400).json({ error: "Customer name and items are required" });
    }

    const billNumber = `BILL-${Date.now()}`;
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalAmount = 0;

    const processedItems = items.map((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      const gstRate = parseFloat(item.gst) || 0;
      
      const lineSubtotal = qty * price;
      const lineDiscount = disc; // Discount is usually per line in this UI
      const taxableAmount = lineSubtotal - lineDiscount;
      const lineGst = (taxableAmount * gstRate) / 100;
      const lineTotal = taxableAmount + lineGst;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalGst += lineGst;
      totalAmount += lineTotal;

      return {
        productId: item.productId,
        productName: item.productName || "Product",
        quantity: qty.toString(),
        unitPrice: price.toString(),
        discount: disc.toString(),
        gst: gstRate.toString(),
        amount: lineTotal.toString(),
      };
    });

    // Create bill
    const [bill] = await db.insert(billsTable).values({
      billNumber,
      customerName,
      customerAddress,
      customerPhone,
      customerGst,
      subtotal: subtotal.toString(),
      totalDiscount: totalDiscount.toString(),
      totalGst: totalGst.toString(),
      totalAmount: totalAmount.toString(),
      notes,
    }).returning();

    // Create bill items & reduce stock & record sales
    for (const item of processedItems) {
      await db.insert(billItemsTable).values({
        billId: bill.id,
        ...item
      });

      // Reduce stock
      await db.update(productsTable)
        .set({
          quantity: sql`${productsTable.quantity} - ${item.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(productsTable.id, item.productId));

      // Record as a sale for analytics
      await db.insert(salesTable).values({
        productId: item.productId,
        quantitySold: item.quantity,
        sellingPrice: item.unitPrice,
        totalAmount: item.amount,
        paymentMethod: "cash", // Default for bills
        invoiceNumber: billNumber,
        date: new Date()
      });
    }

    res.status(201).json({ ...bill, items: processedItems });
  } catch (err) {
    req.log.error({ err }, "Create bill error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
