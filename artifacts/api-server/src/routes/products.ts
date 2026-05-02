import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, suppliersTable } from "@workspace/db";
import { eq, ilike, and, lte, asc, desc, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const { search, category, lowStock, sortBy, sortOrder } = req.query;

    let query = db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        supplierId: productsTable.supplierId,
        supplierName: suppliersTable.name,
        price: productsTable.price,
        quantity: productsTable.quantity,
        minQuantity: productsTable.minQuantity,
        hsnCode: productsTable.hsnCode,
        gst: productsTable.gst,
        description: productsTable.description,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id));

    const conditions = [];
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (category) conditions.push(eq(categoriesTable.name, category as string));
    if (lowStock === "true") conditions.push(lte(productsTable.quantity, productsTable.minQuantity));

    const products = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query);

    // Sorting
    const validSortFields: Record<string, any> = {
      name: productsTable.name,
      price: productsTable.price,
      quantity: productsTable.quantity,
      createdAt: productsTable.createdAt,
    };
    const sortField = validSortFields[sortBy as string] || productsTable.createdAt;
    const sorted = sortOrder === "asc" ? products.sort((a: any, b: any) => {
      const av = a[sortBy as string] ?? "";
      const bv = b[sortBy as string] ?? "";
      return av > bv ? 1 : av < bv ? -1 : 0;
    }) : products.sort((a: any, b: any) => {
      const av = a[sortBy as string] ?? "";
      const bv = b[sortBy as string] ?? "";
      return av < bv ? 1 : av > bv ? -1 : 0;
    });

    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Get products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        supplierId: productsTable.supplierId,
        supplierName: suppliersTable.name,
        price: productsTable.price,
        quantity: productsTable.quantity,
        minQuantity: productsTable.minQuantity,
        hsnCode: productsTable.hsnCode,
        gst: productsTable.gst,
        description: productsTable.description,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
      .where(eq(productsTable.id, id));

    if (!products[0]) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(products[0]);
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { name, categoryId, price, quantity, minQuantity, supplierId, hsnCode, gst, description } = req.body;
    if (!name || price === undefined || quantity === undefined) {
      res.status(400).json({ error: "Bad Request", message: "Name, price, and quantity are required" });
      return;
    }

    const [product] = await db.insert(productsTable).values({
      name,
      categoryId: categoryId || null,
      price: price.toString(),
      quantity,
      minQuantity: minQuantity || 5,
      supplierId: supplierId || null,
      hsnCode: hsnCode || null,
      gst: gst?.toString() || "18",
      description: description || null,
    }).returning();

    res.status(201).json(product);
  } catch (err) {
    req.log.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireRole("admin", "staff"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, categoryId, price, quantity, minQuantity, supplierId, hsnCode, gst, description } = req.body;

    const [product] = await db.update(productsTable).set({
      name,
      categoryId: categoryId || null,
      price: price?.toString(),
      quantity,
      minQuantity: minQuantity || 5,
      supplierId: supplierId || null,
      hsnCode: hsnCode || null,
      gst: gst?.toString(),
      description: description || null,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    if (!product) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(product);
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
