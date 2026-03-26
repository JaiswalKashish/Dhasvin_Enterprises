import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  suppliersTable,
} from "@workspace/db/schema";
import { eq, like, and, sql, or, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function mapProduct(p: any, catMap: Map<number, string>, supMap: Map<number, string>) {
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.categoryId ? catMap.get(p.categoryId) || null : null,
    hsnCode: p.hsnCode,
    barcode: p.barcode,
    type: p.type,
    unitPrice: p.unitPrice ? parseFloat(p.unitPrice) : 0,
    priceWithTax: p.priceWithTax ? parseFloat(p.priceWithTax) : 0,
    tax: p.tax ? parseFloat(p.tax) : 0,
    quantity: p.quantity ? parseFloat(p.quantity) : 0,
    units: p.units,
    discount: p.discount ? parseFloat(p.discount) : 0,
    discountAmount: p.discountAmount ? parseFloat(p.discountAmount) : 0,
    purchaseUnitPrice: p.purchaseUnitPrice ? parseFloat(p.purchaseUnitPrice) : 0,
    purchasePriceWithTax: p.purchasePriceWithTax ? parseFloat(p.purchasePriceWithTax) : 0,
    description: p.description,
    showOnline: p.showOnline,
    notForSale: p.notForSale,
    reorderLevel: p.reorderLevel ? parseFloat(p.reorderLevel) : 10,
    supplierId: p.supplierId,
    supplierName: p.supplierId ? supMap.get(p.supplierId) || null : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function getCategoryMap(): Promise<Map<number, string>> {
  const cats = await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable);
  return new Map(cats.map((c) => [c.id, c.name]));
}

async function getSupplierMap(): Promise<Map<number, string>> {
  const sups = await db.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable);
  return new Map(sups.map((s) => [s.id, s.name]));
}

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { search, category, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.hsnCode, `%${search}%`),
          like(productsTable.barcode, `%${search}%`)
        )
      );
    }

    if (category) {
      const catId = parseInt(category);
      if (!isNaN(catId)) {
        conditions.push(eq(productsTable.categoryId, catId));
      }
    }

    if (status === "low_stock") {
      conditions.push(
        sql`${productsTable.quantity} > 0 AND ${productsTable.quantity} <= ${productsTable.reorderLevel}`
      );
    } else if (status === "out_of_stock") {
      conditions.push(sql`${productsTable.quantity} <= 0`);
    } else if (status === "in_stock") {
      conditions.push(sql`${productsTable.quantity} > ${productsTable.reorderLevel}`);
    } else if (status === "not_for_sale") {
      conditions.push(eq(productsTable.notForSale, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, countResult] = await Promise.all([
      db
        .select()
        .from(productsTable)
        .where(whereClause)
        .orderBy(desc(productsTable.updatedAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);

    res.json({
      products: products.map((p) => mapProduct(p, catMap, supMap)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error({ err }, "Get products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
    res.json(mapProduct(product, catMap, supMap));
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/",
  authenticate,
  requireRole("admin", "staff"),
  async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const [product] = await db
        .insert(productsTable)
        .values({
          name: data.name,
          categoryId: data.categoryId || null,
          hsnCode: data.hsnCode || null,
          barcode: data.barcode || null,
          type: data.type || "Product",
          unitPrice: data.unitPrice?.toString() || "0",
          priceWithTax: data.priceWithTax?.toString() || "0",
          tax: data.tax?.toString() || "0",
          quantity: data.quantity?.toString() || "0",
          units: data.units || "NOS",
          discount: data.discount?.toString() || "0",
          discountAmount: data.discountAmount?.toString() || "0",
          purchaseUnitPrice: data.purchaseUnitPrice?.toString() || "0",
          purchasePriceWithTax: data.purchasePriceWithTax?.toString() || "0",
          description: data.description || null,
          showOnline: data.showOnline ?? true,
          notForSale: data.notForSale ?? false,
          reorderLevel: data.reorderLevel?.toString() || "10",
          supplierId: data.supplierId || null,
        })
        .returning();

      const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
      res.status(201).json(mapProduct(product, catMap, supMap));
    } catch (err) {
      req.log.error({ err }, "Create product error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.put(
  "/:id",
  authenticate,
  requireRole("admin", "staff"),
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const [product] = await db
        .update(productsTable)
        .set({
          name: data.name,
          categoryId: data.categoryId || null,
          hsnCode: data.hsnCode || null,
          barcode: data.barcode || null,
          type: data.type || "Product",
          unitPrice: data.unitPrice?.toString() || "0",
          priceWithTax: data.priceWithTax?.toString() || "0",
          tax: data.tax?.toString() || "0",
          quantity: data.quantity?.toString() || "0",
          units: data.units || "NOS",
          discount: data.discount?.toString() || "0",
          discountAmount: data.discountAmount?.toString() || "0",
          purchaseUnitPrice: data.purchaseUnitPrice?.toString() || "0",
          purchasePriceWithTax: data.purchasePriceWithTax?.toString() || "0",
          description: data.description || null,
          showOnline: data.showOnline ?? true,
          notForSale: data.notForSale ?? false,
          reorderLevel: data.reorderLevel?.toString() || "10",
          supplierId: data.supplierId || null,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, id))
        .returning();

      if (!product) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
      res.json(mapProduct(product, catMap, supMap));
    } catch (err) {
      req.log.error({ err }, "Update product error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(productsTable).where(eq(productsTable.id, id));
      res.json({ success: true, message: "Product deleted" });
    } catch (err) {
      req.log.error({ err }, "Delete product error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post(
  "/import",
  authenticate,
  requireRole("admin", "staff"),
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];

      // Ensure default category exists
      let defaultCatId: number | null = null;
      const [existingDefault] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, "General"))
        .limit(1);
      if (existingDefault) {
        defaultCatId = existingDefault.id;
      } else {
        const [newCat] = await db
          .insert(categoriesTable)
          .values({ name: "General", description: "General category" })
          .returning();
        defaultCatId = newCat.id;
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const name =
          row["Product"] ||
          row["product"] ||
          row["Name"] ||
          row["name"];
        if (!name) {
          skipped++;
          continue;
        }

        try {
          // Get or create category
          let categoryId = defaultCatId;
          const catName = row["Category"] || row["category"];
          if (catName) {
            const [existingCat] = await db
              .select()
              .from(categoriesTable)
              .where(eq(categoriesTable.name, String(catName)))
              .limit(1);
            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const [newCat] = await db
                .insert(categoriesTable)
                .values({ name: String(catName) })
                .returning();
              categoryId = newCat.id;
            }
          }

          const productData = {
            categoryId,
            hsnCode: row["HSN/SAC Code"] ? String(row["HSN/SAC Code"]) : null,
            barcode: row["Barcode"] ? String(row["Barcode"]) : null,
            type: row["Type"] ? String(row["Type"]) : "Product",
            unitPrice: row["Unit Price"] != null ? String(row["Unit Price"]) : "0",
            priceWithTax: row["Price with Tax"] != null ? String(row["Price with Tax"]) : "0",
            tax: row["Tax"] != null ? String(row["Tax"]) : "0",
            quantity: row["Qty"] != null ? String(Math.max(0, Number(row["Qty"]) || 0)) : "0",
            units: row["Units"] ? String(row["Units"]) : "NOS",
            discount: row["Discount"] != null ? String(row["Discount"]) : "0",
            discountAmount: row["Discount Amount"] != null ? String(row["Discount Amount"]) : "0",
            purchaseUnitPrice: row["Purchase Unit Price"] != null ? String(row["Purchase Unit Price"]) : "0",
            purchasePriceWithTax: row["Purchase Price With Tax"] != null ? String(row["Purchase Price With Tax"]) : "0",
            description: row["Description"] ? String(row["Description"]) : null,
            showOnline: row["Show Online"] != null ? Boolean(row["Show Online"]) : true,
            notForSale: row["Not For Sale"] != null ? Boolean(row["Not For Sale"]) : false,
            updatedAt: new Date(),
          };

          // Check if product exists
          const [existing] = await db
            .select()
            .from(productsTable)
            .where(eq(productsTable.name, String(name)))
            .limit(1);

          if (existing) {
            await db
              .update(productsTable)
              .set({
                ...productData,
                quantity: String(
                  parseFloat(String(existing.quantity || "0")) +
                    parseFloat(productData.quantity)
                ),
              })
              .where(eq(productsTable.id, existing.id));
            updated++;
          } else {
            await db.insert(productsTable).values({
              name: String(name),
              ...productData,
            });
            imported++;
          }
        } catch (rowErr) {
          errors.push(`Row with product "${name}": ${String(rowErr)}`);
        }
      }

      res.json({ imported, updated, skipped, errors: errors.slice(0, 10) });
    } catch (err) {
      req.log.error({ err }, "Import products error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
