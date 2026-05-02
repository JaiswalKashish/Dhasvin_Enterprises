import { Router, type IRouter } from "express";
import { db, billsTable, productsTable, salesTable, companySettingsTable } from "@workspace/db";
import { eq, or, sql, ilike } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { amountInWords } from "../utils/numberToWords.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    let query: any = db.select().from(billsTable).orderBy(sql`${billsTable.createdAt} DESC`);

    if (search) {
      query = query.where(
        or(
          ilike(billsTable.billNumber, `%${search}%`),
          ilike(billsTable.customerName, `%${search}%`),
        ),
      );
    }

    const bills = await query;
    res.json(bills);
  } catch (err) {
    req.log.error({ err }, "Get bills error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bills = await db.select().from(billsTable).where(eq(billsTable.id, id));
    if (!bills[0]) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(bills[0]);
  } catch (err) {
    req.log.error({ err }, "Get bill error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const {
      customerName,
      customerAddress,
      customerPhone,
      customerGst,
      items,
      notes,
    } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "customerName and items are required" });
      return;
    }

    const settings = await db.select().from(companySettingsTable).limit(1);
    const companySettings = settings[0] || {
      name: "Your Company Name",
      gstin: null,
      pan: null,
      address: null,
      phoneNumber: null,
      email: null,
      bankName: null,
      accountNumber: null,
      ifsc: null,
      upiId: null,
      qrCodePath: null,
      logoPath: null,
    };

    const companySnapshot = {
      ...companySettings,
      logoPath: companySettings.logoPath ? `/uploads/company/${companySettings.logoPath}` : null,
      qrCodePath: companySettings.qrCodePath ? `/uploads/company/${companySettings.qrCodePath}` : null,
    };

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    type BillItemData = {
      productId: number | null;
      productName: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      gst: number;
      amount: number;
    };
    const billItems: BillItemData[] = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discountPct = Number(item.discount || 0) || 0;
      const gstPct = Number(item.gst || 0) || 0;
      const productId = item.productId ? Number(item.productId) : null;

      if (qty <= 0 || unitPrice <= 0) {
        continue;
      }

      let product = null;
      if (productId) {
        const products = await db.select().from(productsTable).where(eq(productsTable.id, productId));
        product = products[0];
      }

      const productName = item.productName || product?.name || "Item";
      const lineTotal = qty * unitPrice;
      const discountAmount = lineTotal * discountPct / 100;
      const gstAmount = (lineTotal - discountAmount) * gstPct / 100;
      const amount = lineTotal - discountAmount + gstAmount;

      subtotal += lineTotal;
      totalDiscount += discountAmount;
      totalGst += gstAmount;

      const billItem = {
        productId,
        productName,
        hsnCode: item.hsnCode || product?.hsnCode || "",
        quantity: qty,
        unitPrice,
        discount: discountPct,
        gst: gstPct,
        amount,
      };

      billItems.push(billItem);

      if (product) {
        await db.execute(
          sql`UPDATE products SET quantity = quantity - ${qty}, updated_at = NOW() WHERE id = ${productId}`,
        );
      }
    }

    if (billItems.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "At least one valid item is required" });
      return;
    }

    const totalAmount = subtotal - totalDiscount + totalGst;

    const [inserted] = await db.insert(billsTable).values({
      billNumber: "PENDING",
      customerName,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerGst: customerGst || null,
      items: billItems,
      companySnapshot,
      subtotal: subtotal.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalGst: totalGst.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      amountInWords: amountInWords(totalAmount),
      notes: notes || null,
    }).returning();

    const billNumber = `INV-${String(inserted.id).padStart(5, "0")}`;
    const [updated] = await db.update(billsTable)
      .set({ billNumber })
      .where(eq(billsTable.id, inserted.id))
      .returning();

    for (const item of billItems) {
      if (item.productId) {
        await db.insert(salesTable).values({
          productId: item.productId,
          quantity: item.quantity as number,
          unitPrice: item.unitPrice.toFixed(2),
          totalAmount: item.amount.toFixed(2),
          discount: (item.discount as number).toFixed(2),
          gst: (item.gst as number).toFixed(2),
          customerName: customerName || null,
          notes: `Invoice: ${billNumber}`,
        });
      }
    }

    res.status(201).json(updated);
  } catch (err) {
    req.log.error({ err }, "Create bill error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
