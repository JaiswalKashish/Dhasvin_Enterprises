import { Router, type IRouter } from "express";
import { db, suppliersTable, productsTable, purchasesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const suppliers = await db.select().from(suppliersTable);
    res.json(suppliers);
  } catch (err) {
    req.log.error({ err }, "Get suppliers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const suppliers = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
    const supplier = suppliers[0];
    if (!supplier) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        price: productsTable.price,
        quantity: productsTable.quantity,
        hsnCode: productsTable.hsnCode,
        gst: productsTable.gst,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.supplierId, id));

    const purchases = await db
      .select({
        id: purchasesTable.id,
        productId: purchasesTable.productId,
        productName: productsTable.name,
        quantity: purchasesTable.quantity,
        unitPrice: purchasesTable.unitPrice,
        totalAmount: purchasesTable.totalAmount,
        notes: purchasesTable.notes,
        createdAt: purchasesTable.createdAt,
      })
      .from(purchasesTable)
      .leftJoin(productsTable, eq(purchasesTable.productId, productsTable.id))
      .where(eq(purchasesTable.supplierId, id));

    res.json({ ...supplier, products, purchaseHistory: purchases });
  } catch (err) {
    req.log.error({ err }, "Get supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { name, gst, address, phone, email } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Name is required" });
      return;
    }
    const [supplier] = await db.insert(suppliersTable).values({ name, gst, address, phone, email }).returning();
    res.status(201).json(supplier);
  } catch (err) {
    req.log.error({ err }, "Create supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireRole("admin", "staff"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, gst, address, phone, email } = req.body;
    const [supplier] = await db.update(suppliersTable).set({ name, gst, address, phone, email }).where(eq(suppliersTable.id, id)).returning();
    if (!supplier) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(supplier);
  } catch (err) {
    req.log.error({ err }, "Update supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.json({ success: true, message: "Supplier deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
